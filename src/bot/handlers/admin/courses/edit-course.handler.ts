import { Action, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

import { CourseService } from 'src/course/services/course.service';

import {
  BotEventService,
  BotEventType,
} from 'src/bot/services/bot-event.service';

import { BotEventConflictService } from 'src/bot/services/bot-conflict.service';

@Update()
export class EditCourseHandler {
  constructor(
    private readonly courseService: CourseService,
    private readonly botEventService: BotEventService,
    private readonly botEventConflictService: BotEventConflictService,
  ) {}

  // ============================================================
  // ec
  // بدء تعديل كورس
  // ============================================================

  @Action('ec')
  async start(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    // ============================================================
    // التحقق من وجود عملية أخرى
    // ============================================================

    const existingEvent = this.botEventService.get(userId);

    if (existingEvent) {
      await this.botEventConflictService.showConflict(ctx, existingEvent);

      // مهم جدًا:
      // لا نبدأ عملية التعديل إذا كان هناك Event قديم.
      return;
    }

    // ============================================================
    // بدء عملية تعديل الكورس
    // ============================================================

    await this.startEditCourse(ctx, userId);
  }

  // ============================================================
  // طلب اسم الكورس القديم
  // ============================================================

  private async startEditCourse(ctx: Context, userId: number): Promise<void> {
    const message = await ctx.reply(
      '✏️ <b>تعديل كورس</b>\n\n' +
        'أرسل اسم الكورس الذي تريد تعديله:\n\n' +
        'مثال:\n' +
        '<code>قواعد البيانات</code>',
      {
        parse_mode: 'HTML',
      },
    );

    // ============================================================
    // حفظ حالة انتظار اسم الكورس القديم
    // ============================================================

    this.botEventService.set({
      userId,
      event: BotEventType.WAITING_EDIT_COURSE_NAME,
      messageId: message.message_id,
      chatId: String(ctx.chat?.id ?? ''),
    });
  }

  // ============================================================
  // استقبال اسم الكورس القديم
  // ============================================================

  async handleCourseName(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }

    // ============================================================
    // الحصول على Event
    // ============================================================

    const event = this.botEventService.get(userId);

    if (!event) {
      return;
    }

    // ============================================================
    // التأكد أن المستخدم في مرحلة البحث عن الكورس
    // ============================================================

    if (event.event !== BotEventType.WAITING_EDIT_COURSE_NAME) {
      return;
    }

    const name = ctx.message.text.trim();

    // ============================================================
    // التحقق من الاسم
    // ============================================================

    if (!name) {
      await ctx.reply('❌ اسم الكورس لا يمكن أن يكون فارغًا.');

      return;
    }

    if (name.length > 150) {
      await ctx.reply('❌ اسم الكورس طويل جدًا. الحد الأقصى 150 حرفًا.');

      return;
    }

    // ============================================================
    // البحث عن الكورس
    // ============================================================

    const course = await this.courseService.findCourseByName(name);

    // ============================================================
    // الكورس غير موجود
    // ============================================================

    if (!course) {
      await ctx.reply(
        `❌ لم يتم العثور على كورس باسم <b>${this.escapeHtml(name)}</b>.`,
        {
          parse_mode: 'HTML',
        },
      );

      // ننهي العملية لأنه لا يوجد كورس لتعديله.
      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // تم العثور على الكورس
    // ============================================================
    //
    // الآن لا نعدله مباشرة.
    //
    // نطلب من المستخدم الاسم الجديد.
    //
    // ============================================================

    const message = await ctx.reply(
      '✅ <b>تم العثور على الكورس</b>\n\n' +
        `📚 الاسم الحالي: <b>${this.escapeHtml(course.name)}</b>\n` +
        `🆔 ID: <code>${course.id}</code>\n\n` +
        '✏️ أرسل الاسم الجديد للكورس:',
      {
        parse_mode: 'HTML',
      },
    );

    // ============================================================
    // الانتقال إلى المرحلة الثانية
    // ============================================================
    //
    // نحتاج الاحتفاظ بـ ID الكورس الذي وجدناه.
    //
    // لذلك نضع courseId داخل الـ Event.
    //
    // ============================================================

    this.botEventService.set({
      userId,
      event: BotEventType.WAITING_EDIT_COURSE_NEW_NAME,
      messageId: message.message_id,
      chatId: String(ctx.chat?.id ?? ''),
      data: {
        courseId: course.id,
      },
    });
  }

  // ============================================================
  // استقبال الاسم الجديد
  // ============================================================

  async handleNewCourseName(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }

    // ============================================================
    // الحصول على Event
    // ============================================================

    const event = this.botEventService.get(userId);

    if (!event) {
      return;
    }

    // ============================================================
    // التأكد من المرحلة
    // ============================================================

    if (event.event !== BotEventType.WAITING_EDIT_COURSE_NEW_NAME) {
      return;
    }

    const newName = ctx.message.text.trim();

    // ============================================================
    // التحقق من الاسم الجديد
    // ============================================================

    if (!newName) {
      await ctx.reply('❌ اسم الكورس لا يمكن أن يكون فارغًا.');

      return;
    }

    if (newName.length > 150) {
      await ctx.reply('❌ اسم الكورس طويل جدًا. الحد الأقصى 150 حرفًا.');

      return;
    }

    // ============================================================
    // التأكد من وجود courseId
    // ============================================================

    const courseId = event.data?.courseId;

    if (!courseId) {
      await ctx.reply(
        '❌ تعذر تحديد الكورس المطلوب تعديله.\n\n' +
          'يرجى بدء العملية من جديد.',
      );

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // منع استخدام اسم موجود مسبقًا
    // ============================================================
    //
    // مثال:
    //
    // عندنا:
    // قواعد البيانات
    // البرمجة
    //
    // المستخدم يريد تعديل:
    // قواعد البيانات
    //
    // إلى:
    // البرمجة
    //
    // هنا يجب رفض التعديل.
    //
    // ============================================================

    const existing = await this.courseService.findCourseByName(newName);

    if (existing && existing.id !== courseId) {
      await ctx.reply(
        `⚠️ يوجد كورس آخر باسم <b>${this.escapeHtml(existing.name)}</b>.\n\n` +
          '❌ لا يمكن استخدام هذا الاسم.',
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    // ============================================================
    // تحديث الكورس
    // ============================================================

    // تأكد أن المعلمة الأولى number صريح وليست undefined أو object
    const numericCourseId = Number(courseId);

    if (isNaN(numericCourseId) || !numericCourseId) {
      await ctx.reply('❌ تعذر الحصول على معرف الكورس بشكل صحيح.');
      return;
    }

    const updatedCourse = await this.courseService.updateCourse(
      numericCourseId,
      {
        name: newName,
      },
    );

    // ============================================================
    // انتهاء العملية
    // ============================================================

    this.botEventService.delete(userId);

    // ============================================================
    // النتيجة
    // ============================================================

    await ctx.reply(
      '✅ <b>تم تعديل الكورس بنجاح</b>\n\n' +
        `📚 الاسم الجديد: <b>${this.escapeHtml(updatedCourse.name)}</b>\n` +
        `🆔 ID: <code>${updatedCourse.id}</code>`,
      {
        parse_mode: 'HTML',
      },
    );
  }

  // ============================================================
  // HTML Escape
  // ============================================================

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
