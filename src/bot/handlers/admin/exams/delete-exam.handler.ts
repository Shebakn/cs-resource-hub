/* eslint-disable @typescript-eslint/no-unused-vars */

import { Action, Ctx, Update } from 'nestjs-telegraf';

import { Injectable } from '@nestjs/common';

import { Context, Markup } from 'telegraf';

import { Prisma, ResourceType } from '@prisma/client';

import { AcademicService } from 'src/academic/services/academic.services';

import { ExamService } from 'src/exam/services/exam.service';

import {
  BotEventService,
  BotEventType,
} from 'src/bot/services/bot-event.service';

import { BotEventConflictService } from 'src/bot/services/bot-conflict.service';

type CourseOfferingWithRelations = Prisma.CourseOfferingGetPayload<{
  include: {
    course: true;
    academicYear: true;
  };
}>;

@Injectable()
@Update()
export class DeleteExamHandler {
  constructor(
    private readonly academicService: AcademicService,
    private readonly examService: ExamService,
    private readonly botEventService: BotEventService,
    private readonly botEventConflictService: BotEventConflictService,
  ) {}

  // ============================================================
  // Callback Router
  // ============================================================

  @Action(/^de(?:\/.*)?$/)
  async handleAction(@Ctx() ctx: Context): Promise<void> {
    const callbackQuery = ctx.callbackQuery;

    if (!callbackQuery || !('data' in callbackQuery)) {
      return;
    }

    const callbackData = callbackQuery.data;

    if (typeof callbackData !== 'string') {
      return;
    }

    const parts = callbackData.split('/');

    if (parts[0] !== 'de') {
      return;
    }

    await ctx.answerCbQuery();

    // ==========================================================
    // Delete Exam
    // ==========================================================

    if (parts.length === 3 && parts[1] === 'delete') {
      const examId = Number(parts[2]);

      if (!Number.isInteger(examId)) {
        await this.editOrReply(ctx, '❌ رقم الاختبار غير صحيح.');
        return;
      }

      await this.confirmDelete(ctx, examId);
      return;
    }

    // ==========================================================
    // Confirm Delete
    // ==========================================================

    if (parts.length === 3 && parts[1] === 'confirm') {
      const examId = Number(parts[2]);

      if (!Number.isInteger(examId)) {
        await this.editOrReply(ctx, '❌ رقم الاختبار غير صحيح.');
        return;
      }

      await this.deleteExam(ctx, examId);
      return;
    }

    // ==========================================================
    // Cancel
    // ==========================================================

    if (parts.length === 2 && parts[1] === 'cancel') {
      this.botEventService.delete(this.getUserId(ctx));

      await this.editOrReply(
        ctx,
        '❌ <b>تم إلغاء عملية الحذف.</b>',
        Markup.inlineKeyboard([[Markup.button.callback('🏠 الرئيسية', 'de')]]),
      );

      return;
    }

    // ==========================================================
    // de
    // ==========================================================

    if (parts.length === 1) {
      await this.start(ctx);
      return;
    }

    // ==========================================================
    // de/departmentId
    // ==========================================================

    if (parts.length === 2) {
      const departmentId = Number(parts[1]);

      if (!Number.isInteger(departmentId)) {
        await this.editOrReply(ctx, '❌ التخصص غير صحيح.');
        return;
      }

      await this.handleDepartment(ctx, departmentId);

      return;
    }

    // ==========================================================
    // de/departmentId/levelId
    // ==========================================================

    if (parts.length === 3) {
      const departmentId = Number(parts[1]);
      const levelId = Number(parts[2]);

      if (!Number.isInteger(departmentId) || !Number.isInteger(levelId)) {
        await this.editOrReply(ctx, '❌ البيانات غير صحيحة.');
        return;
      }

      await this.handleLevel(ctx, departmentId, levelId);

      return;
    }

    // ==========================================================
    // de/departmentId/levelId/termId
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
        await this.editOrReply(ctx, '❌ البيانات غير صحيحة.');
        return;
      }

      await this.handleTermSelection(ctx, departmentId, levelId, termId);

      return;
    }

    // ==========================================================
    // de/departmentId/levelId/termId/track
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
        await this.editOrReply(ctx, '❌ البيانات غير صحيحة.');
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
    // de/dep/level/term/track/course
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
        await this.editOrReply(ctx, '❌ البيانات غير صحيحة.');
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
    // de/dep/level/term/track/course/year
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
        await this.editOrReply(ctx, '❌ البيانات غير صحيحة.');
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
    // de/dep/level/term/track/course/year/type
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
        await this.editOrReply(ctx, '❌ البيانات غير صحيحة.');
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

    await this.editOrReply(ctx, '❌ مسار العملية غير صحيح.');
  }

  // ============================================================
  // Start
  // ============================================================

  async start(@Ctx() ctx: Context): Promise<void> {
    const userId = this.getUserId(ctx);

    const existingEvent = this.botEventService.get(userId);

    if (existingEvent) {
      await this.botEventConflictService.showConflict(ctx, existingEvent);
      return;
    }

    this.botEventService.set({
      userId,
      event: BotEventType.WAITING_DELETE_EXAM,
      messageId: this.getMessageId(ctx),
      chatId: String(ctx.chat?.id ?? ''),
      data: {
        deleteExam: true,
      },
    });

    await this.showDepartments(ctx);
  }

  // ============================================================
  // Departments
  // ============================================================

  private async showDepartments(ctx: Context): Promise<void> {
    const departments = await this.academicService.getDepartments();

    if (!departments.length) {
      await this.editOrReply(ctx, '❌ لا توجد تخصصات.');

      this.deleteEvent(ctx);
      return;
    }

    await this.editOrReply(
      ctx,
      '🗑️ <b>حذف اختبار</b>\n\n🎓 اختر التخصص:',
      Markup.inlineKeyboard(
        departments.map((department) => [
          Markup.button.callback(department.name, `de/${department.id}`),
        ]),
      ),
    );
  }

  // ============================================================
  // Department
  // ============================================================

  private async handleDepartment(
    ctx: Context,
    departmentId: number,
  ): Promise<void> {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    if (!department) {
      await this.editOrReply(ctx, '❌ التخصص غير موجود.');
      return;
    }

    this.updateEvent(ctx, BotEventType.WAITING_MATERIAL_LEVEL, {
      departmentId,
    });

    await this.showLevels(ctx, departmentId);
  }

  // ============================================================
  // Levels
  // ============================================================

  private async showLevels(ctx: Context, departmentId: number): Promise<void> {
    const levels = await this.academicService.getLevels();

    if (!levels.length) {
      await this.editOrReply(ctx, '❌ لا توجد مستويات.');
      return;
    }

    await this.editOrReply(
      ctx,
      '🗑️ <b>حذف اختبار</b>\n\n📚 اختر المستوى:',
      Markup.inlineKeyboard(
        levels.map((level) => [
          Markup.button.callback(level.name, `de/${departmentId}/${level.id}`),
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
  ): Promise<void> {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    if (!department || !level) {
      await this.editOrReply(ctx, '❌ التخصص أو المستوى غير موجود.');
      return;
    }

    const hasTrack =
      department.name === 'تقنية معلومات' &&
      (level.number === 3 || level.number === 4);

    this.updateEvent(ctx, BotEventType.WAITING_MATERIAL_TERM, {
      departmentId,
      levelId,
    });

    if (hasTrack) {
      await this.showTermsWithTrack(ctx, departmentId, levelId);
      return;
    }

    await this.showTermsWithoutTrack(ctx, departmentId, levelId);
  }

  // ============================================================
  // Terms
  // ============================================================

  private async showTermsWithTrack(
    ctx: Context,
    departmentId: number,
    levelId: number,
  ): Promise<void> {
    const terms = await this.academicService.getTerms();

    if (!terms.length) {
      await this.editOrReply(ctx, '❌ لا توجد أترام.');
      return;
    }

    await this.editOrReply(
      ctx,
      '🗑️ <b>حذف اختبار</b>\n\n📖 اختر الترم:',
      Markup.inlineKeyboard(
        terms.map((term) => [
          Markup.button.callback(
            term.name,
            `de/${departmentId}/${levelId}/${term.id}`,
          ),
        ]),
      ),
    );
  }

  private async showTermsWithoutTrack(
    ctx: Context,
    departmentId: number,
    levelId: number,
  ): Promise<void> {
    const terms = await this.academicService.getTerms();

    if (!terms.length) {
      await this.editOrReply(ctx, '❌ لا توجد أترام.');
      return;
    }

    await this.editOrReply(
      ctx,
      '🗑️ <b>حذف اختبار</b>\n\n📖 اختر الترم:',
      Markup.inlineKeyboard(
        terms.map((term) => [
          Markup.button.callback(
            term.name,
            `de/${departmentId}/${levelId}/${term.id}/none`,
          ),
        ]),
      ),
    );
  }

  // ============================================================
  // Term
  // ============================================================

  private async handleTermSelection(
    ctx: Context,
    departmentId: number,
    levelId: number,
    termId: number,
  ): Promise<void> {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    const term = await this.academicService.getTermById(termId);

    if (!department || !level || !term) {
      await this.editOrReply(ctx, '❌ بيانات الاختيار غير صحيحة.');
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
        `de/${departmentId}/${levelId}/${termId}/${track.id}`,
      ),
    ]);

    buttons.push([
      Markup.button.callback(
        '➡️ بدون تراك',
        `de/${departmentId}/${levelId}/${termId}/none`,
      ),
    ]);

    this.updateEvent(ctx, BotEventType.WAITING_MATERIAL_TRACK, {
      departmentId,
      levelId,
      termId,
    });

    await this.editOrReply(
      ctx,
      '🗑️ <b>حذف اختبار</b>\n\n🎯 اختر التراك:',
      Markup.inlineKeyboard(buttons),
    );
  }

  // ============================================================
  // Track
  // ============================================================

  private async handleTermWithTrack(
    ctx: Context,
    departmentId: number,
    levelId: number,
    termId: number,
    trackValue: string,
  ): Promise<void> {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    const term = await this.academicService.getTermById(termId);

    if (!department || !level || !term) {
      await this.editOrReply(ctx, '❌ بيانات الاختيار غير صحيحة.');
      return;
    }

    let trackId: number | undefined;

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '❌ التراك غير صحيح.');
        return;
      }

      const track = await this.academicService.getTrackById(trackId);

      if (!track) {
        await this.editOrReply(ctx, '❌ التراك غير موجود.');
        return;
      }
    }

    const academicYears = await this.academicService.getAcademicYears();

    if (!academicYears.length) {
      await this.editOrReply(ctx, '❌ لا توجد سنوات دراسية.');
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
      await this.editOrReply(ctx, '❌ لا توجد مواد لهذا الاختيار.');
      return;
    }

    const uniqueCourses = new Map<number, CourseOfferingWithRelations>();

    for (const offering of offerings) {
      if (!uniqueCourses.has(offering.courseId)) {
        uniqueCourses.set(offering.courseId, offering);
      }
    }

    const courses = Array.from(uniqueCourses.values());

    this.updateEvent(ctx, BotEventType.WAITING_MATERIAL_COURSE, {
      departmentId,
      levelId,
      termId,
      trackValue,
    });

    await this.editOrReply(
      ctx,
      '🗑️ <b>حذف اختبار</b>\n\n📚 اختر المادة:',
      Markup.inlineKeyboard(
        courses.map((offering) => [
          Markup.button.callback(
            offering.course.name,
            `de/${departmentId}/${levelId}/${termId}/${trackValue}/${offering.courseId}`,
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
  ): Promise<void> {
    let trackId: number | undefined;

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '❌ التراك غير صحيح.');
        return;
      }
    }

    const academicYears = await this.academicService.getAcademicYears();

    if (!academicYears.length) {
      await this.editOrReply(ctx, '❌ لا توجد سنوات دراسية.');
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
      await this.editOrReply(ctx, '❌ لا توجد سنوات دراسية لهذه المادة.');
      return;
    }

    availableYears.sort((a, b) => b.startYear - a.startYear);

    this.updateEvent(ctx, BotEventType.WAITING_MATERIAL_ACADEMIC_YEAR, {
      departmentId,
      levelId,
      termId,
      trackValue,
      courseId,
    });

    await this.editOrReply(
      ctx,
      '🗑️ <b>حذف اختبار</b>\n\n📅 اختر السنة الدراسية:',
      Markup.inlineKeyboard(
        availableYears.map((year) => [
          Markup.button.callback(
            `${year.startYear} - ${year.endYear}`,
            `de/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${year.id}`,
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
  ): Promise<void> {
    let trackId: number | undefined;

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '❌ التراك غير صحيح.');
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
      await this.editOrReply(ctx, '❌ لا توجد هذه المادة في السنة المحددة.');
      return;
    }

    this.updateEvent(ctx, BotEventType.WAITING_MATERIAL_TYPE, {
      departmentId,
      levelId,
      termId,
      trackValue,
      courseId,
      academicYearId,
      courseOfferingId: offering.id,
    });

    await this.editOrReply(
      ctx,
      `<b>📅 السنة:</b> ${offering.academicYear.startYear} - ${offering.academicYear.endYear}\n\n` +
        '📝 <b>اختر نوع الاختبار:</b>',
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            '📘 نظري',
            `de/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${academicYearId}/T`,
          ),
        ],
        [
          Markup.button.callback(
            '🧪 عملي',
            `de/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${academicYearId}/P`,
          ),
        ],
      ]),
    );
  }

  // ============================================================
  // Type
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
  ): Promise<void> {
    let type: ResourceType;

    if (typeValue === 'T') {
      type = ResourceType.THEORY;
    } else if (typeValue === 'P') {
      type = ResourceType.PRACTICAL;
    } else {
      await this.editOrReply(ctx, '❌ نوع الاختبار غير صحيح.');
      return;
    }

    let trackId: number | undefined;

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '❌ التراك غير صحيح.');
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
      await this.editOrReply(ctx, '❌ لا توجد هذه المادة في السياق المحدد.');
      return;
    }

    const exams = await this.examService.getExams(offering.id, type);

    if (!exams.length) {
      await this.editOrReply(
        ctx,
        '❌ لا توجد اختبارات لهذا النوع في هذه المادة.',
      );
      return;
    }

    this.updateEvent(ctx, BotEventType.WAITING_DELETE_EXAM, {
      courseOfferingId: offering.id,
      type,
    });

    await this.editOrReply(
      ctx,
      '📝 <b>اختر الاختبار الذي تريد حذفه:</b>',
      Markup.inlineKeyboard(
        exams.map((exam) => [
          Markup.button.callback(`🗑️ ${exam.title}`, `de/delete/${exam.id}`),
        ]),
      ),
    );
  }

  // ============================================================
  // Confirm Delete
  // ============================================================

  private async confirmDelete(ctx: Context, examId: number): Promise<void> {
    const userId = this.getUserId(ctx);

    const event = this.botEventService.get(userId);

    if (!event || event.event !== BotEventType.WAITING_DELETE_EXAM) {
      await this.editOrReply(ctx, '⏰ انتهت عملية الحذف.');
      return;
    }

    const exam = await this.examService.getExamById(examId);

    if (!exam) {
      await this.editOrReply(ctx, '❌ الاختبار غير موجود.');

      this.deleteEvent(ctx);
      return;
    }

    const courseOfferingId = Number(event.data?.courseOfferingId);

    if (
      !Number.isInteger(courseOfferingId) ||
      exam.courseOfferingId !== courseOfferingId
    ) {
      await this.editOrReply(
        ctx,
        '❌ هذا الاختبار لا ينتمي إلى المادة المحددة.',
      );
      return;
    }

    await this.editOrReply(
      ctx,
      `⚠️ <b>تأكيد حذف الاختبار</b>\n\n` +
        `📝 ${this.escapeHtml(exam.title)}\n\n` +
        'هل أنت متأكد من حذف هذا الاختبار؟',
      Markup.inlineKeyboard([
        [Markup.button.callback('🗑️ نعم، احذف', `de/confirm/${exam.id}`)],
        [Markup.button.callback('❌ إلغاء', 'de/cancel')],
      ]),
    );
  }

  // ============================================================
  // Delete
  // ============================================================

  private async deleteExam(ctx: Context, examId: number): Promise<void> {
    const userId = this.getUserId(ctx);

    const event = this.botEventService.get(userId);

    if (!event || event.event !== BotEventType.WAITING_DELETE_EXAM) {
      await this.editOrReply(ctx, '⏰ انتهت عملية الحذف.');
      return;
    }

    try {
      const exam = await this.examService.getExamById(examId);

      if (!exam) {
        await this.editOrReply(ctx, '❌ لا يوجد اختبار بهذا المعرف.');
        return;
      }

      const courseOfferingId = Number(event.data?.courseOfferingId);

      if (
        !Number.isInteger(courseOfferingId) ||
        exam.courseOfferingId !== courseOfferingId
      ) {
        await this.editOrReply(
          ctx,
          '❌ هذا الاختبار لا ينتمي إلى المادة المحددة.',
        );
        return;
      }

      await this.examService.deleteExam(examId);

      this.botEventService.delete(userId);

      await this.editOrReply(
        ctx,
        `✅ <b>تم حذف الاختبار بنجاح.</b>\n\n` +
          `📝 ${this.escapeHtml(exam.title)}\n\n` +
          'اختر الإجراء التالي:',
        Markup.inlineKeyboard([
          [
            Markup.button.callback('🗑️ حذف اختبار آخر', 'de'),
            Markup.button.callback('🏠 الرئيسية', 'de'),
          ],
        ]),
      );
    } catch (error) {
      console.error('Failed to delete exam:', error);

      await this.editOrReply(ctx, '❌ حدث خطأ أثناء حذف الاختبار.');
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  private updateEvent(
    ctx: Context,
    event: BotEventType,
    data: Record<string, unknown>,
  ): void {
    this.botEventService.update(this.getUserId(ctx), {
      event,
      data,
    });
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
  // Edit Current Message / Fallback Reply
  // ============================================================

  private async editOrReply(
    ctx: Context,
    text: string,
    keyboard?: ReturnType<typeof Markup.inlineKeyboard>,
  ): Promise<void> {
    const extra = {
      parse_mode: 'HTML' as const,
      ...(keyboard ?? {}),
    };

    try {
      if (ctx.callbackQuery && 'message' in ctx.callbackQuery) {
        await ctx.editMessageText(text, extra);

        return;
      }
    } catch (error) {
      console.warn(
        'Failed to edit Telegram message, falling back to reply:',
        error,
      );
    }

    await ctx.reply(text, extra);
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
