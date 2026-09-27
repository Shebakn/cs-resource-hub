/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';

import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Context } from 'telegraf';

@Injectable()
export class TelegramCallbackGuard implements CanActivate {
  private readonly logger = new Logger(TelegramCallbackGuard.name);

  /**
   * Telegram Admin ID
   */
  private readonly ADMIN_TELEGRAM_ID = 8521015752;

  /**
   * آخر طلب لكل مستخدم
   *
   * userId -> timestamp
   */
  private readonly lastRequest = new Map<number, number>();

  /**
   * يسمح بطلب واحد كل ثانية
   */
  private readonly RATE_LIMIT_MS = 1000;

  /**
   * قائمة انتظار اللوقات في الذاكرة
   *
   * لا يتم حفظها في قاعدة البيانات.
   */
  private readonly logStack: string[] = [];

  /**
   * هل يوجد Worker يعالج الـ Stack حالياً؟
   */
  private isProcessingStack = false;

  /**
   * عدد اللوقات المطلوبة قبل إرسال رسالة واحدة
   */
  private readonly BATCH_SIZE = 20;

  /**
   * أقصى عدد Logs يمكن الاحتفاظ بها في الذاكرة.
   *
   * إذا وصلنا للحد، نحذف أقدم Log.
   */
  private readonly MAX_STACK_SIZE = 1000;

  constructor(
    @InjectBot()
    private readonly bot: Telegraf<Context>,
  ) {}

  // ============================================================
  // Guard
  // ============================================================

  canActivate(context: ExecutionContext): boolean {
    const ctx = context.getArgs()[0] as Context;

    const callbackQuery = ctx.callbackQuery;

    // ليس Callback Query
    if (
      !callbackQuery ||
      !('data' in callbackQuery) ||
      typeof callbackQuery.data !== 'string'
    ) {
      return true;
    }

    const user = callbackQuery.from;

    const userId = user.id;

    const username = user.username ? `@${user.username}` : '@unknown';

    const name = this.getUserName(user);

    const path = callbackQuery.data;

    const now = Date.now();

    const isoTime = new Date(now).toISOString();

    // ============================================================
    // Handler
    // ============================================================

    const handlerName = context.getClass()?.name ?? 'TelegramHandler';

    // ============================================================
    // Log
    // ============================================================

    const logLine =
      `user=${username} ` +
      `id=${userId} ` +
      `name="${name}" ` +
      `path=${path} ` +
      `time=${isoTime}`;

    // Log في NestJS
    this.logger.log(logLine, handlerName);

    // إضافة اللوق إلى Stack
    this.addToLogStack(logLine);

    // ============================================================
    // Rate Limit
    // ============================================================

    const lastRequest = this.lastRequest.get(userId);

    if (lastRequest !== undefined && now - lastRequest < this.RATE_LIMIT_MS) {
      void this.showRateLimitMessage(ctx);

      return false;
    }

    this.lastRequest.set(userId, now);

    return true;
  }

  // ============================================================
  // Log Stack
  // ============================================================

  private addToLogStack(logLine: string): void {
    /**
     * حماية الذاكرة
     *
     * إذا وصلنا للحد الأقصى نحذف أقدم Log.
     */
    if (this.logStack.length >= this.MAX_STACK_SIZE) {
      this.logStack.shift();
    }

    /**
     * إضافة Log
     */
    this.logStack.push(logLine);

    /**
     * لا نرسل إلا عندما يصبح لدينا
     * Batch كامل.
     */
    if (this.logStack.length >= this.BATCH_SIZE) {
      void this.processLogStack();
    }
  }

  // ============================================================
  // Batch Processing
  // ============================================================

  private async processLogStack(): Promise<void> {
    /**
     * منع تشغيل أكثر من Worker في نفس الوقت.
     */
    if (this.isProcessingStack) {
      return;
    }

    /**
     * لا يوجد Batch كامل.
     */
    if (this.logStack.length < this.BATCH_SIZE) {
      return;
    }

    this.isProcessingStack = true;

    try {
      /**
       * نستمر طالما يوجد Batch كامل.
       *
       * مثال:
       *
       * 60 Logs
       * ↓
       * 20
       * 20
       * 20
       */
      while (this.logStack.length >= this.BATCH_SIZE) {
        /**
         * أخذ أول 20 Log
         */
        const batch = this.logStack.splice(0, this.BATCH_SIZE);

        /**
         * دمج اللوقات في رسالة واحدة
         */
        const message =
          `📲 Telegram Callbacks (${batch.length}):\n\n` + batch.join('\n\n');

        try {
          /**
           * إرسال Batch كامل في رسالة واحدة.
           */
          await this.bot.telegram.sendMessage(this.ADMIN_TELEGRAM_ID, message);
        } catch (error) {
          this.logger.error(
            `Failed to send log batch to Telegram admin: ${String(error)}`,
          );
        }
      }
    } finally {
      this.isProcessingStack = false;

      /**
       * إذا وصلت Logs جديدة أثناء عملية الإرسال
       * وأصبح لدينا Batch كامل، نبدأ Worker جديد.
       */
      if (this.logStack.length >= this.BATCH_SIZE) {
        void this.processLogStack();
      }
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  private getUserName(user: {
    first_name: string;
    last_name?: string;
  }): string {
    return [user.first_name, user.last_name]
      .filter(Boolean)
      .join(' ')
      .replace(/\r/g, '')
      .replace(/\n/g, ' ');
  }

  private async showRateLimitMessage(ctx: Context): Promise<void> {
    try {
      await ctx.answerCbQuery('⏳ يرجى ارسال طلب واحد كل ثانية', {
        show_alert: false,
      });
    } catch (error) {
      this.logger.debug(`Failed to answer callback: ${String(error)}`);
    }
  }
}
