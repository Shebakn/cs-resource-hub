/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Action, Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

import { AddMaterialHandler } from '../admin/materials/add-material.handler';
import { AddExamHandler } from '../admin/exams/add-exam.handler';
import {
  BotEventService,
  BotEventType,
} from '../../services/bot-event.service';

import {
  UploadSession,
  UploadSessionService,
} from '../../services/upload-session.service';

@Update()
export class UploadDocumentHandler {
  private readonly logger = new Logger(UploadDocumentHandler.name);

  private readonly storageChannelId: string;

  constructor(
    private readonly uploadSessionService: UploadSessionService,
    private readonly botEventService: BotEventService,
    private readonly configService: ConfigService,
    private readonly addMaterialHandler: AddMaterialHandler,
    private readonly addExamHandler: AddExamHandler,
  ) {
    this.storageChannelId =
      this.configService.get<string>('MATERIAL_STORAGE_CHANNEL_ID') ?? '';

    this.logger.log('🔥 UploadDocumentHandler INITIALIZED');
  }

  // ============================================================
  // Helpers
  // ============================================================

  private getUserId(ctx: Context): number | undefined {
    return ctx.from?.id;
  }

  private getUserName(ctx: Context): string {
    if (!ctx.from) {
      return 'unknown';
    }

    if (ctx.from.username) {
      return `@${ctx.from.username}`;
    }

    return (
      [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') ||
      'unknown'
    );
  }

  private logAction(ctx: Context, action: string, extra?: unknown): void {
    const userId = ctx.from?.id;
    const user = this.getUserName(ctx);

    this.logger.log(
      `user=${user} userId=${userId} action=${action}${
        extra ? ` data=${JSON.stringify(extra)}` : ''
      }`,
    );
  }

  private async safeAnswerCbQuery(ctx: Context, text?: string): Promise<void> {
    try {
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(text);
      }
    } catch (error) {
      this.logger.debug(
        `Callback query already answered or unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private getWorkflowName(workflow: UploadSession['workflow']): string {
    return workflow === 'MATERIAL' ? '📚 ملزمة' : '📝 اختبار';
  }

  private getEventName(event: BotEventType): string {
    switch (event) {
      case BotEventType.WAITING_MATERIAL_DOCUMENT:
        return 'بانتظار ملف الملزمة';

      case BotEventType.WAITING_MATERIAL_TITLE:
        return 'بانتظار عنوان الملزمة';

      case BotEventType.WAITING_EXAM_DOCUMENT:
        return 'بانتظار ملف الاختبار';

      case BotEventType.WAITING_EXAM_TITLE:
        return 'بانتظار عنوان الاختبار';

      case BotEventType.WAITING_COURSE_NAME:
        return 'بانتظار اسم الكورس';

      case BotEventType.WAITING_DELETE_USER:
        return 'بانتظار بيانات المستخدم للحذف';

      case BotEventType.WAITING_PROMOTE_USER:
        return 'بانتظار بيانات المستخدم للترقية';

      case BotEventType.WAITING_DEMOTE_ADMIN:
        return 'بانتظار بيانات الأدمن لخفض الرتبة';

      case BotEventType.PROCESSING:
        return 'جاري المعالجة';

      default:
        return String(event);
    }
  }

  private buildSessionDescription(
    session: UploadSession,
    event: BotEventType,
  ): string {
    return [
      this.getWorkflowName(session.workflow),
      `الحالة: ${this.getEventName(event)}`,
    ].join('\n');
  }

  // ============================================================
  // DOCUMENT
  // ============================================================

  @On('document')
  async onDocument(@Ctx() ctx: Context): Promise<void> {
    const userId = this.getUserId(ctx);

    this.logger.log(`DOCUMENT EVENT received userId=${userId}`);

    if (!userId) {
      return;
    }

    const message = ctx.message;

    if (!message || !('document' in message) || !message.document) {
      return;
    }

    const telegramFileId = message.document.file_id;

    this.logAction(ctx, 'DOCUMENT_RECEIVED', {
      telegramFileId,
    });

    // ============================================================
    // Get local bot event
    // ============================================================

    const event = this.botEventService.get(userId);

    if (!event) {
      this.logger.debug(
        `DOCUMENT ignored: no active bot event userId=${userId}`,
      );

      return;
    }

    // ============================================================
    // MATERIAL DOCUMENT
    // ============================================================

    if (event.event === BotEventType.WAITING_MATERIAL_DOCUMENT) {
      await this.addMaterialHandler.handleDocument(ctx);
      return;
    }

    // ============================================================
    // EXAM DOCUMENT
    // ============================================================

    if (event.event === BotEventType.WAITING_EXAM_DOCUMENT) {
      await this.addExamHandler.handleDocument(ctx);
      return;
    }

    // ============================================================
    // Get temporary upload session
    // ============================================================

    const session = this.uploadSessionService.get(userId);

    if (!session) {
      this.logger.warn(
        `DOCUMENT ignored: bot event exists but upload session missing ` +
          `userId=${userId}`,
      );

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // Another pending file exists
    // ============================================================

    if (session.pendingFileId) {
      this.logger.warn(
        `Another pending document already exists userId=${userId}`,
      );

      await ctx.reply(
        '⚠️ لديك ملف جديد بانتظار القرار أيضاً.\n\n' +
          'اختر العملية الحالية أولاً.',
      );

      return;
    }

    // ============================================================
    // WAITING DOCUMENT
    // ============================================================

    const eventType = Number(event.event);

    const waitingDocument =
      eventType === BotEventType.WAITING_MATERIAL_DOCUMENT ||
      eventType === BotEventType.WAITING_EXAM_DOCUMENT;

    if (waitingDocument) {
      this.uploadSessionService.setFile(userId, telegramFileId);

      const nextEvent =
        session.workflow === 'MATERIAL'
          ? BotEventType.WAITING_MATERIAL_TITLE
          : BotEventType.WAITING_EXAM_TITLE;

      this.botEventService.update(userId, {
        event: nextEvent,
      });

      this.logAction(ctx, 'DOCUMENT_ACCEPTED', {
        workflow: session.workflow,
        courseOfferingId: session.courseOfferingId,
        type: session.type,
        telegramFileId,
      });

      await ctx.reply('📄 تم استلام الملف بنجاح.\n\n' + '✏️ الآن أرسل عنوانه.');

      return;
    }

    // ============================================================
    // WAITING TITLE
    // ============================================================

    const waitingTitle =
      event.event === BotEventType.WAITING_MATERIAL_TITLE ||
      event.event === BotEventType.WAITING_EXAM_TITLE;

    if (waitingTitle) {
      this.uploadSessionService.setPendingFile(userId, telegramFileId);

      this.logAction(ctx, 'SECOND_DOCUMENT_RECEIVED', {
        workflow: session.workflow,
        oldFileId: session.telegramFileId,
        newFileId: telegramFileId,
      });

      await ctx.reply(
        '⚠️ لديك عملية رفع قائمة بالفعل.\n\n' +
          `${this.buildSessionDescription(session, event.event)}\n\n` +
          'لقد أرسلت ملف PDF جديداً قبل إكمال العملية القديمة.\n\n' +
          'هل تريد إلغاء الملف القديم والمتابعة بالملف الجديد؟',
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '❌ إلغاء القديمة والمتابعة',
                  callback_data: 'uw/c',
                },
              ],
              [
                {
                  text: '↩️ العودة للعملية القديمة',
                  callback_data: 'uw/r',
                },
              ],
            ],
          },
        },
      );

      return;
    }

    // ============================================================
    // PROCESSING
    // ============================================================

    if (event.event === BotEventType.PROCESSING) {
      await ctx.reply(
        '⏳ العملية السابقة ما زالت قيد المعالجة.\n\n' + 'انتظر حتى تكتمل.',
      );

      return;
    }
  }

  // ============================================================
  // CANCEL OLD + CONTINUE WITH NEW FILE
  // ============================================================

  @Action('uw/c')
  async cancelOldAndContinue(@Ctx() ctx: Context): Promise<void> {
    const userId = this.getUserId(ctx);

    if (!userId) {
      await this.safeAnswerCbQuery(ctx, 'تعذر تحديد المستخدم');

      return;
    }

    this.logAction(ctx, 'CANCEL_OLD_AND_CONTINUE');

    // ============================================================
    // Get Event
    // ============================================================

    const event = this.botEventService.get(userId);

    if (!event) {
      await this.safeAnswerCbQuery(ctx, 'لا توجد عملية رفع');

      return;
    }

    const waitingTitle =
      event.event === BotEventType.WAITING_MATERIAL_TITLE ||
      event.event === BotEventType.WAITING_EXAM_TITLE;

    if (!waitingTitle) {
      await this.safeAnswerCbQuery(ctx, 'العملية ليست بانتظار العنوان');

      return;
    }

    // ============================================================
    // Get Session
    // ============================================================

    const session = this.uploadSessionService.get(userId);

    if (!session) {
      await this.safeAnswerCbQuery(ctx, 'لا توجد بيانات العملية');

      this.botEventService.delete(userId);

      return;
    }

    if (!session.pendingFileId) {
      await this.safeAnswerCbQuery(ctx, 'لا يوجد ملف جديد');

      return;
    }

    // ============================================================
    // Replace old file
    // ============================================================

    const updated = this.uploadSessionService.replaceWithPendingFile(userId);

    if (!updated) {
      await this.safeAnswerCbQuery(ctx, 'تعذر تحديث العملية');

      return;
    }

    await this.safeAnswerCbQuery(ctx, 'تم اعتماد الملف الجديد');

    // ============================================================
    // Edit message
    // ============================================================

    try {
      if (
        ctx.callbackQuery &&
        'message' in ctx.callbackQuery &&
        ctx.callbackQuery.message
      ) {
        await ctx.editMessageText(
          '✅ تم إلغاء الملف القديم.\n\n' +
            '📄 تم اعتماد الملف الجديد.\n\n' +
            '✏️ الآن أرسل عنوانه.',
        );
      } else {
        await ctx.reply(
          '✅ تم إلغاء الملف القديم.\n\n' +
            '📄 تم اعتماد الملف الجديد.\n\n' +
            '✏️ الآن أرسل عنوانه.',
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to edit confirmation message: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      await ctx.reply(
        '✅ تم اعتماد الملف الجديد.\n\n' + '✏️ الآن أرسل عنوانه.',
      );
    }
  }

  // ============================================================
  // RETURN TO OLD
  // ============================================================

  @Action('uw/r')
  async returnToOld(@Ctx() ctx: Context): Promise<void> {
    const userId = this.getUserId(ctx);

    if (!userId) {
      await this.safeAnswerCbQuery(ctx, 'تعذر تحديد المستخدم');

      return;
    }

    this.logAction(ctx, 'RETURN_TO_OLD');

    // ============================================================
    // Get Event
    // ============================================================

    const event = this.botEventService.get(userId);

    if (!event) {
      await this.safeAnswerCbQuery(ctx, 'لا توجد عملية رفع');

      return;
    }

    const waitingTitle =
      event.event === BotEventType.WAITING_MATERIAL_TITLE ||
      event.event === BotEventType.WAITING_EXAM_TITLE;

    if (!waitingTitle) {
      await this.safeAnswerCbQuery(ctx, 'العملية غير صالحة حالياً');

      return;
    }

    // ============================================================
    // Get Session
    // ============================================================

    const session = this.uploadSessionService.get(userId);

    if (!session) {
      await this.safeAnswerCbQuery(ctx, 'لا توجد بيانات العملية');

      this.botEventService.delete(userId);

      return;
    }

    if (!session.pendingFileId) {
      await this.safeAnswerCbQuery(ctx, 'لا يوجد ملف جديد');

      return;
    }

    // ============================================================
    // Restore old file
    // ============================================================

    const updated = this.uploadSessionService.restoreOldFile(userId);

    if (!updated) {
      await this.safeAnswerCbQuery(ctx, 'تعذر استعادة العملية');

      return;
    }

    await this.safeAnswerCbQuery(ctx, 'تم تجاهل الملف الجديد');

    // ============================================================
    // Edit message
    // ============================================================

    try {
      if (
        ctx.callbackQuery &&
        'message' in ctx.callbackQuery &&
        ctx.callbackQuery.message
      ) {
        await ctx.editMessageText(
          '↩️ تم تجاهل الملف الجديد.\n\n' +
            '✅ تم الرجوع إلى العملية القديمة.\n\n' +
            '✏️ الآن أرسل عنوان الملف القديم.',
        );
      } else {
        await ctx.reply(
          '↩️ تم تجاهل الملف الجديد.\n\n' + '✏️ أرسل عنوان الملف القديم.',
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to edit return message: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      await ctx.reply(
        '↩️ تم الرجوع إلى العملية القديمة.\n\n' + '✏️ أرسل عنوان الملف القديم.',
      );
    }
  }
}
