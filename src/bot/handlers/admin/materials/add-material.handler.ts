/* eslint-disable @typescript-eslint/no-unused-vars */

import { Action, Ctx, Update } from 'nestjs-telegraf';

import { Injectable } from '@nestjs/common';

import { Context, Markup } from 'telegraf';

import { Prisma, ResourceType } from '@prisma/client';

import { AcademicService } from 'src/academic/services/academic.services';

import { BotEventService } from 'src/bot/services/bot-event.service';

import { BotEventType } from 'src/bot/services/bot-event.service';

import { BotEventConflictHandler } from '../../common/bot-event-conflict.handler';

import { MaterialService } from 'src/material/services/material.service';

import { BotEventConflictService } from 'src/bot/services/bot-conflict.service';

// ============================================================
// Types
// ============================================================

type CourseOfferingWithRelations = Prisma.CourseOfferingGetPayload<{
  include: {
    course: true;
    academicYear: true;
  };
}>;

// ============================================================
// Handler
// ============================================================

@Injectable()
@Update()
export class AddMaterialHandler {
  // ============================================================
  // Storage Channel
  // ============================================================

  private readonly STORAGE_CHANNEL_ID = process.env.MATERIAL_STORAGE_CHANNEL_ID;

  // ============================================================
  // Constructor
  // ============================================================

  constructor(
    private readonly academicService: AcademicService,
    private readonly materialService: MaterialService,
    private readonly botEventService: BotEventService,
    private readonly botEventConflictService: BotEventConflictService,
  ) {}

  // ============================================================
  // Main Callback Router
  // ============================================================

  @Action(/^am(?:\/.*)?$/)
  async handleAction(@Ctx() ctx: Context) {
    const callbackQuery = ctx.callbackQuery;

    if (!callbackQuery || !('data' in callbackQuery)) {
      return;
    }

    const callbackData = callbackQuery.data;

    if (typeof callbackData !== 'string') {
      return;
    }

    const parts = callbackData.split('/');

    if (parts[0] !== 'am') {
      return;
    }

    await ctx.answerCbQuery();

    // ==========================================================
    // Reuse
    // ==========================================================

    if (parts.length === 3 && parts[1] === 'reuse') {
      await this.handleReuse(ctx, parts[2]);
      return;
    }

    // ==========================================================
    // am
    // ==========================================================

    if (parts.length === 1) {
      await this.start(ctx);
      return;
    }

    // ==========================================================
    // am/departmentId
    // ==========================================================

    if (parts.length === 2) {
      const departmentId = Number(parts[1]);

      if (!Number.isInteger(departmentId)) {
        await ctx.reply('❌ <b>التخصص غير صحيح.</b>', { parse_mode: 'HTML' });
        return;
      }

      await this.handleDepartment(ctx, departmentId);
      return;
    }

    // ==========================================================
    // am/departmentId/levelId
    // ==========================================================

    if (parts.length === 3) {
      const departmentId = Number(parts[1]);
      const levelId = Number(parts[2]);

      if (!Number.isInteger(departmentId) || !Number.isInteger(levelId)) {
        await ctx.reply('❌ <b>البيانات غير صحيحة.</b>', {
          parse_mode: 'HTML',
        });
        return;
      }

      await this.handleLevel(ctx, departmentId, levelId);
      return;
    }

    // ==========================================================
    // am/departmentId/levelId/termId
    // ==========================================================

    if (parts.length === 4) {
      const departmentId = Number(parts[1]);
      const levelId = Number(parts[2]);
      const termId = Number(parts[3]);

      if (
        !Number.isInteger(departmentId) ||
        !Number.isInteger(levelId) ||
        !Number.isInteger(termId)
      ) {
        await ctx.reply('❌ <b>البيانات غير صحيحة.</b>', {
          parse_mode: 'HTML',
        });
        return;
      }

      await this.handleTermSelection(ctx, departmentId, levelId, termId);

      return;
    }

    // ==========================================================
    // am/departmentId/levelId/termId/trackId
    // ==========================================================

    if (parts.length === 5) {
      const departmentId = Number(parts[1]);
      const levelId = Number(parts[2]);
      const termId = Number(parts[3]);
      const trackValue = parts[4];

      if (
        !Number.isInteger(departmentId) ||
        !Number.isInteger(levelId) ||
        !Number.isInteger(termId)
      ) {
        await ctx.reply('❌ <b>البيانات غير صحيحة.</b>', {
          parse_mode: 'HTML',
        });
        return;
      }

      await this.handleTermWithTrack(
        ctx,
        departmentId,
        levelId,
        termId,
        trackValue,
      );

      return;
    }

    // ==========================================================
    // am/.../courseId
    // ==========================================================

    if (parts.length === 6) {
      const departmentId = Number(parts[1]);
      const levelId = Number(parts[2]);
      const termId = Number(parts[3]);
      const trackValue = parts[4];
      const courseId = Number(parts[5]);

      if (
        !Number.isInteger(departmentId) ||
        !Number.isInteger(levelId) ||
        !Number.isInteger(termId) ||
        !Number.isInteger(courseId)
      ) {
        await ctx.reply('❌ <b>البيانات غير صحيحة.</b>', {
          parse_mode: 'HTML',
        });
        return;
      }

      await this.handleCourse(
        ctx,
        departmentId,
        levelId,
        termId,
        trackValue,
        courseId,
      );

      return;
    }

    // ==========================================================
    // am/.../courseId/academicYearId
    // ==========================================================

    if (parts.length === 7) {
      const departmentId = Number(parts[1]);
      const levelId = Number(parts[2]);
      const termId = Number(parts[3]);
      const trackValue = parts[4];
      const courseId = Number(parts[5]);
      const academicYearId = Number(parts[6]);

      if (
        !Number.isInteger(departmentId) ||
        !Number.isInteger(levelId) ||
        !Number.isInteger(termId) ||
        !Number.isInteger(courseId) ||
        !Number.isInteger(academicYearId)
      ) {
        await ctx.reply('❌ <b>البيانات غير صحيحة.</b>', {
          parse_mode: 'HTML',
        });
        return;
      }

      await this.handleAcademicYear(
        ctx,
        departmentId,
        levelId,
        termId,
        trackValue,
        courseId,
        academicYearId,
      );

      return;
    }

    // ==========================================================
    // am/.../academicYearId/T
    // am/.../academicYearId/P
    // ==========================================================

    if (parts.length === 8) {
      const departmentId = Number(parts[1]);
      const levelId = Number(parts[2]);
      const termId = Number(parts[3]);
      const trackValue = parts[4];
      const courseId = Number(parts[5]);
      const academicYearId = Number(parts[6]);
      const typeValue = parts[7];

      if (
        !Number.isInteger(departmentId) ||
        !Number.isInteger(levelId) ||
        !Number.isInteger(termId) ||
        !Number.isInteger(courseId) ||
        !Number.isInteger(academicYearId)
      ) {
        await ctx.reply('❌ <b>البيانات غير صحيحة.</b>', {
          parse_mode: 'HTML',
        });
        return;
      }

      await this.handleType(
        ctx,
        departmentId,
        levelId,
        termId,
        trackValue,
        courseId,
        academicYearId,
        typeValue,
      );

      return;
    }

    await ctx.reply('❌ <b>مسار العملية غير صحيح.</b>', { parse_mode: 'HTML' });
  }

  // ============================================================
  // Start
  // ============================================================

  async start(@Ctx() ctx: Context) {
    const userId = this.getUserId(ctx);

    const existingEvent = this.botEventService.get(userId);

    if (existingEvent) {
      await this.botEventConflictService.showConflict(ctx, existingEvent);

      return;
    }

    this.botEventService.set({
      userId,
      event: BotEventType.WAITING_MATERIAL_DEPARTMENT,
      messageId: this.getMessageId(ctx),
      chatId: String(ctx.chat?.id ?? ''),
      data: {},
    });

    await this.showDepartments(ctx);
  }

  // ============================================================
  // Departments
  // ============================================================

  private async showDepartments(ctx: Context) {
    const departments = await this.academicService.getDepartments();

    if (!departments.length) {
      await this.editOrReply(ctx, '❌ <b>لا توجد تخصصات متاحة حاليًا.</b>');

      this.deleteEvent(ctx);
      return;
    }

    await this.editOrReply(
      ctx,
      '🎓 <b>إضافة ملزمة جديدة</b>\n\n' + 'اختر التخصص:',
      Markup.inlineKeyboard(
        departments.map((department) => [
          Markup.button.callback(department.name, `am/${department.id}`),
        ]),
      ),
    );
  }

  // ============================================================
  // Department
  // ============================================================

  private async handleDepartment(ctx: Context, departmentId: number) {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    if (!department) {
      await this.editOrReply(ctx, '❌ <b>التخصص غير موجود.</b>');
      return;
    }

    this.botEventService.update(this.getUserId(ctx), {
      event: BotEventType.WAITING_MATERIAL_LEVEL,
      data: {
        departmentId,
      },
    });

    await this.showLevels(ctx);
  }

  // ============================================================
  // Levels
  // ============================================================

  private async showLevels(ctx: Context) {
    const levels = await this.academicService.getLevels();

    if (!levels.length) {
      await this.editOrReply(ctx, '❌ <b>لا توجد مستويات متاحة حاليًا.</b>');
      return;
    }

    const event = this.botEventService.get(this.getUserId(ctx));

    const departmentId = this.getNumber(event?.data?.departmentId);

    await this.editOrReply(
      ctx,
      '📚 <b>اختيار المستوى</b>\n\n' + 'اختر المستوى المطلوب:',
      Markup.inlineKeyboard(
        levels.map((level) => [
          Markup.button.callback(level.name, `am/${departmentId}/${level.id}`),
        ]),
      ),
    );
  }

  // ============================================================
  // Level
  // ============================================================

  private async handleLevel(
    ctx: Context,
    departmentId: number,
    levelId: number,
  ) {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    if (!department || !level) {
      await this.editOrReply(ctx, '❌ <b>التخصص أو المستوى غير موجود.</b>');
      return;
    }

    const hasTrack =
      department.name === 'تقنية معلومات' &&
      (level.number === 3 || level.number === 4);

    if (hasTrack) {
      this.botEventService.update(this.getUserId(ctx), {
        event: BotEventType.WAITING_MATERIAL_TERM,
        data: {
          departmentId,
          levelId,
        },
      });

      await this.showTermsWithTrack(ctx, departmentId, levelId);

      return;
    }

    this.botEventService.update(this.getUserId(ctx), {
      event: BotEventType.WAITING_MATERIAL_TERM,
      data: {
        departmentId,
        levelId,
      },
    });

    await this.showTermsWithoutTrack(ctx, departmentId, levelId);
  }

  // ============================================================
  // Terms - With Track
  // ============================================================

  private async showTermsWithTrack(
    ctx: Context,
    departmentId: number,
    levelId: number,
  ) {
    const terms = await this.academicService.getTerms();

    if (!terms.length) {
      await this.editOrReply(ctx, '❌ <b>لا توجد أترام متاحة حاليًا.</b>');
      return;
    }

    await this.editOrReply(
      ctx,
      '📖 <b>اختيار الترم</b>\n\n' + 'اختر الترم المطلوب:',
      Markup.inlineKeyboard(
        terms.map((term) => [
          Markup.button.callback(
            term.name,
            `am/${departmentId}/${levelId}/${term.id}`,
          ),
        ]),
      ),
    );
  }

  // ============================================================
  // Terms - Without Track
  // ============================================================

  private async showTermsWithoutTrack(
    ctx: Context,
    departmentId: number,
    levelId: number,
  ) {
    const terms = await this.academicService.getTerms();

    if (!terms.length) {
      await this.editOrReply(ctx, '❌ <b>لا توجد أترام متاحة حاليًا.</b>');
      return;
    }

    await this.editOrReply(
      ctx,
      '📖 <b>اختيار الترم</b>\n\n' + 'اختر الترم المطلوب:',
      Markup.inlineKeyboard(
        terms.map((term) => [
          Markup.button.callback(
            term.name,
            `am/${departmentId}/${levelId}/${term.id}/none`,
          ),
        ]),
      ),
    );
  }

  // ============================================================
  // Term Selection
  // ============================================================

  private async handleTermSelection(
    ctx: Context,
    departmentId: number,
    levelId: number,
    termId: number,
  ) {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    const term = await this.academicService.getTermById(termId);

    if (!department || !level || !term) {
      await this.editOrReply(ctx, '❌ <b>بيانات الاختيار غير صحيحة.</b>');
      return;
    }

    const hasTrack =
      department.name === 'تقنية معلومات' &&
      (level.number === 3 || level.number === 4);

    if (!hasTrack) {
      await this.handleTermWithTrack(
        ctx,
        departmentId,
        levelId,
        termId,
        'none',
      );

      return;
    }

    const tracks =
      await this.academicService.getTracksByDepartmentId(departmentId);

    const buttons = tracks.map((track) => [
      Markup.button.callback(
        track.name,
        `am/${departmentId}/${levelId}/${termId}/${track.id}`,
      ),
    ]);

    buttons.push([
      Markup.button.callback(
        '➡️ بدون تراك',
        `am/${departmentId}/${levelId}/${termId}/none`,
      ),
    ]);

    this.botEventService.update(this.getUserId(ctx), {
      event: BotEventType.WAITING_MATERIAL_TRACK,
      data: {
        departmentId,
        levelId,
        termId,
      },
    });

    await this.editOrReply(
      ctx,
      '🎯 <b>اختيار التراك</b>\n\n' + 'اختر التراك المناسب:',
      Markup.inlineKeyboard(buttons),
    );
  }

  // ============================================================
  // Term + Track
  // ============================================================

  private async handleTermWithTrack(
    ctx: Context,
    departmentId: number,
    levelId: number,
    termId: number,
    trackValue: string,
  ) {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    const term = await this.academicService.getTermById(termId);

    if (!department || !level || !term) {
      await this.editOrReply(ctx, '❌ <b>بيانات الاختيار غير صحيحة.</b>');
      return;
    }

    let trackId: number | undefined;

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '❌ <b>التراك غير صحيح.</b>');
        return;
      }

      const track = await this.academicService.getTrackById(trackId);

      if (!track) {
        await this.editOrReply(ctx, '❌ <b>التراك غير موجود.</b>');
        return;
      }
    }

    const academicYears = await this.academicService.getAcademicYears();

    if (!academicYears.length) {
      await this.editOrReply(ctx, '❌ <b>لا توجد سنوات دراسية متاحة.</b>');
      return;
    }

    const offerings: CourseOfferingWithRelations[] = [];

    for (const academicYear of academicYears) {
      const yearOfferings = await this.academicService.getCourseOfferings({
        departmentId,
        trackId,
        levelId,
        termId,
        academicYearId: academicYear.id,
      });

      offerings.push(...yearOfferings);
    }

    if (!offerings.length) {
      await this.editOrReply(ctx, '❌ <b>لا توجد مواد لهذا الاختيار.</b>');
      return;
    }

    const uniqueCourses = new Map<number, CourseOfferingWithRelations>();

    for (const offering of offerings) {
      if (!uniqueCourses.has(offering.courseId)) {
        uniqueCourses.set(offering.courseId, offering);
      }
    }

    const courses = Array.from(uniqueCourses.values());

    this.botEventService.update(this.getUserId(ctx), {
      event: BotEventType.WAITING_MATERIAL_COURSE,
      data: {
        departmentId,
        levelId,
        termId,
        trackValue,
      },
    });

    await this.editOrReply(
      ctx,
      '📚 <b>اختيار المادة</b>\n\n' + 'اختر المادة التي تريد إضافة ملزمة لها:',
      Markup.inlineKeyboard(
        courses.map((offering) => [
          Markup.button.callback(
            offering.course.name,
            `am/${departmentId}/${levelId}/${termId}/${trackValue}/${offering.courseId}`,
          ),
        ]),
      ),
    );
  }

  // ============================================================
  // Course
  // ============================================================

  private async handleCourse(
    ctx: Context,
    departmentId: number,
    levelId: number,
    termId: number,
    trackValue: string,
    courseId: number,
  ) {
    let trackId: number | undefined;

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '❌ <b>التراك غير صحيح.</b>');
        return;
      }
    }

    const academicYears = await this.academicService.getAcademicYears();

    if (!academicYears.length) {
      await this.editOrReply(ctx, '❌ <b>لا توجد سنوات دراسية متاحة.</b>');
      return;
    }

    const availableYears: Array<{
      id: number;
      startYear: number;
      endYear: number;
    }> = [];

    for (const academicYear of academicYears) {
      const offering = await this.academicService.findCourseOffering({
        courseId,
        departmentId,
        levelId,
        termId,
        trackId,
        academicYearId: academicYear.id,
      });

      if (offering) {
        availableYears.push(academicYear);
      }
    }

    if (!availableYears.length) {
      await this.editOrReply(
        ctx,
        '❌ <b>لا توجد سنوات دراسية لهذه المادة.</b>',
      );
      return;
    }

    availableYears.sort((a, b) => b.startYear - a.startYear);

    this.botEventService.update(this.getUserId(ctx), {
      event: BotEventType.WAITING_MATERIAL_ACADEMIC_YEAR,
      data: {
        departmentId,
        levelId,
        termId,
        trackValue,
        courseId,
      },
    });

    await this.editOrReply(
      ctx,
      '📅 <b>اختيار السنة الدراسية</b>\n\n' +
        'اختر السنة التي ستُضاف إليها الملزمة:',
      Markup.inlineKeyboard(
        availableYears.map((year) => [
          Markup.button.callback(
            `${year.startYear} - ${year.endYear}`,
            `am/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${year.id}`,
          ),
        ]),
      ),
    );
  }

  // ============================================================
  // Academic Year
  // ============================================================

  private async handleAcademicYear(
    ctx: Context,
    departmentId: number,
    levelId: number,
    termId: number,
    trackValue: string,
    courseId: number,
    academicYearId: number,
  ) {
    let trackId: number | undefined;

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '❌ <b>التراك غير صحيح.</b>');
        return;
      }
    }

    const offering = await this.academicService.findCourseOffering({
      courseId,
      departmentId,
      levelId,
      termId,
      trackId,
      academicYearId,
    });

    if (!offering) {
      await this.editOrReply(
        ctx,
        '❌ <b>لا توجد هذه المادة في السنة المحددة.</b>',
      );
      return;
    }

    this.botEventService.update(this.getUserId(ctx), {
      event: BotEventType.WAITING_MATERIAL_TYPE,
      data: {
        departmentId,
        levelId,
        termId,
        trackValue,
        courseId,
        academicYearId,
        courseOfferingId: offering.id,
      },
    });

    await this.editOrReply(
      ctx,
      `📅 <b>السنة:</b> ${offering.academicYear.startYear} - ${offering.academicYear.endYear}\n\n` +
        '📚 <b>اختيار نوع الملزمة</b>\n\n' +
        'اختر نوع الملزمة:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            '📘 نظري',
            `am/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${academicYearId}/T`,
          ),
        ],
        [
          Markup.button.callback(
            '🧪 عملي',
            `am/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${academicYearId}/P`,
          ),
        ],
      ]),
    );
  }

  // ============================================================
  // Material Type
  // ============================================================

  private async handleType(
    ctx: Context,
    departmentId: number,
    levelId: number,
    termId: number,
    trackValue: string,
    courseId: number,
    academicYearId: number,
    typeValue: string,
  ) {
    let type: ResourceType;

    if (typeValue === 'T') {
      type = ResourceType.THEORY;
    } else if (typeValue === 'P') {
      type = ResourceType.PRACTICAL;
    } else {
      await this.editOrReply(ctx, '❌ <b>نوع الملزمة غير صحيح.</b>');
      return;
    }

    let trackId: number | undefined;

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '❌ <b>التراك غير صحيح.</b>');
        return;
      }
    }

    const offering = await this.academicService.findCourseOffering({
      courseId,
      departmentId,
      levelId,
      termId,
      trackId,
      academicYearId,
    });

    if (!offering) {
      await this.editOrReply(
        ctx,
        '❌ <b>لا توجد هذه المادة في السياق المحدد.</b>',
      );
      return;
    }

    this.botEventService.update(this.getUserId(ctx), {
      event: BotEventType.WAITING_MATERIAL_DOCUMENT,
      data: {
        departmentId,
        levelId,
        termId,
        trackValue,
        courseId,
        academicYearId,
        courseOfferingId: offering.id,
        type,
      },
    });

    await this.editOrReply(
      ctx,
      '📎 <b>رفع الملزمة</b>\n\n' + 'أرسل ملف الملزمة بصيغة <b>PDF</b>.',
    );
  }

  // ============================================================
  // Document
  // ============================================================

  async handleDocument(@Ctx() ctx: Context) {
    const userId = this.getUserId(ctx);

    const event = this.botEventService.get(userId);

    if (!event || event.event !== BotEventType.WAITING_MATERIAL_DOCUMENT) {
      return;
    }

    const message = ctx.message;

    if (!message || !('document' in message)) {
      return;
    }

    const document = message.document;

    const isPdf =
      document.mime_type === 'application/pdf' ||
      document.file_name?.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      await ctx.reply(
        '❌ <b>نوع الملف غير صحيح.</b>\n\n' +
          'يرجى إرسال الملزمة بصيغة <b>PDF</b>.',
        { parse_mode: 'HTML' },
      );
      return;
    }

    this.botEventService.update(userId, {
      event: BotEventType.WAITING_MATERIAL_TITLE,
      data: {
        ...(event.data ?? {}),
        telegramFileId: document.file_id,
        originalMessageId: message.message_id,
        caption: 'caption' in message ? message.caption : undefined,
      },
    });

    await ctx.reply(
      '✅ <b>تم استلام الملف.</b>\n\n' + '📝 أرسل <b>عنوان الملزمة</b>:',
      { parse_mode: 'HTML' },
    );
  }

  // ============================================================
  // Receive Title
  // ============================================================

  async receiveTitle(ctx: Context, title: string) {
    const userId = this.getUserId(ctx);

    const event = this.botEventService.get(userId);

    if (!event || event.event !== BotEventType.WAITING_MATERIAL_TITLE) {
      return;
    }

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      await ctx.reply('❌ <b>العنوان لا يمكن أن يكون فارغًا.</b>', {
        parse_mode: 'HTML',
      });
      return;
    }

    const courseOfferingId = this.getNumber(event.data?.courseOfferingId);

    const telegramFileId = this.getString(event.data?.telegramFileId);

    const originalMessageId = this.getNumber(event.data?.originalMessageId);

    const type = event.data?.type;

    if (
      !courseOfferingId ||
      !telegramFileId ||
      !originalMessageId ||
      !this.isResourceType(type)
    ) {
      await ctx.reply(
        '❌ <b>بيانات العملية غير مكتملة.</b>\n\n' +
          'يرجى بدء العملية من جديد.',
        { parse_mode: 'HTML' },
      );

      this.botEventService.delete(userId);
      return;
    }

    if (!this.STORAGE_CHANNEL_ID) {
      await ctx.reply('❌ <b>قناة تخزين الملازم غير معرفة.</b>', {
        parse_mode: 'HTML',
      });
      return;
    }
    let storageMessageId: number;

    try {
      const copiedMessage = await ctx.telegram.copyMessage(
        this.STORAGE_CHANNEL_ID,
        ctx.chat!.id,
        originalMessageId,
      );

      storageMessageId = copiedMessage.message_id;

      // وضع عنوان الملزمة كـ Caption في رسالة التخزين
      await ctx.telegram.editMessageCaption(
        this.STORAGE_CHANNEL_ID,
        storageMessageId,
        undefined,
        cleanTitle,
      );
    } catch (error) {
      console.error('Failed to copy material to storage channel:', error);

      await ctx.reply(
        '❌ <b>تعذر حفظ الملف في قناة التخزين.</b>\n\n' +
          'يرجى المحاولة مرة أخرى.',
        { parse_mode: 'HTML' },
      );

      return;
    }

    try {
      await this.materialService.createMaterial({
        courseOfferingId,
        title: cleanTitle,
        type,
        telegramChatId: this.STORAGE_CHANNEL_ID,
        telegramMessageId: storageMessageId,
        telegramFileId,
        caption: this.getString(event.data?.caption),
      });
    } catch (error) {
      console.error('Failed to create material:', error);

      await ctx.reply(
        '❌ <b>تم حفظ الملف في قناة التخزين،' +
          ' لكن حدث خطأ أثناء حفظ بيانات الملزمة.</b>',
        { parse_mode: 'HTML' },
      );

      return;
    }

    // ==========================================================
    // Success
    // ==========================================================

    this.botEventService.delete(userId);

    await ctx.reply(
      '✅ <b>تم رفع الملزمة بنجاح.</b>\n\n' +
        `📝 <b>العنوان:</b> ${this.escapeHtml(cleanTitle)}\n\n` +
        'يمكنك اختيار إجراء آخر:',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🏠 الرئيسية', 'main_menu')],
          [Markup.button.callback('➕ رفع ملزمة أخرى', 'am')],
        ]),
      },
    );
  }

  // ============================================================
  // Reuse
  // ============================================================

  private async handleReuse(ctx: Context, value: string) {
    const userId = this.getUserId(ctx);

    const event = this.botEventService.get(userId);

    if (!event || event.event !== BotEventType.WAITING_MATERIAL_REUSE) {
      await this.editOrReply(ctx, '⏰ <b>انتهت العملية.</b>');
      return;
    }

    if (value === 'no') {
      this.botEventService.delete(userId);

      await this.editOrReply(ctx, '✅ <b>تم إنهاء عملية رفع الملزمة.</b>');

      return;
    }

    if (value !== 'yes') {
      return;
    }

    this.botEventService.update(userId, {
      event: BotEventType.WAITING_MATERIAL_DEPARTMENT,
      data: {
        telegramFileId: event.data?.telegramFileId,
        telegramMessageId: event.data?.telegramMessageId,
        title: event.data?.title,
        type: event.data?.type,
      },
    });

    await this.editOrReply(
      ctx,
      '🔄 <b>رفع ملزمة أخرى</b>\n\n' + 'اختر التخصص الجديد:',
    );

    await this.showDepartments(ctx);
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async editOrReply(
    ctx: Context,
    text: string,
    keyboard?: ReturnType<typeof Markup.inlineKeyboard>,
  ) {
    try {
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...(keyboard ?? {}),
      });
    } catch {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        ...(keyboard ?? {}),
      });
    }
  }

  // ============================================================
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ============================================================
  private getUserId(ctx: Context): number {
    if (!ctx.from?.id) {
      throw new Error('Telegram user ID is missing');
    }

    return ctx.from.id;
  }

  // ============================================================
  private getMessageId(ctx: Context): number {
    const message = ctx.message;

    if (message && 'message_id' in message) {
      return message.message_id;
    }

    return 0;
  }

  // ============================================================
  private deleteEvent(ctx: Context): void {
    this.botEventService.delete(this.getUserId(ctx));
  }

  // ============================================================
  private getNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    throw new Error('Expected number');
  }

  // ============================================================
  private getString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    return undefined;
  }

  // ============================================================
  private isResourceType(value: unknown): value is ResourceType {
    return value === ResourceType.THEORY || value === ResourceType.PRACTICAL;
  }
}
