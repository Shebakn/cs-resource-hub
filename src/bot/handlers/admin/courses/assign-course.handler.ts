/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Action, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

import {
  BotEventService,
  BotEventType,
} from 'src/bot/services/bot-event.service';

import { CourseService } from 'src/course/services/course.service';
import { AcademicService } from 'src/academic/services/academic.services';
import { courseKeyboard } from 'src/bot/keyboards/course.keyboard';
import { departmentKeyboard } from 'src/bot/keyboards/department.keyboard';
import { levelKeyboard } from 'src/bot/keyboards/level.keyboard';
import { termKeyboard } from 'src/bot/keyboards/term.keyboard';
import { academicYearKeyboard } from 'src/bot/keyboards/academic-year.keyboard';
import { trackKeyboard } from 'src/bot/keyboards/track.keyboard';
import { BotEventConflictService } from 'src/bot/services/bot-conflict.service';

@Update()
export class AssignCourseHandler {
  constructor(
    private readonly courseService: CourseService,
    private readonly academicService: AcademicService,
    private readonly botEventService: BotEventService,
    private readonly botEventConflictService: BotEventConflictService,
  ) {}

  // ============================================================
  // بدء عملية إسناد كورس
  // Callback:
  //
  // ac
  // ============================================================

  @Action('ac')
  async start(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    // ============================================================
    // التأكد من عدم وجود عملية أخرى
    // ============================================================

    const existingEvent = this.botEventService.get(userId);

    if (existingEvent) {
      await this.botEventConflictService.showConflict(ctx, existingEvent);

      return;
    }

    // ============================================================
    // جلب الكورسات
    // ============================================================

    const page = 1;
    const limit = 8;

    const result = await this.courseService.getCoursesPaginated(page, limit);

    if (!result.courses.length) {
      await ctx.reply(
        '❌ لا توجد كورسات حاليًا.\n\n' + 'قم بإضافة كورس أولًا.',
      );

      return;
    }

    // ============================================================
    // عرض الكورسات
    // ============================================================

    const message = await ctx.reply(
      '📚 <b>إسناد كورس إلى فصل</b>\n\n' + 'اختر الكورس الذي تريد إسناده:',
      {
        parse_mode: 'HTML',
        ...courseKeyboard(result.courses, 'ac', result.page, result.totalPages),
      },
    );

    // ============================================================
    // حفظ Event
    // ============================================================

    this.botEventService.set({
      userId,
      event: BotEventType.WAITING_COURSE_OFFERING_COURSE,
      messageId: message.message_id,
      chatId: String(ctx.chat?.id ?? ''),
      data: {
        page,
      },
    });
  }

  // ============================================================
  // اختيار الكورس
  //
  // Callback:
  //
  // ac/courseId
  //
  // مثال:
  // ac/12
  // ============================================================

  @Action(/^ac\/(\d+)$/)
  async selectCourse(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    const event = this.botEventService.get(userId);
    console.log(event);

    if (!event) {
      await ctx.reply(
        'ℹ️ انتهت عملية الإسناد.\n\n' + 'يرجى بدء العملية من جديد.',
      );

      return;
    }

    // ============================================================
    // التأكد من المرحلة
    // ============================================================

    if (event.event !== BotEventType.WAITING_COURSE_OFFERING_COURSE) {
      return;
    }

    const courseId = this.getCallbackId(ctx);

    if (!courseId) {
      return;
    }

    // ============================================================
    // التأكد من وجود الكورس
    // ============================================================

    const course = await this.courseService.getCourseById(courseId);

    if (!course) {
      await ctx.reply(
        '❌ الكورس المطلوب غير موجود.\n\n' + 'يرجى بدء العملية من جديد.',
      );

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // جلب الأقسام
    // ============================================================

    const departments = await this.academicService.getDepartments();

    if (!departments.length) {
      await ctx.reply('❌ لا توجد أقسام دراسية حاليًا.');

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // تحديث Event
    // ============================================================

    this.botEventService.update(userId, {
      event: BotEventType.WAITING_COURSE_OFFERING_DEPARTMENT,
      data: {
        courseId,
      },
    });

    // ============================================================
    // عرض الأقسام
    //
    // ac/courseId/departmentId
    // ============================================================

    await ctx.reply(
      '📚 <b>الكورس:</b> ' +
        `<b>${this.escapeHtml(course.name)}</b>\n\n` +
        '🏫 اختر القسم:',
      {
        parse_mode: 'HTML',
        ...departmentKeyboard(departments, `ac/${courseId}`),
      },
    );
  }

  // ============================================================
  // اختيار القسم
  //
  // Callback:
  //
  // ac/courseId/departmentId
  //
  // مثال:
  // ac/12/2
  // ============================================================

  @Action(/^ac\/(\d+)\/(\d+)$/)
  async selectDepartment(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    const event = this.botEventService.get(userId);

    if (!event) {
      await ctx.reply(
        'ℹ️ انتهت عملية الإسناد.\n\n' + 'يرجى بدء العملية من جديد.',
      );

      return;
    }

    if (event.event !== BotEventType.WAITING_COURSE_OFFERING_DEPARTMENT) {
      return;
    }

    const ids = this.getCallbackIds(ctx, 2);

    if (!ids) {
      return;
    }

    const [courseId, departmentId] = ids;

    // ============================================================
    // التأكد من البيانات المحفوظة
    // ============================================================

    if (event.data?.courseId !== courseId) {
      await ctx.reply(
        '❌ بيانات العملية غير صحيحة.\n\n' + 'يرجى بدء العملية من جديد.',
      );

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // التأكد من وجود القسم
    // ============================================================

    const department =
      await this.academicService.getDepartmentById(departmentId);

    if (!department) {
      await ctx.reply('❌ القسم المطلوب غير موجود.');

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // جلب المستويات
    // ============================================================

    const levels = await this.academicService.getLevels();

    if (!levels.length) {
      await ctx.reply('❌ لا توجد مستويات دراسية حاليًا.');

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // تحديث Event
    // ============================================================

    this.botEventService.update(userId, {
      event: BotEventType.WAITING_COURSE_OFFERING_LEVEL,
      data: {
        courseId,
        departmentId,
      },
    });

    // ============================================================
    // عرض المستويات
    //
    // ac/courseId/departmentId/levelId
    // ============================================================

    await ctx.reply(
      '🏫 <b>القسم:</b> ' +
        `<b>${this.escapeHtml(department.name)}</b>\n\n` +
        '🎓 اختر المستوى:',
      {
        parse_mode: 'HTML',
        ...levelKeyboard(levels, `ac/${courseId}/${departmentId}`),
      },
    );
  }

  // ============================================================
  // اختيار المستوى
  //
  // Callback:
  //
  // ac/courseId/departmentId/levelId
  //
  // مثال:
  // ac/12/2/3
  // ============================================================

  @Action(/^ac\/(\d+)\/(\d+)\/(\d+)$/)
  async selectLevel(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    const event = this.botEventService.get(userId);

    if (!event) {
      await ctx.reply(
        'ℹ️ انتهت عملية الإسناد.\n\n' + 'يرجى بدء العملية من جديد.',
      );

      return;
    }

    console.log(event);

    if (event.event !== BotEventType.WAITING_COURSE_OFFERING_LEVEL) {
      console.log('event not exists');
      return;
    }

    const ids = this.getCallbackIds(ctx, 3);

    if (!ids) {
      return;
    }

    const [courseId, departmentId, levelId] = ids;

    // ============================================================
    // التأكد من البيانات السابقة
    // ============================================================

    if (
      event.data?.courseId !== courseId ||
      event.data?.departmentId !== departmentId
    ) {
      await ctx.reply(
        '❌ بيانات العملية غير صحيحة.\n\n' + 'يرجى بدء العملية من جديد.',
      );

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // التأكد من وجود المستوى
    // ============================================================

    const level = await this.academicService.getLevelById(levelId);

    if (!level) {
      await ctx.reply('❌ المستوى المطلوب غير موجود.');

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // التحقق من الـ Track
    //
    // إذا كان للقسم Tracks وكان المستوى 3 أو 4
    // نطلب من المستخدم اختيار Track.
    //
    // غير ذلك ننتقل مباشرة إلى Term.
    // ============================================================

    const tracks =
      await this.academicService.getTracksByDepartmentId(departmentId);

    const requiresTrack =
      (level.number === 3 || level.number === 4) && tracks.length > 0;

    // ============================================================
    // يحتاج Track
    // ============================================================

    if (requiresTrack) {
      this.botEventService.update(userId, {
        event: BotEventType.WAITING_COURSE_OFFERING_TRACK,
        data: {
          courseId,
          departmentId,
          levelId,
        },
      });

      await ctx.reply(
        '🎓 <b>' +
          `${this.escapeHtml(level.name)}` +
          '</b>\n\n' +
          '🛤️ اختر التراك:',
        {
          parse_mode: 'HTML',
          ...trackKeyboard(tracks, `ac/${courseId}/${departmentId}/${levelId}`),
        },
      );

      return;
    }

    // ============================================================
    // لا يحتاج Track
    // ============================================================

    const terms = await this.academicService.getTerms();

    if (!terms.length) {
      await ctx.reply('❌ لا توجد ترمات دراسية حاليًا.');

      this.botEventService.delete(userId);

      return;
    }

    this.botEventService.update(userId, {
      event: BotEventType.WAITING_COURSE_OFFERING_TERM,
      data: {
        courseId,
        departmentId,
        levelId,
        trackId: undefined,
      },
    });

    // ============================================================
    // عرض الترم
    //
    // ac/courseId/departmentId/levelId/termId
    // ============================================================

    await ctx.reply(
      '🎓 <b>' +
        `${this.escapeHtml(level.name)}` +
        '</b>\n\n' +
        '📖 اختر الترم:',
      {
        parse_mode: 'HTML',
        ...termKeyboard(terms, `ac/${courseId}/${departmentId}/${levelId}`),
      },
    );
  }

  // ============================================================
  // اختيار Track
  //
  // Callback:
  //
  // ac/courseId/departmentId/levelId/trackId
  //
  // مثال:
  // ac/12/2/3/1
  // ============================================================

  // ============================================================
  // Callback بأربعة IDs
  //
  // في حالة Track:
  // ac/courseId/departmentId/levelId/trackId
  //
  // في حالة بدون Track:
  // ac/courseId/departmentId/levelId/termId
  //
  // الفرق بينهما يتم تحديده من BotEventType
  // ============================================================

  @Action(/^ac\/(\d+)\/(\d+)\/(\d+)\/(\d+)$/)
  async handleFourIds(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    const event = this.botEventService.get(userId);

    if (!event) {
      await ctx.reply('ℹ️ انتهت عملية الإسناد.\n\nيرجى بدء العملية من جديد.');
      return;
    }

    const ids = this.getCallbackIds(ctx, 4);

    if (!ids) {
      return;
    }

    // ============================================================
    // الحالة الأولى:
    // المستخدم في مرحلة اختيار Track
    // ============================================================

    if (event.event === BotEventType.WAITING_COURSE_OFFERING_TRACK) {
      const [courseId, departmentId, levelId, trackId] = ids;

      // ----------------------------------------------------------
      // التأكد من البيانات السابقة
      // ----------------------------------------------------------

      if (
        event.data?.courseId !== courseId ||
        event.data?.departmentId !== departmentId ||
        event.data?.levelId !== levelId
      ) {
        await ctx.reply(
          '❌ بيانات العملية غير صحيحة.\n\nيرجى بدء العملية من جديد.',
        );

        this.botEventService.delete(userId);
        return;
      }

      // ----------------------------------------------------------
      // التأكد من المستوى
      // ----------------------------------------------------------

      const level = await this.academicService.getLevelById(levelId);

      if (!level) {
        await ctx.reply('❌ المستوى المطلوب غير موجود.');

        this.botEventService.delete(userId);
        return;
      }

      if (level.number !== 3 && level.number !== 4) {
        await ctx.reply('❌ هذا المستوى لا يحتوي على تراك.');

        this.botEventService.delete(userId);
        return;
      }

      // ----------------------------------------------------------
      // التأكد من Track
      // ----------------------------------------------------------

      const tracks =
        await this.academicService.getTracksByDepartmentId(departmentId);

      const track = tracks.find((item) => item.id === trackId);

      if (!track) {
        await ctx.reply('❌ التراك المطلوب غير تابع لهذا القسم.');

        this.botEventService.delete(userId);
        return;
      }

      // ----------------------------------------------------------
      // جلب الترمات
      // ----------------------------------------------------------

      const terms = await this.academicService.getTerms();

      if (!terms.length) {
        await ctx.reply('❌ لا توجد ترمات دراسية حاليًا.');

        this.botEventService.delete(userId);
        return;
      }

      // ----------------------------------------------------------
      // الانتقال إلى الترم
      // ----------------------------------------------------------

      this.botEventService.update(userId, {
        event: BotEventType.WAITING_COURSE_OFFERING_TERM,

        data: {
          courseId,
          departmentId,
          levelId,
          trackId,
        },
      });

      await ctx.reply(
        '🛤️ <b>' +
          `${this.escapeHtml(track.name)}` +
          '</b>\n\n' +
          '📖 اختر الترم:',
        {
          parse_mode: 'HTML',

          ...termKeyboard(
            terms,
            `ac/${courseId}/${departmentId}/${levelId}/${trackId}`,
          ),
        },
      );

      return;
    }

    // ============================================================
    // الحالة الثانية:
    // المستخدم في مرحلة اختيار الترم بدون Track
    // ============================================================

    if (event.event === BotEventType.WAITING_COURSE_OFFERING_TERM) {
      const [courseId, departmentId, levelId, termId] = ids;

      // ----------------------------------------------------------
      // التأكد من البيانات السابقة
      // ----------------------------------------------------------

      if (
        event.data?.courseId !== courseId ||
        event.data?.departmentId !== departmentId ||
        event.data?.levelId !== levelId
      ) {
        await ctx.reply(
          '❌ بيانات العملية غير صحيحة.\n\nيرجى بدء العملية من جديد.',
        );

        this.botEventService.delete(userId);
        return;
      }

      // ----------------------------------------------------------
      // يجب ألا يكون هناك Track
      // ----------------------------------------------------------

      if (event.data?.trackId !== undefined) {
        return;
      }

      // ----------------------------------------------------------
      // التأكد من الترم
      // ----------------------------------------------------------

      const term = await this.academicService.getTermById(termId);

      if (!term) {
        await ctx.reply('❌ الترم المطلوب غير موجود.');

        this.botEventService.delete(userId);
        return;
      }

      // ----------------------------------------------------------
      // جلب السنوات
      // ----------------------------------------------------------

      const years = await this.academicService.getAcademicYears();

      if (!years.length) {
        await ctx.reply('❌ لا توجد سنوات دراسية حاليًا.');

        this.botEventService.delete(userId);
        return;
      }

      // ----------------------------------------------------------
      // الانتقال إلى السنة
      // ----------------------------------------------------------

      this.botEventService.update(userId, {
        event: BotEventType.WAITING_COURSE_OFFERING_ACADEMIC_YEAR,

        data: {
          courseId,
          departmentId,
          levelId,
          termId,
          trackId: undefined,
        },
      });

      await ctx.reply(
        '📖 <b>' +
          `${this.escapeHtml(term.name)}` +
          '</b>\n\n' +
          '📅 اختر السنة الدراسية:',
        {
          parse_mode: 'HTML',

          ...academicYearKeyboard(
            years,
            `ac/${courseId}/${departmentId}/${levelId}/${termId}`,
          ),
        },
      );

      return;
    }
  }
  // ============================================================
  // اختيار الترم بدون Track
  //
  // Callback:
  //
  // ac/courseId/departmentId/levelId/termId
  //
  // مثال:
  // ac/12/2/1/1
  // ============================================================

  // ============================================================
  // اختيار الترم مع Track
  //
  // Callback:
  //
  // ac/courseId/departmentId/levelId/trackId/termId
  //
  // مثال:
  // ac/12/2/3/1/1
  // ============================================================

  // ============================================================
  // Callback بخمسة IDs
  //
  // بدون Track:
  // ac/courseId/departmentId/levelId/termId/yearId
  //
  // مع Track:
  // ac/courseId/departmentId/levelId/trackId/termId
  //
  // الفرق يتم تحديده من BotEventType
  // ============================================================

  @Action(/^ac\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)$/)
  async handleFiveIds(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    const event = this.botEventService.get(userId);

    if (!event) {
      return;
    }

    const ids = this.getCallbackIds(ctx, 5);

    if (!ids) {
      return;
    }

    // ============================================================
    // الحالة الأولى:
    // اختيار الترم مع Track
    //
    // ac/course/department/level/track/term
    // ============================================================

    if (event.event === BotEventType.WAITING_COURSE_OFFERING_TERM) {
      const [courseId, departmentId, levelId, trackId, termId] = ids;

      // ----------------------------------------------------------
      // التأكد من البيانات السابقة
      // ----------------------------------------------------------

      if (
        event.data?.courseId !== courseId ||
        event.data?.departmentId !== departmentId ||
        event.data?.levelId !== levelId ||
        event.data?.trackId !== trackId
      ) {
        return;
      }

      // ----------------------------------------------------------
      // التأكد من الترم
      // ----------------------------------------------------------

      const term = await this.academicService.getTermById(termId);

      if (!term) {
        await ctx.reply('❌ الترم المطلوب غير موجود.');

        this.botEventService.delete(userId);
        return;
      }

      // ----------------------------------------------------------
      // جلب السنوات
      // ----------------------------------------------------------

      const years = await this.academicService.getAcademicYears();

      if (!years.length) {
        await ctx.reply('❌ لا توجد سنوات دراسية حاليًا.');

        this.botEventService.delete(userId);
        return;
      }

      // ----------------------------------------------------------
      // الانتقال إلى السنة
      // ----------------------------------------------------------

      this.botEventService.update(userId, {
        event: BotEventType.WAITING_COURSE_OFFERING_ACADEMIC_YEAR,

        data: {
          courseId,
          departmentId,
          levelId,
          trackId,
          termId,
        },
      });

      await ctx.reply(
        '📖 <b>' +
          `${this.escapeHtml(term.name)}` +
          '</b>\n\n' +
          '📅 اختر السنة الدراسية:',
        {
          parse_mode: 'HTML',

          ...academicYearKeyboard(
            years,
            `ac/${courseId}/${departmentId}/${levelId}/${trackId}/${termId}`,
          ),
        },
      );

      return;
    }

    // ============================================================
    // الحالة الثانية:
    // اختيار السنة بدون Track
    //
    // ac/course/department/level/term/year
    // ============================================================

    if (event.event === BotEventType.WAITING_COURSE_OFFERING_ACADEMIC_YEAR) {
      const [courseId, departmentId, levelId, termId, academicYearId] = ids;

      // ----------------------------------------------------------
      // التأكد من البيانات السابقة
      // ----------------------------------------------------------

      if (
        event.data?.courseId !== courseId ||
        event.data?.departmentId !== departmentId ||
        event.data?.levelId !== levelId ||
        event.data?.termId !== termId
      ) {
        return;
      }

      // ----------------------------------------------------------
      // يجب ألا يكون هناك Track
      // ----------------------------------------------------------

      if (event.data?.trackId !== undefined) {
        return;
      }

      // ----------------------------------------------------------
      // إنهاء الإسناد
      // ----------------------------------------------------------

      await this.finishAssignment(ctx, userId, {
        courseId,
        departmentId,
        levelId,
        trackId: undefined,
        termId,
        academicYearId,
      });

      return;
    }
  }
  // ============================================================
  // اختيار السنة الدراسية بدون Track
  //
  // Callback:
  //
  // ac/courseId/departmentId/levelId/termId/academicYearId
  //
  // مثال:
  // ac/12/2/3/1/5
  // ============================================================

  // ============================================================
  // اختيار السنة الدراسية مع Track
  //
  // Callback:
  //
  // ac/courseId/departmentId/levelId/trackId/termId/academicYearId
  //
  // مثال:
  // ac/12/2/3/1/1/5
  // ============================================================

  @Action(/^ac\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)$/)
  async selectAcademicYearWithTrack(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    const event = this.botEventService.get(userId);

    if (!event) {
      return;
    }

    if (event.event !== BotEventType.WAITING_COURSE_OFFERING_ACADEMIC_YEAR) {
      return;
    }

    const ids = this.getCallbackIds(ctx, 6);

    if (!ids) {
      return;
    }

    const [courseId, departmentId, levelId, trackId, termId, academicYearId] =
      ids;

    // ============================================================
    // التأكد من البيانات السابقة
    // ============================================================

    if (
      event.data?.courseId !== courseId ||
      event.data?.departmentId !== departmentId ||
      event.data?.levelId !== levelId ||
      event.data?.trackId !== trackId ||
      event.data?.termId !== termId
    ) {
      return;
    }

    await this.finishAssignment(ctx, userId, {
      courseId,
      departmentId,
      levelId,
      trackId,
      termId,
      academicYearId,
    });
  }

  @Action('ac/next')
  async nextCourses(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    const event = this.botEventService.get(userId);

    if (!event) {
      await ctx.reply(
        'ℹ️ انتهت عملية الإسناد.\n\n' + 'يرجى بدء العملية من جديد.',
      );

      return;
    }

    if (event.event !== BotEventType.WAITING_COURSE_OFFERING_COURSE) {
      return;
    }

    const currentPage = Number(event.data?.page ?? 1);
    const nextPage = currentPage + 1;

    const limit = 8;

    const result = await this.courseService.getCoursesPaginated(
      nextPage,
      limit,
    );

    if (!result.courses.length) {
      return;
    }

    this.botEventService.update(userId, {
      data: {
        page: result.page,
      },
    });

    await ctx.editMessageReplyMarkup(
      courseKeyboard(result.courses, 'ac', result.page, result.totalPages)
        .reply_markup,
    );
  }

  @Action('ac/prev')
  async previousCourses(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    const event = this.botEventService.get(userId);

    if (!event) {
      await ctx.reply(
        'ℹ️ انتهت عملية الإسناد.\n\n' + 'يرجى بدء العملية من جديد.',
      );

      return;
    }

    if (event.event !== BotEventType.WAITING_COURSE_OFFERING_COURSE) {
      return;
    }

    const currentPage = Number(event.data?.page ?? 1);

    if (currentPage <= 1) {
      return;
    }

    const previousPage = currentPage - 1;

    const limit = 8;

    const result = await this.courseService.getCoursesPaginated(
      previousPage,
      limit,
    );

    if (!result.courses.length) {
      return;
    }

    this.botEventService.update(userId, {
      data: {
        page: result.page,
      },
    });

    await ctx.editMessageReplyMarkup(
      courseKeyboard(result.courses, 'ac', result.page, result.totalPages)
        .reply_markup,
    );
  }

  // ============================================================
  // إنشاء CourseOffering
  // ============================================================

  private async finishAssignment(
    ctx: Context,
    userId: number,
    data: {
      courseId: number;
      departmentId: number;
      levelId: number;
      trackId?: number;
      termId: number;
      academicYearId: number;
    },
  ): Promise<void> {
    // ============================================================
    // التحقق من جميع البيانات
    // ============================================================

    const course = await this.courseService.getCourseById(data.courseId);

    const department = await this.academicService.getDepartmentById(
      data.departmentId,
    );

    const level = await this.academicService.getLevelById(data.levelId);

    const term = await this.academicService.getTermById(data.termId);

    const academicYear = await this.academicService.getAcademicYearById(
      data.academicYearId,
    );

    if (!course || !department || !level || !term || !academicYear) {
      await ctx.reply(
        '❌ تعذر التحقق من بيانات الإسناد.\n\n' + 'يرجى بدء العملية من جديد.',
      );

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // إذا كان هناك Track نتأكد أنه تابع للقسم
    // ============================================================

    let track:
      | {
          id: number;
          name: string;
        }
      | undefined;

    if (data.trackId !== undefined) {
      const tracks = await this.academicService.getTracksByDepartmentId(
        data.departmentId,
      );

      track = tracks.find((item) => item.id === data.trackId);

      if (!track) {
        await ctx.reply('❌ التراك المحدد غير تابع لهذا القسم.');

        this.botEventService.delete(userId);

        return;
      }
    }

    // ============================================================
    // منع التكرار
    // ============================================================

    const existing = await this.academicService.findCourseOffering({
      courseId: data.courseId,
      departmentId: data.departmentId,
      trackId: data.trackId,
      levelId: data.levelId,
      termId: data.termId,
      academicYearId: data.academicYearId,
    });

    if (existing) {
      await ctx.reply(
        '⚠️ <b>الكورس مسند مسبقًا</b>\n\n' +
          `📚 الكورس: <b>${this.escapeHtml(course.name)}</b>\n` +
          `🏫 القسم: <b>${this.escapeHtml(department.name)}</b>\n` +
          `🎓 المستوى: <b>${this.escapeHtml(level.name)}</b>\n` +
          (track ? `🛤️ التراك: <b>${this.escapeHtml(track.name)}</b>\n` : '') +
          `📖 الترم: <b>${this.escapeHtml(term.name)}</b>\n` +
          `📅 السنة: <b>${academicYear.startYear} - ${academicYear.endYear}</b>`,
        {
          parse_mode: 'HTML',
        },
      );

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // إنشاء CourseOffering
    // ============================================================

    const offering = await this.academicService.createCourseOffering({
      courseId: data.courseId,
      departmentId: data.departmentId,
      trackId: data.trackId,
      levelId: data.levelId,
      termId: data.termId,
      academicYearId: data.academicYearId,
    });

    // ============================================================
    // انتهاء العملية
    // ============================================================

    this.botEventService.delete(userId);

    // ============================================================
    // النتيجة
    // ============================================================

    await ctx.reply(
      '✅ <b>تم إسناد الكورس بنجاح</b>\n\n' +
        `📚 الكورس: <b>${this.escapeHtml(course.name)}</b>\n` +
        `🏫 القسم: <b>${this.escapeHtml(department.name)}</b>\n` +
        `🎓 المستوى: <b>${this.escapeHtml(level.name)}</b>\n` +
        (track ? `🛤️ التراك: <b>${this.escapeHtml(track.name)}</b>\n` : '') +
        `📖 الترم: <b>${this.escapeHtml(term.name)}</b>\n` +
        `📅 السنة الدراسية: <b>${academicYear.startYear} - ${academicYear.endYear}</b>\n\n` +
        `🆔 Offering ID: <code>${offering.id}</code>`,
      {
        parse_mode: 'HTML',
      },
    );
  }

  // ============================================================
  // استخراج ID واحد من Callback
  // ============================================================

  private getCallbackId(ctx: Context): number | null {
    const match = this.getCallbackMatch(ctx);

    if (!match || match.length !== 2) {
      return null;
    }

    const id = Number(match[1]);

    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }

    return id;
  }

  // ============================================================
  // استخراج عدة IDs من Callback
  // ============================================================

  private getCallbackIds(ctx: Context, expectedCount: number): number[] | null {
    const match = this.getCallbackMatch(ctx);

    if (!match || match.length !== expectedCount + 1) {
      return null;
    }

    const ids = match.slice(1).map((value) => Number(value));

    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
      return null;
    }

    return ids;
  }

  // ============================================================
  // الحصول على Regex Match
  // ============================================================

  private getCallbackMatch(ctx: Context): RegExpExecArray | null {
    const callbackQuery = ctx.callbackQuery;

    if (!callbackQuery || !('data' in callbackQuery)) {
      return null;
    }

    const data = callbackQuery.data;

    // ============================================================
    // نحدد الـ pattern حسب عدد أجزاء callback
    // ============================================================

    const parts = data.split('/');

    if (parts[0] !== 'ac') {
      return null;
    }

    const ids = parts.slice(1);

    if (ids.length === 0 || ids.some((id) => !/^\d+$/.test(id))) {
      return null;
    }

    return [data, ...ids] as unknown as RegExpExecArray;
  }

  // ============================================================
  // Escape HTML
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
