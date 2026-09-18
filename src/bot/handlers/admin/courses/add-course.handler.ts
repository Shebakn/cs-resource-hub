import { Action, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

import { CourseService } from 'src/course/services/course.service';

import {
  BotEventService,
  BotEventType,
} from 'src/bot/services/bot-event.service';

import { BotEventConflictService } from 'src/bot/services/bot-conflict.service';

@Update()
export class AddCourseHandler {
  constructor(
    private readonly courseService: CourseService,
    private readonly botEventService: BotEventService,
    private readonly botEventConflictService: BotEventConflictService,
  ) {}

  // ============================================================
  // ac
  // بدء إضافة كورس
  // ============================================================

  @Action('ach')
  async start(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    // ============================================================
    // Check existing event
    // ============================================================
    //
    // إذا كان المستخدم لديه عملية قديمة:
    //
    // لا نبدأ عملية جديدة.
    //
    // فقط نظهر له:
    //
    // ↩️ العودة للعملية القديمة
    // ❌ إلغاء القديمة والمتابعة
    //
    // ============================================================

    const existingEvent = this.botEventService.get(userId);

    if (existingEvent) {
      await this.botEventConflictService.showConflict(ctx, existingEvent);

      // ==========================================================
      // مهم جدًا:
      //
      // يجب أن نتوقف هنا.
      //
      // في كودك السابق كان بعد showConflict()
      // يتم تنفيذ startNewCourse() أيضًا.
      //
      // وهذا يؤدي إلى إنشاء عملية جديدة رغم وجود عملية قديمة.
      //
      // ==========================================================

      return;
    }

    // ============================================================
    // لا توجد عملية قديمة
    // → ابدأ إضافة الكورس مباشرة
    // ============================================================

    await this.startNewCourse(ctx, userId);
  }

  // ============================================================
  // إنشاء عملية إضافة الكورس
  // ============================================================

  private async startNewCourse(ctx: Context, userId: number): Promise<void> {
    const message = await ctx.reply(
      '📚 <b>إضافة كورس جديد</b>\n\n' +
        'أرسل اسم الكورس فقط:\n\n' +
        'مثال:\n' +
        '<code>قواعد البيانات</code>',
      {
        parse_mode: 'HTML',
      },
    );

    // ============================================================
    // تسجيل حالة المستخدم
    // ============================================================
    //
    // من الآن أي رسالة text من هذا المستخدم
    // سيتم التعامل معها كاسم كورس.
    //
    // ============================================================

    this.botEventService.set({
      userId,

      event: BotEventType.WAITING_COURSE_NAME,

      messageId: message.message_id,

      chatId: String(ctx.chat?.id ?? ''),
    });
  }

  // ============================================================
  // استقبال اسم الكورس
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
    // الحصول على Event الخاص بالمستخدم
    // ============================================================

    const event = this.botEventService.get(userId);

    if (!event) {
      return;
    }

    // ============================================================
    // التأكد أن الـ Event خاص بإضافة الكورس
    // ============================================================
    //
    // لأن عندك عدة @On('text')
    // فلا نريد أن يتعامل هذا Handler
    // مع عملية تخص Handler آخر.
    //
    // ============================================================

    if (event.event !== BotEventType.WAITING_COURSE_NAME) {
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
    // منع تكرار الكورس
    // ============================================================

    const existing = await this.courseService.findCourseByName(name);

    if (existing) {
      await ctx.reply(
        `⚠️ الكورس <b>${this.escapeHtml(existing.name)}</b> موجود مسبقًا.\n\n` +
          `🆔 ID: <code>${existing.id}</code>`,
        {
          parse_mode: 'HTML',
        },
      );

      // ==========================================================
      // انتهاء العملية
      // ==========================================================

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // إنشاء الكورس
    // ============================================================

    const course = await this.courseService.createCourse({
      name,
    });

    // ============================================================
    // انتهاء العملية
    // ============================================================

    this.botEventService.delete(userId);

    // ============================================================
    // النتيجة
    // ============================================================

    await ctx.reply(
      '✅ <b>تم إضافة الكورس بنجاح</b>\n\n' +
        `📚 الاسم: <b>${this.escapeHtml(course.name)}</b>\n` +
        `🆔 ID: <code>${course.id}</code>`,
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
