/* eslint-disable @typescript-eslint/no-unused-vars */

import { Injectable } from '@nestjs/common';

import { Ctx, Action, Update } from 'nestjs-telegraf';

import { Context, Markup } from 'telegraf';

import { Prisma, ResourceType } from '@prisma/client';

import { AcademicService } from 'src/academic/services/academic.services';

import {
  BotEventService,
  BotEventType,
} from 'src/bot/services/bot-event.service';

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

  @Action('am/cancel')
  async handleCancel(@Ctx() ctx: Context) {
    const userId = this.getUserId(ctx);

    this.botEventService.delete(userId);

    await ctx.answerCbQuery();

    await this.editOrReply(
      ctx,
      '<b>تم إلغاء العملية.</b>',
      Markup.inlineKeyboard([
        [Markup.button.callback('الرئيسية', 'main_menu')],
      ]),
    );
  }

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

    // =========================================================
    // REUSE
    // =========================================================

    if (parts.length === 3 && parts[1] === 'reuse') {
      await this.handleReuse(ctx, parts[2]);
      return;
    }

    // =========================================================
    // BACK TO TERMS
    // am/back/departmentId/levelId
    // =========================================================

    if (parts.length === 4 && parts[1] === 'back') {
      const departmentId = Number(parts[2]);
      const levelId = Number(parts[3]);

      if (!Number.isInteger(departmentId) || !Number.isInteger(levelId)) {
        await this.editOrReply(ctx, '<b>البيانات غير صحيحة.</b>');
        return;
      }

      await this.handleLevel(ctx, departmentId, levelId);
      return;
    }

    // =========================================================
    // START / DEPARTMENTS
    // =========================================================

    if (parts.length === 1) {
      const userId = this.getUserId(ctx);

      const existingEvent = this.botEventService.get(userId);

      if (existingEvent) {
        this.botEventService.update(userId, {
          event: BotEventType.WAITING_MATERIAL_DEPARTMENT,
          data: {
            ...(existingEvent.data ?? {}),
          },
        });

        await this.showDepartments(ctx);
        return;
      }

      await this.start(ctx);
      return;
    }

    // =========================================================
    // DEPARTMENT
    // am/departmentId
    // =========================================================

    if (parts.length === 2) {
      const departmentId = Number(parts[1]);

      if (!Number.isInteger(departmentId)) {
        await this.editOrReply(ctx, '<b>التخصص غير صحيح.</b>');
        return;
      }

      await this.handleDepartment(ctx, departmentId);
      return;
    }

    // =========================================================
    // LEVEL
    // am/departmentId/levelId
    // =========================================================

    if (parts.length === 3) {
      const departmentId = Number(parts[1]);
      const levelId = Number(parts[2]);

      if (!Number.isInteger(departmentId) || !Number.isInteger(levelId)) {
        await this.editOrReply(ctx, '<b>البيانات غير صحيحة.</b>');
        return;
      }

      await this.handleLevel(ctx, departmentId, levelId);
      return;
    }

    // =========================================================
    // TERM
    // am/departmentId/levelId/termId
    // =========================================================

    if (parts.length === 4) {
      const departmentId = Number(parts[1]);
      const levelId = Number(parts[2]);
      const termId = Number(parts[3]);

      if (
        !Number.isInteger(departmentId) ||
        !Number.isInteger(levelId) ||
        !Number.isInteger(termId)
      ) {
        await this.editOrReply(ctx, '<b>البيانات غير صحيحة.</b>');
        return;
      }

      await this.handleTermSelection(ctx, departmentId, levelId, termId);

      return;
    }

    // =========================================================
    // TRACK
    // am/departmentId/levelId/termId/trackValue
    // =========================================================

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
        await this.editOrReply(ctx, '<b>البيانات غير صحيحة.</b>');
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

    // =========================================================
    // COURSE
    // am/departmentId/levelId/termId/trackValue/courseId
    // =========================================================

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
        await this.editOrReply(ctx, '<b>البيانات غير صحيحة.</b>');
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

    // =========================================================
    // ACADEMIC YEAR
    // am/departmentId/levelId/termId/trackValue/courseId/academicYearId
    // =========================================================

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
        await this.editOrReply(ctx, '<b>البيانات غير صحيحة.</b>');
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

    // =========================================================
    // TYPE
    // am/departmentId/levelId/termId/trackValue/courseId/academicYearId/type
    // =========================================================

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
        await this.editOrReply(ctx, '<b>البيانات غير صحيحة.</b>');
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

    await this.editOrReply(ctx, '<b>مسار العملية غير صحيح.</b>');
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
      await this.editOrReply(
        ctx,
        '<b>لا توجد تخصصات متاحة حاليًا.</b>',
        Markup.inlineKeyboard([
          [Markup.button.callback('الرئيسية', 'main_menu')],
        ]),
      );

      this.deleteEvent(ctx);
      return;
    }

    const event = this.botEventService.get(this.getUserId(ctx));

    const isReuse = event?.data?.reuseMaterial === true;

    const text = isReuse
      ? '<b>إرسال نفس الملزمة</b>\n\n' +
        'اختر التخصص الذي تريد إرسال نفس الملزمة إليه.'
      : '<b>اختيار ملزمة</b>\n\n' +
        '<b>اختر التخصص</b>\n\n' +
        'اختر التخصص الذي ستضاف إليه الملزمة.';

    await this.editOrReply(
      ctx,
      text,
      Markup.inlineKeyboard([
        ...departments.map((department) => [
          Markup.button.callback(department.name, `am/${department.id}`),
        ]),
        [Markup.button.callback('السابق', 'main_menu')],
      ]),
    );
  }

  // ============================================================
  // Department
  // ============================================================

  private async handleDepartment(ctx: Context, departmentId: number) {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    if (!department) {
      await this.editOrReply(ctx, '<b>التخصص غير موجود.</b>');
      return;
    }

    const userId = this.getUserId(ctx);
    const event = this.botEventService.get(userId);

    this.botEventService.update(userId, {
      event: BotEventType.WAITING_MATERIAL_LEVEL,
      data: {
        ...(event?.data ?? {}),
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

    const event = this.botEventService.get(this.getUserId(ctx));

    const departmentId = this.getNumber(event?.data?.departmentId);

    const department =
      await this.academicService.getDepartmentById(departmentId);

    if (!department) {
      await this.editOrReply(ctx, '<b>التخصص غير موجود.</b>');
      return;
    }

    if (!levels.length) {
      await this.editOrReply(
        ctx,
        '<b>لا توجد مستويات متاحة حاليًا.</b>',
        Markup.inlineKeyboard([[Markup.button.callback('السابق', 'am')]]),
      );

      return;
    }

    const isReuse = event?.data?.reuseMaterial === true;

    const text = isReuse
      ? this.buildProgressText({
          title: 'إرسال نفس الملزمة',
          department: department.name,
          nextTitle: 'اختر المستوى',
          description: 'اختر المستوى الذي تريد إضافة نفس الملزمة إليه.',
        })
      : this.buildProgressText({
          title: 'اختيار ملزمة',
          department: department.name,
          nextTitle: 'اختر المستوى',
          description: 'اختر المستوى الذي تريد إضافة الملزمة إليه.',
        });

    await this.editOrReply(
      ctx,
      text,
      Markup.inlineKeyboard([
        ...levels.map((level) => [
          Markup.button.callback(level.name, `am/${departmentId}/${level.id}`),
        ]),
        [Markup.button.callback('السابق', 'am')],
      ]),
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
      await this.editOrReply(ctx, '<b>التخصص أو المستوى غير موجود.</b>');
      return;
    }

    const hasTrack =
      department.name === 'تقنية معلومات' &&
      (level.number === 3 || level.number === 4);

    const userId = this.getUserId(ctx);
    const event = this.botEventService.get(userId);

    this.botEventService.update(userId, {
      event: BotEventType.WAITING_MATERIAL_TERM,
      data: {
        ...(event?.data ?? {}),
        departmentId,
        levelId,
      },
    });

    if (hasTrack) {
      await this.showTermsWithTrack(ctx, departmentId, levelId);

      return;
    }

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

    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    if (!department || !level) {
      await this.editOrReply(ctx, '<b>التخصص أو المستوى غير موجود.</b>');
      return;
    }

    if (!terms.length) {
      await this.editOrReply(
        ctx,
        '<b>لا توجد أترام متاحة حاليًا.</b>',
        Markup.inlineKeyboard([
          [Markup.button.callback('السابق', `am/${departmentId}`)],
        ]),
      );

      return;
    }

    const text = this.buildProgressText({
      title: 'اختيار ملزمة',
      department: department.name,
      level: level.name,
      nextTitle: 'اختر الفصل',
      description: 'اختر الترم الذي تريد عرض مقرراته.',
    });

    await this.editOrReply(
      ctx,
      text,
      Markup.inlineKeyboard([
        ...terms.map((term) => [
          Markup.button.callback(
            term.name,
            `am/${departmentId}/${levelId}/${term.id}`,
          ),
        ]),
        [Markup.button.callback('السابق', `am/${departmentId}`)],
      ]),
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

    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    if (!department || !level) {
      await this.editOrReply(ctx, '<b>التخصص أو المستوى غير موجود.</b>');
      return;
    }

    if (!terms.length) {
      await this.editOrReply(
        ctx,
        '<b>لا توجد أترام متاحة حاليًا.</b>',
        Markup.inlineKeyboard([
          [Markup.button.callback('السابق', `am/${departmentId}`)],
        ]),
      );

      return;
    }

    const text = this.buildProgressText({
      title: 'اختيار ملزمة',
      department: department.name,
      level: level.name,
      nextTitle: 'اختر الفصل',
      description: 'اختر الترم الذي تريد عرض مقرراته.',
    });

    await this.editOrReply(
      ctx,
      text,
      Markup.inlineKeyboard([
        ...terms.map((term) => [
          Markup.button.callback(
            term.name,
            `am/${departmentId}/${levelId}/${term.id}/none`,
          ),
        ]),
        [Markup.button.callback('السابق', `am/${departmentId}`)],
      ]),
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
      await this.editOrReply(ctx, '<b>بيانات الاختيار غير صحيحة.</b>');

      return;
    }

    console.log('[AddMaterial] Track Check:', {
      departmentId,
      departmentName: department.name,
      levelId,
      levelNumber: level.number,
      termId,
    });

    const hasTrack =
      department.name === 'تقنية معلومات' &&
      (level.number === 3 || level.number === 4);

    // =========================================================
    // WITHOUT TRACK
    // =========================================================

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

    // =========================================================
    // WITH TRACK
    // =========================================================

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
        'بدون تراك',
        `am/${departmentId}/${levelId}/${termId}/none`,
      ),
    ]);

    buttons.push([
      Markup.button.callback('السابق', `am/${departmentId}/${levelId}`),
    ]);

    const event = this.botEventService.get(this.getUserId(ctx));

    this.botEventService.update(this.getUserId(ctx), {
      event: BotEventType.WAITING_MATERIAL_TRACK,

      data: {
        ...(event?.data ?? {}),
        departmentId,
        levelId,
        termId,
      },
    });

    const text = this.buildProgressText({
      title: 'اختيار ملزمة',
      department: department.name,
      level: level.name,
      term: term.name,
      nextTitle: 'اختر التراك',
      description: 'اختر التراك المناسب لإضافة الملزمة.',
    });

    await this.editOrReply(ctx, text, Markup.inlineKeyboard(buttons));
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
      await this.editOrReply(ctx, '<b>بيانات الاختيار غير صحيحة.</b>');

      return;
    }

    let trackId: number | undefined;
    let trackName: string | undefined;

    // =========================================================
    // TRACK
    // =========================================================

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '<b>التراك غير صحيح.</b>');

        return;
      }

      const track = await this.academicService.getTrackById(trackId);

      if (!track) {
        await this.editOrReply(ctx, '<b>التراك غير موجود.</b>');

        return;
      }

      trackName = track.name;
    }

    // =========================================================
    // ACADEMIC YEARS
    // =========================================================

    const academicYears = await this.academicService.getAcademicYears();

    if (!academicYears.length) {
      await this.editOrReply(
        ctx,
        '<b>لا توجد سنوات دراسية متاحة.</b>',
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              'السابق',
              trackValue === 'none'
                ? `am/back/${departmentId}/${levelId}`
                : `am/${departmentId}/${levelId}/${termId}`,
            ),
          ],
        ]),
      );

      return;
    }

    // =========================================================
    // GET OFFERINGS
    // =========================================================

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

    // =========================================================
    // NO COURSES
    // =========================================================

    if (!offerings.length) {
      await this.editOrReply(
        ctx,
        '<b>لا توجد مواد لهذا الاختيار.</b>',
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              'السابق',
              trackValue === 'none'
                ? `am/back/${departmentId}/${levelId}`
                : `am/${departmentId}/${levelId}/${termId}`,
            ),
          ],
        ]),
      );

      return;
    }

    // =========================================================
    // UNIQUE COURSES
    // =========================================================

    const uniqueCourses = new Map<number, CourseOfferingWithRelations>();

    for (const offering of offerings) {
      if (!uniqueCourses.has(offering.courseId)) {
        uniqueCourses.set(offering.courseId, offering);
      }
    }

    const courses = Array.from(uniqueCourses.values());

    // =========================================================
    // UPDATE EVENT
    // =========================================================

    const userId = this.getUserId(ctx);

    const event = this.botEventService.get(userId);

    this.botEventService.update(userId, {
      event: BotEventType.WAITING_MATERIAL_COURSE,

      data: {
        ...(event?.data ?? {}),
        departmentId,
        levelId,
        termId,
        trackValue,
      },
    });

    // =========================================================
    // TEXT
    // =========================================================

    const text = this.buildProgressText({
      title: 'اختيار ملزمة',
      department: department.name,
      level: level.name,
      term: term.name,
      track: trackName,
      nextTitle: 'اختر المادة',
      description: 'اختر المادة التي تريد إضافة الملزمة لها.',
    });

    // =========================================================
    // PREVIOUS BUTTON
    // =========================================================

    const previousCallback =
      trackValue === 'none'
        ? `am/back/${departmentId}/${levelId}`
        : `am/${departmentId}/${levelId}/${termId}`;

    // =========================================================
    // RENDER
    // =========================================================

    await this.editOrReply(
      ctx,
      text,
      Markup.inlineKeyboard([
        ...courses.map((offering) => [
          Markup.button.callback(
            offering.course.name,
            `am/${departmentId}/${levelId}/${termId}/${trackValue}/${offering.courseId}`,
          ),
        ]),

        [Markup.button.callback('السابق', previousCallback)],
      ]),
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
    let trackName: string | undefined;

    // =========================================================
    // TRACK
    // =========================================================

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '<b>التراك غير صحيح.</b>');
        return;
      }

      const track = await this.academicService.getTrackById(trackId);

      if (!track) {
        await this.editOrReply(ctx, '<b>التراك غير موجود.</b>');
        return;
      }

      trackName = track.name;
    }

    // =========================================================
    // GET DATA
    // =========================================================

    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    const term = await this.academicService.getTermById(termId);

    if (!department || !level || !term) {
      await this.editOrReply(ctx, '<b>بيانات الاختيار غير صحيحة.</b>');
      return;
    }

    // =========================================================
    // ACADEMIC YEARS
    // =========================================================

    const academicYears = await this.academicService.getAcademicYears();

    if (!academicYears.length) {
      await this.editOrReply(
        ctx,
        '<b>لا توجد سنوات دراسية متاحة.</b>',
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              'السابق',
              `am/${departmentId}/${levelId}/${termId}/${trackValue}`,
            ),
          ],
        ]),
      );

      return;
    }

    // =========================================================
    // FIND AVAILABLE YEARS
    // =========================================================

    const availableYears: Array<{
      id: number;
      startYear: number;
      endYear: number;
    }> = [];

    let courseName = '';

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

        if (!courseName) {
          courseName = offering.course.name;
        }
      }
    }

    // =========================================================
    // NO AVAILABLE YEARS
    // =========================================================

    if (!availableYears.length) {
      await this.editOrReply(
        ctx,
        '<b>لا توجد سنوات دراسية لهذه المادة.</b>',
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              'السابق',
              `am/${departmentId}/${levelId}/${termId}/${trackValue}`,
            ),
          ],
        ]),
      );

      return;
    }

    // =========================================================
    // SORT YEARS
    // =========================================================

    availableYears.sort((a, b) => b.startYear - a.startYear);

    // =========================================================
    // UPDATE EVENT
    // =========================================================

    const userId = this.getUserId(ctx);

    const event = this.botEventService.get(userId);

    this.botEventService.update(userId, {
      event: BotEventType.WAITING_MATERIAL_ACADEMIC_YEAR,

      data: {
        ...(event?.data ?? {}),
        departmentId,
        levelId,
        termId,
        trackValue,
        courseId,
      },
    });

    // =========================================================
    // TEXT
    // =========================================================

    const text = this.buildProgressText({
      title: 'اختيار ملزمة',
      department: department.name,
      level: level.name,
      term: term.name,
      track: trackName,
      course: courseName,
      nextTitle: 'اختر السنة الدراسية',
      description: 'اختر السنة التي ستضاف إليها الملزمة.',
    });

    // =========================================================
    // PREVIOUS
    // =========================================================

    const previousCallback = `am/${departmentId}/${levelId}/${termId}/${trackValue}`;

    // =========================================================
    // RENDER
    // =========================================================

    await this.editOrReply(
      ctx,
      text,
      Markup.inlineKeyboard([
        ...availableYears.map((year) => [
          Markup.button.callback(
            `${year.startYear} - ${year.endYear}`,
            `am/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${year.id}`,
          ),
        ]),

        [Markup.button.callback('السابق', previousCallback)],
      ]),
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

    let trackName: string | undefined;

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '<b>التراك غير صحيح.</b>');
        return;
      }

      const track = await this.academicService.getTrackById(trackId);

      if (!track) {
        await this.editOrReply(ctx, '<b>التراك غير موجود.</b>');
        return;
      }

      trackName = track.name;
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
        '<b>لا توجد هذه المادة في السنة المحددة.</b>',
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              'السابق',
              `am/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}`,
            ),
          ],
        ]),
      );

      return;
    }

    const userId = this.getUserId(ctx);

    const event = this.botEventService.get(userId);

    // ==========================================================
    // IMPORTANT
    // Only WAITING_MATERIAL_REUSE is reuse.
    // Do NOT check storageMessageId alone.
    // ==========================================================

    const isReuse = event?.data?.reuseMaterial === true;

    // ==========================================================
    // Reuse Existing Material
    // ==========================================================

    if (isReuse) {
      const reuseType = event?.data?.type;

      if (!this.isResourceType(reuseType)) {
        await this.editOrReply(
          ctx,
          '<b>نوع الملزمة الأصلية غير موجود.</b>\n\n' +
            'يرجى بدء العملية من جديد.',
        );

        this.botEventService.delete(userId);
        return;
      }

      this.botEventService.update(userId, {
        event: BotEventType.WAITING_MATERIAL_REUSE,

        data: {
          ...(event?.data ?? {}),

          departmentId,
          levelId,
          termId,
          trackValue,
          courseId,
          academicYearId,

          courseOfferingId: offering.id,

          type: reuseType,

          reuseMaterial: true,
        },
      });

      await this.createReusedMaterial(
        ctx,
        offering.id,
        reuseType,
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
    // Normal Material Upload
    // ==========================================================

    this.botEventService.update(userId, {
      event: BotEventType.WAITING_MATERIAL_TYPE,

      data: {
        ...(event?.data ?? {}),

        departmentId,
        levelId,
        termId,
        trackValue,
        courseId,
        academicYearId,

        courseOfferingId: offering.id,

        // Important:
        // This is a new material.
        reuseMaterial: false,
      },
    });

    const text = this.buildProgressText({
      title: 'اختيار ملزمة',
      department: (await this.academicService.getDepartmentById(departmentId))
        ?.name,
      level: (await this.academicService.getLevelById(levelId))?.name,
      term: (await this.academicService.getTermById(termId))?.name,
      track: trackName,
      course: offering.course.name,
      academicYear: `${offering.academicYear.startYear} - ${offering.academicYear.endYear}`,
      nextTitle: 'اختر نوع الملزمة',
      description: 'اختر نوع الملزمة التي تريد رفعها.',
    });

    await this.editOrReply(
      ctx,
      text,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            'نظري',
            `am/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${academicYearId}/T`,
          ),
        ],
        [
          Markup.button.callback(
            'عملي',
            `am/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${academicYearId}/P`,
          ),
        ],
        [
          Markup.button.callback(
            'السابق',
            `am/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}`,
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
      await this.editOrReply(ctx, '<b>نوع الملزمة غير صحيح.</b>');
      return;
    }

    let trackId: number | undefined;

    let trackName: string | undefined;

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '<b>التراك غير صحيح.</b>');
        return;
      }

      const track = await this.academicService.getTrackById(trackId);

      if (!track) {
        await this.editOrReply(ctx, '<b>التراك غير موجود.</b>');
        return;
      }

      trackName = track.name;
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
        '<b>لا توجد هذه المادة في السياق المحدد.</b>',
      );
      return;
    }

    const event = this.botEventService.get(this.getUserId(ctx));

    const isReuse =
      event?.data?.reuseMaterial === true &&
      this.getNumberOrUndefined(event?.data?.storageMessageId) !== undefined;

    // ==========================================================
    // Reuse Existing Material
    // ==========================================================

    if (isReuse) {
      await this.createReusedMaterial(
        ctx,
        offering.id,
        type,
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
    // Normal Upload
    // ==========================================================

    this.botEventService.update(this.getUserId(ctx), {
      event: BotEventType.WAITING_MATERIAL_DOCUMENT,

      data: {
        ...(event?.data ?? {}),

        departmentId,
        levelId,
        termId,
        trackValue,
        courseId,
        academicYearId,

        courseOfferingId: offering.id,

        type,

        reuseMaterial: false,
      },
    });

    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    const term = await this.academicService.getTermById(termId);

    const typeName = type === ResourceType.THEORY ? 'نظري' : 'عملي';

    const text = this.buildProgressText({
      title: 'اختيار ملزمة',
      department: department?.name,
      level: level?.name,
      term: term?.name,
      track: trackName,
      course: offering.course.name,
      academicYear: `${offering.academicYear.startYear} - ${offering.academicYear.endYear}`,
      nextTitle: 'رفع الملزمة',
      description:
        `نوع الملزمة: <b>${typeName}</b>\n\n` +
        'أرسل ملف الملزمة بصيغة <b>PDF</b>.',
    });

    await this.editOrReply(
      ctx,
      text,
      Markup.inlineKeyboard([[Markup.button.callback('إلغاء', 'am/cancel')]]),
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
        '<b>نوع الملف غير صحيح.</b>\n\n' +
          'يرجى إرسال الملزمة بصيغة <b>PDF</b>.',
        {
          parse_mode: 'HTML',
        },
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
      '<b>تم استلام الملف.</b>\n\n' + 'أرسل <b>عنوان الملزمة</b>:',
      {
        parse_mode: 'HTML',
      },
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
      await ctx.reply('<b>العنوان لا يمكن أن يكون فارغًا.</b>', {
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
        '<b>بيانات العملية غير مكتملة.</b>\n\n' + 'يرجى بدء العملية من جديد.',
        {
          parse_mode: 'HTML',
        },
      );

      this.botEventService.delete(userId);
      return;
    }

    if (!this.STORAGE_CHANNEL_ID) {
      await ctx.reply('<b>قناة تخزين الملازم غير معرفة.</b>', {
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

      await ctx.telegram.editMessageCaption(
        this.STORAGE_CHANNEL_ID,
        storageMessageId,
        undefined,
        cleanTitle,
      );
    } catch (error) {
      console.error('Failed to copy material to storage channel:', error);

      await ctx.reply(
        '<b>تعذر حفظ الملف في قناة التخزين.</b>\n\n' +
          'يرجى المحاولة مرة أخرى.',
        {
          parse_mode: 'HTML',
        },
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
        '<b>تم حفظ الملف في قناة التخزين، لكن حدث خطأ أثناء حفظ بيانات الملزمة.</b>',
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    // ==========================================================
    // Save Reuse Data
    // ==========================================================

    this.botEventService.update(userId, {
      event: BotEventType.WAITING_MATERIAL_REUSE,

      data: {
        telegramFileId,

        telegramMessageId: storageMessageId,

        storageMessageId,

        telegramChatId: this.STORAGE_CHANNEL_ID,

        title: cleanTitle,

        type,

        caption: this.getString(event.data?.caption),

        originalDepartmentId: event.data?.departmentId,

        originalLevelId: event.data?.levelId,

        originalTermId: event.data?.termId,

        originalTrackValue: event.data?.trackValue,

        originalCourseId: event.data?.courseId,

        originalAcademicYearId: event.data?.academicYearId,

        originalCourseOfferingId: event.data?.courseOfferingId,

        reuseMaterial: true,
      },
    });

    // ==========================================================
    // Success
    // ==========================================================

    await ctx.reply(
      '<b>تم رفع الملزمة بنجاح.</b>\n\n' +
        `<b>العنوان:</b> ${this.escapeHtml(cleanTitle)}\n\n` +
        'اختر الإجراء التالي:',
      {
        parse_mode: 'HTML',

        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              'إرسال نفس الملزمة لتخصص آخر',
              'am/reuse/other',
            ),
          ],

          [
            Markup.button.callback(
              'إرسال ملزمة جديدة لنفس التخصص',
              'am/reuse/new-same',
            ),
          ],

          [Markup.button.callback('الرئيسية', 'main_menu')],
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
      await this.editOrReply(ctx, '<b>انتهت عملية إعادة الاستخدام.</b>');

      return;
    }

    // ==========================================================
    // Same material -> Other Department
    // ==========================================================

    if (value === 'other') {
      const storageMessageId = this.getNumberOrUndefined(
        event.data?.storageMessageId,
      );

      const telegramFileId = this.getString(event.data?.telegramFileId);

      const telegramChatId = this.getString(event.data?.telegramChatId);

      const title = this.getString(event.data?.title);

      const type = event.data?.type;

      if (
        storageMessageId === undefined ||
        !telegramFileId ||
        !telegramChatId ||
        !title ||
        !this.isResourceType(type)
      ) {
        await this.editOrReply(
          ctx,
          '<b>بيانات إعادة الاستخدام غير مكتملة.</b>',
        );

        this.botEventService.delete(userId);
        return;
      }

      this.botEventService.update(userId, {
        event: BotEventType.WAITING_MATERIAL_DEPARTMENT,

        data: {
          ...event.data,

          reuseMaterial: true,
        },
      });

      await this.showDepartments(ctx);
      return;
    }

    // ==========================================================
    // New material -> Same Department
    // ==========================================================

    if (value === 'new-same') {
      const departmentId = this.getNumberOrUndefined(
        event.data?.originalDepartmentId,
      );

      const levelId = this.getNumberOrUndefined(event.data?.originalLevelId);

      const termId = this.getNumberOrUndefined(event.data?.originalTermId);

      const trackId = this.getNumberOrUndefined(event.data?.originalTrackId);

      if (
        departmentId === undefined ||
        levelId === undefined ||
        termId === undefined
      ) {
        await this.editOrReply(ctx, '<b>بيانات التخصص الأصلي غير مكتملة.</b>');

        this.botEventService.delete(userId);
        return;
      }

      // ========================================================
      // Keep the original:
      // Department + Level + Term + Track
      //
      // Then go directly to course selection.
      // ========================================================

      this.botEventService.update(userId, {
        event: BotEventType.WAITING_MATERIAL_COURSE,

        data: {
          ...event.data,

          departmentId,
          levelId,
          termId,
          trackId,

          reuseMaterial: false,
        },
      });

      await this.handleTermWithTrack(
        ctx,
        departmentId,
        levelId,
        termId,
        trackId !== undefined ? String(trackId) : 'none',
      );

      return;
    }
  }

  // ============================================================
  // Reused Material Creation
  // ============================================================

  private async createReusedMaterial(
    ctx: Context,
    courseOfferingId: number,
    type: ResourceType,
    departmentId: number,
    levelId: number,
    termId: number,
    trackValue: string,
    courseId: number,
    academicYearId: number,
  ) {
    const userId = this.getUserId(ctx);

    const event = this.botEventService.get(userId);

    if (!event) {
      await this.editOrReply(ctx, '<b>انتهت العملية.</b>');
      return;
    }

    const storageMessageId = this.getNumberOrUndefined(
      event.data?.storageMessageId,
    );

    const telegramChatId = this.getString(event.data?.telegramChatId);

    const telegramFileId = this.getString(event.data?.telegramFileId);

    const title = this.getString(event.data?.title);

    if (
      storageMessageId === undefined ||
      !telegramChatId ||
      !telegramFileId ||
      !title
    ) {
      await this.editOrReply(
        ctx,
        '<b>بيانات الملزمة المعاد استخدامها غير مكتملة.</b>',
      );

      return;
    }

    try {
      await this.materialService.createMaterial({
        courseOfferingId,
        title,
        type,
        telegramChatId,
        telegramMessageId: storageMessageId,
        telegramFileId,
        caption: this.getString(event.data?.caption),
      });
    } catch (error) {
      console.error('Failed to create reused material:', error);

      await this.editOrReply(
        ctx,
        '<b>حدث خطأ أثناء إضافة الملزمة.</b>\n\n' + 'يرجى المحاولة مرة أخرى.',
      );

      return;
    }

    this.botEventService.update(userId, {
      event: BotEventType.WAITING_MATERIAL_REUSE,

      data: {
        ...event.data,

        departmentId,
        levelId,
        termId,
        trackValue,
        courseId,
        academicYearId,

        courseOfferingId,

        type,

        reuseMaterial: true,
      },
    });

    await this.showReuseSuccess(ctx, title);
  }

  // ============================================================
  // Reuse Success
  // ============================================================

  private async showReuseSuccess(ctx: Context, title: string) {
    await this.editOrReply(
      ctx,
      '<b>تمت إضافة الملزمة بنجاح.</b>\n\n' +
        `<b>العنوان:</b> ${this.escapeHtml(title)}\n\n` +
        'اختر الإجراء التالي:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            'إرسال نفس الملزمة لتخصص آخر',
            'am/reuse/other',
          ),
        ],

        [
          Markup.button.callback(
            'إرسال ملزمة جديدة لنفس التخصص',
            'am/reuse/new-same',
          ),
        ],

        [Markup.button.callback('الرئيسية', 'main_menu')],
      ]),
    );
  }

  // ============================================================
  // Progress Text
  // ============================================================

  private buildProgressText(params: {
    title: string;
    department?: string;
    level?: string;
    term?: string;
    track?: string;
    course?: string;
    academicYear?: string;
    nextTitle: string;
    description: string;
  }): string {
    const lines: string[] = [`<b>${this.escapeHtml(params.title)}</b>`, ''];

    if (params.department) {
      lines.push(`<b>التخصص:</b> ${this.escapeHtml(params.department)}`);
    }

    if (params.level) {
      lines.push(`<b>المستوى:</b> ${this.escapeHtml(params.level)}`);
    }

    if (params.term) {
      lines.push(`<b>الترم:</b> ${this.escapeHtml(params.term)}`);
    }

    if (params.track) {
      lines.push(`<b>التراك:</b> ${this.escapeHtml(params.track)}`);
    }

    if (params.course) {
      lines.push(`<b>المادة:</b> ${this.escapeHtml(params.course)}`);
    }

    if (params.academicYear) {
      lines.push(
        `<b>السنة الدراسية:</b> ${this.escapeHtml(params.academicYear)}`,
      );
    }

    lines.push(
      '',
      `<b>${this.escapeHtml(params.nextTitle)}</b>`,
      '',
      params.description,
    );

    return lines.join('\n');
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('message is not modified')) {
        return;
      }

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

  private getNumberOrUndefined(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
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
