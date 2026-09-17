import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';

import { BotEvent, BotEventService, BotEventType } from './bot-event.service';

@Injectable()
export class BotEventConflictService {
  constructor(private readonly botEventService: BotEventService) {}

  // ============================================================
  // إظهار تعارض العملية
  // ============================================================
  //
  // هذا الميثود مشترك بين جميع الـ Handlers.
  //
  // مثال:
  //
  // AddCourseHandler
  // AddMaterialHandler
  // AddExamHandler
  //
  // جميعهم عندما يجدون Event قديم يستدعون:
  //
  // showConflict(ctx, existingEvent)
  //
  // ============================================================

  async showConflict(ctx: Context, event: BotEvent): Promise<void> {
    const eventName = this.getEventName(event.event);

    await ctx.reply(
      '⚠️ <b>لديك عملية قيد التنفيذ بالفعل</b>\n\n' +
        `📌 العملية الحالية: <b>${eventName}</b>\n\n` +
        'ماذا تريد أن تفعل؟',
      {
        parse_mode: 'HTML',

        // ========================================================
        // أزرار العملية القديمة
        // ========================================================
        //
        // زر العودة:
        // يعيد المستخدم للعملية الموجودة حاليًا.
        //
        // زر الإلغاء والمتابعة:
        // يحذف الـ Event القديم حتى يستطيع المستخدم
        // بدء العملية الجديدة.
        //
        // ========================================================

        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '↩️ العودة للعملية القديمة',
                callback_data: 'bot-conflict/return',
              },
            ],
            [
              {
                text: '❌ إلغاء القديمة والمتابعة',
                callback_data: 'bot-conflict/cancel',
              },
            ],
          ],
        },
      },
    );
  }

  // ============================================================
  // العودة للعملية القديمة
  // ============================================================
  //
  // هذا الجزء أصبح مشتركًا بدل ما نكتبه في كل Handler.
  //
  // ============================================================

  async returnToOld(ctx: Context): Promise<void> {
    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    const event = this.botEventService.get(userId);

    if (!event) {
      await ctx.reply('ℹ️ لا توجد عملية قديمة.\n\n' + 'يمكنك بدء عملية جديدة.');

      return;
    }

    // ============================================================
    // الحصول على الرسالة الخاصة بالعملية القديمة
    // ============================================================

    const oldMessage = this.getEventMessage(event.event);

    try {
      // ==========================================================
      // محاولة تعديل الرسالة الأصلية للعملية
      // ==========================================================

      await ctx.telegram.editMessageText(
        event.chatId,
        event.messageId,
        undefined,
        oldMessage.text,
        oldMessage.options,
      );
    } catch {
      // ==========================================================
      // إذا لم نستطع تعديل الرسالة القديمة
      // نرسل رسالة جديدة بدلًا منها
      // ==========================================================

      await ctx.reply(oldMessage.text, oldMessage.options);
    }
  }

  // ============================================================
  // إلغاء العملية القديمة
  // ============================================================
  //
  // ملاحظة:
  //
  // هذا الميثود لا يبدأ العملية الجديدة.
  //
  // وظيفته فقط حذف الـ Event القديم.
  //
  // الـ Handler الذي بدأ العملية الجديدة هو المسؤول
  // عن استدعاء startNewCourse() بعد ذلك.
  //
  // ============================================================

  cancelOld(userId: number): boolean {
    const event = this.botEventService.get(userId);

    if (!event) {
      return false;
    }

    this.botEventService.delete(userId);

    return true;
  }

  // ============================================================
  // اسم العملية
  // ============================================================

  private getEventName(event: BotEventType): string {
    switch (event) {
      // Materials
      case BotEventType.WAITING_MATERIAL_COURSE:
        return 'بانتظار اختيار كورس الملزمة';
      case BotEventType.WAITING_MATERIAL_DEPARTMENT:
        return 'بانتظار اختيار القسم للملزمة';
      case BotEventType.WAITING_MATERIAL_LEVEL:
        return 'بانتظار اختيار المستوى للملزمة';
      case BotEventType.WAITING_MATERIAL_TRACK:
        return 'بانتظار اختيار التخصص (التراك) للملزمة';
      case BotEventType.WAITING_MATERIAL_TERM:
        return 'بانتظار اختيار الترم للملزمة';
      case BotEventType.WAITING_MATERIAL_ACADEMIC_YEAR:
        return 'بانتظار اختيار العام الدراسي للملزمة';
      case BotEventType.WAITING_MATERIAL_TYPE:
        return 'بانتظار تحديد نوع الملزمة';
      case BotEventType.WAITING_MATERIAL_DOCUMENT:
        return 'بانتظار ملف الملزمة';
      case BotEventType.WAITING_MATERIAL_TITLE:
        return 'بانتظار عنوان الملزمة';
      case BotEventType.WAITING_MATERIAL_REUSE:
        return 'بانتظار تأكيد إعادة استخدام الملزمة';

      // Exams
      case BotEventType.WAITING_EXAM_DOCUMENT:
        return 'بانتظار ملف الاختبار';
      case BotEventType.WAITING_EXAM_TITLE:
        return 'بانتظار عنوان الاختبار';

      // Users
      case BotEventType.WAITING_DELETE_USER:
        return 'بانتظار بيانات المستخدم للحذف';
      case BotEventType.WAITING_PROMOTE_USER:
        return 'بانتظار بيانات المستخدم للترقية';
      case BotEventType.WAITING_DEMOTE_ADMIN:
        return 'بانتظار بيانات الأدمن لخفض الرتبة';

      // Courses
      case BotEventType.WAITING_COURSE_NAME:
        return 'بانتظار اسم الكورس';
      case BotEventType.WAITING_EDIT_COURSE_NAME:
        return 'بانتظار اسم الكورس المراد تعديله';
      case BotEventType.WAITING_EDIT_COURSE_NEW_NAME:
        return 'بانتظار اسم الكورس الجديد';

      // Course Offering
      case BotEventType.WAITING_COURSE_OFFERING_COURSE:
        return 'بانتظار اختيار الكورس لطرح المقرر';
      case BotEventType.WAITING_COURSE_OFFERING_DEPARTMENT:
        return 'بانتظار اختيار القسم لطرح المقرر';
      case BotEventType.WAITING_COURSE_OFFERING_LEVEL:
        return 'بانتظار اختيار المستوى لطرح المقرر';
      case BotEventType.WAITING_COURSE_OFFERING_TRACK:
        return 'بانتظار اختيار التخصص (التراك) لطرح المقرر';
      case BotEventType.WAITING_COURSE_OFFERING_TERM:
        return 'بانتظار اختيار الترم لطرح المقرر';
      case BotEventType.WAITING_COURSE_OFFERING_ACADEMIC_YEAR:
        return 'بانتظار اختيار العام الدراسي لطرح المقرر';

      // Processing
      case BotEventType.PROCESSING:
        return 'جاري المعالجة';

      default:
        return String(event);
    }
  }

  // ============================================================
  // رسالة العملية القديمة
  // ============================================================
  //
  // هذا أيضًا أصبح مشتركًا بين جميع الـ Handlers.
  //
  // ============================================================

  private getEventMessage(event: BotEventType): {
    text: string;
    options: {
      parse_mode: 'HTML';
    };
  } {
    switch (event) {
      case BotEventType.WAITING_COURSE_NAME:
        return {
          text:
            '📚 <b>إضافة كورس جديد</b>\n\n' +
            'أرسل اسم الكورس فقط:\n\n' +
            'مثال:\n' +
            '<code>قواعد البيانات</code>',

          options: {
            parse_mode: 'HTML',
          },
        };

      case BotEventType.WAITING_MATERIAL_DOCUMENT:
        return {
          text: '📚 <b>إضافة ملزمة</b>\n\n' + '📄 أرسل ملف الملزمة.',

          options: {
            parse_mode: 'HTML',
          },
        };

      case BotEventType.WAITING_MATERIAL_TITLE:
        return {
          text: '📚 <b>إضافة ملزمة</b>\n\n' + '✏️ أرسل عنوان الملزمة.',

          options: {
            parse_mode: 'HTML',
          },
        };

      case BotEventType.WAITING_EXAM_DOCUMENT:
        return {
          text: '📝 <b>إضافة اختبار</b>\n\n' + '📄 أرسل ملف الاختبار.',

          options: {
            parse_mode: 'HTML',
          },
        };

      case BotEventType.WAITING_EXAM_TITLE:
        return {
          text: '📝 <b>إضافة اختبار</b>\n\n' + '✏️ أرسل عنوان الاختبار.',

          options: {
            parse_mode: 'HTML',
          },
        };

      default:
        return {
          text:
            '⚠️ <b>لديك عملية قيد التنفيذ.</b>\n\n' +
            `📌 الحالة: <b>${this.getEventName(event)}</b>`,

          options: {
            parse_mode: 'HTML',
          },
        };
    }
  }
}
