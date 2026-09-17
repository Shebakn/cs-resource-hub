import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';

import { Context } from 'telegraf';

@Injectable()
export class TelegramCallbackGuard implements CanActivate {
  private readonly logger = new Logger();

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

    // ============================================================
    // Log
    // ============================================================

    const handlerName = context.getClass()?.name ?? 'TelegramHandler';

    this.logger.log(
      `user=${username} name="${name}" path=${path} time=${new Date(now).toISOString()}`,
      handlerName,
    );

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
      // show_alert: false تجعل التنبيه يظهر كشريط علوي مؤقت ومريح للمستخدم
      await ctx.answerCbQuery('⏳ يرجى ارسال طلب واحد كل ثانية', {
        show_alert: false,
      });
    } catch (error) {
      this.logger.debug(`Failed to answer callback: ${String(error)}`);
    }
  }
}
