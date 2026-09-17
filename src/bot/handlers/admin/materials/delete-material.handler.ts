/* eslint-disable @typescript-eslint/no-unused-vars */

import { Action, Ctx, Update } from 'nestjs-telegraf';

import { Injectable } from '@nestjs/common';

import { Context, Markup } from 'telegraf';

import { ResourceType, Prisma } from '@prisma/client';

import { AcademicService } from 'src/academic/services/academic.services';

import { MaterialService } from 'src/material/services/material.service';

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
export class DeleteMaterialHandler {
  constructor(
    private readonly academicService: AcademicService,
    private readonly materialService: MaterialService,
    private readonly botEventService: BotEventService,
    private readonly botEventConflictService: BotEventConflictService,
  ) {}

  // ============================================================
  // Callback Router
  // ============================================================

  @Action(/^dm(?:\/.*)?$/)
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

    if (parts[0] !== 'dm') {
      return;
    }

    await ctx.answerCbQuery();

    // ==========================================================
    // Delete Material
    // ==========================================================

    if (parts.length === 3 && parts[1] === 'delete') {
      const materialId = Number(parts[2]);

      if (!Number.isInteger(materialId)) {
        await this.editOrReply(ctx, '<b>❌ رقم الملزمة غير صحيح.</b>');
        return;
      }

      await this.confirmDelete(ctx, materialId);
      return;
    }

    // ==========================================================
    // Confirm Delete
    // ==========================================================

    if (parts.length === 3 && parts[1] === 'confirm') {
      const materialId = Number(parts[2]);

      if (!Number.isInteger(materialId)) {
        await this.editOrReply(ctx, '<b>❌ رقم الملزمة غير صحيح.</b>');
        return;
      }

      await this.deleteMaterial(ctx, materialId);
      return;
    }

    // ==========================================================
    // Cancel
    // ==========================================================

    if (parts.length === 2 && parts[1] === 'cancel') {
      this.botEventService.delete(this.getUserId(ctx));

      await this.editOrReply(
        ctx,
        `
<b>❌ تم إلغاء عملية الحذف.</b>

<i>يمكنك العودة إلى القائمة الرئيسية والبدء من جديد.</i>
        `.trim(),
        Markup.inlineKeyboard([[Markup.button.callback('🏠 الرئيسية', 'dm')]]),
      );

      return;
    }

    // ==========================================================
    // dm
    // ==========================================================

    if (parts.length === 1) {
      await this.start(ctx);
      return;
    }

    // ==========================================================
    // dm/departmentId
    // ==========================================================

    if (parts.length === 2) {
      const departmentId = Number(parts[1]);

      if (!Number.isInteger(departmentId)) {
        await this.editOrReply(ctx, '<b>❌ التخصص غير صحيح.</b>');
        return;
      }

      await this.handleDepartment(ctx, departmentId);
      return;
    }

    // ==========================================================
    // dm/departmentId/levelId
    // ==========================================================

    if (parts.length === 3) {
      const departmentId = Number(parts[1]);
      const levelId = Number(parts[2]);

      if (!Number.isInteger(departmentId) || !Number.isInteger(levelId)) {
        await this.editOrReply(ctx, '<b>❌ البيانات غير صحيحة.</b>');
        return;
      }

      await this.handleLevel(ctx, departmentId, levelId);
      return;
    }

    // ==========================================================
    // dm/departmentId/levelId/termId
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
        await this.editOrReply(ctx, '<b>❌ البيانات غير صحيحة.</b>');
        return;
      }

      await this.handleTermSelection(ctx, departmentId, levelId, termId);

      return;
    }

    // ==========================================================
    // dm/departmentId/levelId/termId/track
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
        await this.editOrReply(ctx, '<b>❌ البيانات غير صحيحة.</b>');
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
    // dm/dep/level/term/track/course
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
        await this.editOrReply(ctx, '<b>❌ البيانات غير صحيحة.</b>');
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
    // dm/dep/level/term/track/course/year
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
        await this.editOrReply(ctx, '<b>❌ البيانات غير صحيحة.</b>');
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
    // dm/dep/level/term/track/course/year/type
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
        await this.editOrReply(ctx, '<b>❌ البيانات غير صحيحة.</b>');
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

    await this.editOrReply(ctx, '<b>❌ مسار العملية غير صحيح.</b>');
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
      event: BotEventType.WAITING_MATERIAL_DEPARTMENT,
      messageId: this.getMessageId(ctx),
      chatId: String(ctx.chat?.id ?? ''),
      data: {
        deleteMaterial: true,
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
      await this.editOrReply(
        ctx,
        `
<b>❌ لا توجد تخصصات.</b>

<i>لم يتم العثور على أي تخصصات متاحة.</i>
        `.trim(),
      );

      this.deleteEvent(ctx);
      return;
    }

    await this.editOrReply(
      ctx,
      `
🎓 <b>حذف ملزمة</b>

اختر التخصص:
      `.trim(),
      Markup.inlineKeyboard(
        departments.map((department) => [
          Markup.button.callback(department.name, `dm/${department.id}`),
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
      await this.editOrReply(ctx, '<b>❌ التخصص غير موجود.</b>');
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
      await this.editOrReply(ctx, '<b>❌ لا توجد مستويات.</b>');
      return;
    }

    await this.editOrReply(
      ctx,
      `
📚 <b>اختر المستوى</b>

حدد المستوى الذي توجد فيه الملزمة:
      `.trim(),
      Markup.inlineKeyboard(
        levels.map((level) => [
          Markup.button.callback(level.name, `dm/${departmentId}/${level.id}`),
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
      await this.editOrReply(ctx, '<b>❌ التخصص أو المستوى غير موجود.</b>');
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
  // Terms - With Track
  // ============================================================

  private async showTermsWithTrack(
    ctx: Context,
    departmentId: number,
    levelId: number,
  ): Promise<void> {
    const terms = await this.academicService.getTerms();

    if (!terms.length) {
      await this.editOrReply(ctx, '<b>❌ لا توجد أترام.</b>');
      return;
    }

    await this.editOrReply(
      ctx,
      `
📖 <b>اختر الترم</b>

حدد الترم الذي توجد فيه الملزمة:
      `.trim(),
      Markup.inlineKeyboard(
        terms.map((term) => [
          Markup.button.callback(
            term.name,
            `dm/${departmentId}/${levelId}/${term.id}`,
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
  ): Promise<void> {
    const terms = await this.academicService.getTerms();

    if (!terms.length) {
      await this.editOrReply(ctx, '<b>❌ لا توجد أترام.</b>');
      return;
    }

    await this.editOrReply(
      ctx,
      `
📖 <b>اختر الترم</b>

حدد الترم الذي توجد فيه الملزمة:
      `.trim(),
      Markup.inlineKeyboard(
        terms.map((term) => [
          Markup.button.callback(
            term.name,
            `dm/${departmentId}/${levelId}/${term.id}/none`,
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
      await this.editOrReply(ctx, '<b>❌ بيانات الاختيار غير صحيحة.</b>');
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
        `dm/${departmentId}/${levelId}/${termId}/${track.id}`,
      ),
    ]);

    buttons.push([
      Markup.button.callback(
        '➡️ بدون تراك',
        `dm/${departmentId}/${levelId}/${termId}/none`,
      ),
    ]);

    this.updateEvent(ctx, BotEventType.WAITING_MATERIAL_TRACK, {
      departmentId,
      levelId,
      termId,
    });

    await this.editOrReply(
      ctx,
      `
🎯 <b>اختر التراك</b>

يمكنك اختيار التراك المناسب أو المتابعة بدون تراك.
      `.trim(),
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
      await this.editOrReply(ctx, '<b>❌ بيانات الاختيار غير صحيحة.</b>');
      return;
    }

    let trackId: number | undefined;

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '<b>❌ التراك غير صحيح.</b>');
        return;
      }

      const track = await this.academicService.getTrackById(trackId);

      if (!track) {
        await this.editOrReply(ctx, '<b>❌ التراك غير موجود.</b>');
        return;
      }
    }

    // ==========================================================
    // Get all course offerings
    // ==========================================================

    const academicYears = await this.academicService.getAcademicYears();

    if (!academicYears.length) {
      await this.editOrReply(ctx, '<b>❌ لا توجد سنوات دراسية.</b>');
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
      await this.editOrReply(
        ctx,
        `
<b>❌ لا توجد مواد لهذا الاختيار.</b>

<i>لم يتم العثور على مقررات مرتبطة بهذا السياق.</i>
        `.trim(),
      );
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
      `
📚 <b>اختر المادة</b>

حدد المقرر الذي تريد إدارة ملازمه:
      `.trim(),
      Markup.inlineKeyboard(
        courses.map((offering) => [
          Markup.button.callback(
            offering.course.name,
            `dm/${departmentId}/${levelId}/${termId}/${trackValue}/${offering.courseId}`,
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
        await this.editOrReply(ctx, '<b>❌ التراك غير صحيح.</b>');
        return;
      }
    }

    const academicYears = await this.academicService.getAcademicYears();

    if (!academicYears.length) {
      await this.editOrReply(ctx, '<b>❌ لا توجد سنوات دراسية.</b>');
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
        '<b>❌ لا توجد سنوات دراسية لهذه المادة.</b>',
      );
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
      `
📅 <b>اختر السنة الدراسية</b>

حدد السنة التي تريد إدارة ملازمها:
      `.trim(),
      Markup.inlineKeyboard(
        availableYears.map((year) => [
          Markup.button.callback(
            `${year.startYear} - ${year.endYear}`,
            `dm/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${year.id}`,
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
        await this.editOrReply(ctx, '<b>❌ التراك غير صحيح.</b>');
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
        '<b>❌ لا توجد هذه المادة في السنة المحددة.</b>',
      );
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
      `
📅 <b>السنة الدراسية</b>
${offering.academicYear.startYear} - ${offering.academicYear.endYear}

📚 <b>اختر نوع الملزمة</b>
      `.trim(),
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            '📘 نظري',
            `dm/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${academicYearId}/T`,
          ),
        ],
        [
          Markup.button.callback(
            '🧪 عملي',
            `dm/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${academicYearId}/P`,
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
      await this.editOrReply(ctx, '<b>❌ نوع الملزمة غير صحيح.</b>');
      return;
    }

    let trackId: number | undefined;

    if (trackValue !== 'none') {
      trackId = Number(trackValue);

      if (!Number.isInteger(trackId)) {
        await this.editOrReply(ctx, '<b>❌ التراك غير صحيح.</b>');
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
        '<b>❌ لا توجد هذه المادة في السياق المحدد.</b>',
      );
      return;
    }

    const materials = await this.materialService.getMaterials(
      offering.id,
      type,
    );

    if (!materials.length) {
      await this.editOrReply(
        ctx,
        `
<b>❌ لا توجد ملازم</b>

<i>لا توجد ملازم من هذا النوع في المادة المحددة.</i>
        `.trim(),
      );
      return;
    }

    this.updateEvent(ctx, BotEventType.PROCESSING, {
      courseOfferingId: offering.id,
      type,
    });

    await this.editOrReply(
      ctx,
      `
🗑️ <b>حذف ملزمة</b>

اختر الملزمة التي تريد حذفها:
      `.trim(),
      Markup.inlineKeyboard(
        materials.map((material) => [
          Markup.button.callback(
            `🗑️ ${material.title}`,
            `dm/delete/${material.id}`,
          ),
        ]),
      ),
    );
  }

  // ============================================================
  // Confirm Delete
  // ============================================================

  private async confirmDelete(ctx: Context, materialId: number): Promise<void> {
    const material = await this.materialService.getMaterialById(materialId);

    if (!material) {
      await this.editOrReply(
        ctx,
        `
<b>❌ الملزمة غير موجودة.</b>

<i>ربما تم حذفها مسبقًا.</i>
        `.trim(),
      );

      this.deleteEvent(ctx);
      return;
    }

    await this.editOrReply(
      ctx,
      `
⚠️ <b>تأكيد حذف الملزمة</b>

📚 <b>${material.title}</b>

هل أنت متأكد من حذف هذه الملزمة؟
<i>لا يمكن التراجع عن هذه العملية.</i>
      `.trim(),
      Markup.inlineKeyboard([
        [Markup.button.callback('🗑️ نعم، احذف', `dm/confirm/${material.id}`)],
        [Markup.button.callback('❌ إلغاء', 'dm/cancel')],
      ]),
    );
  }

  // ============================================================
  // Delete
  // ============================================================

  private async deleteMaterial(
    ctx: Context,
    materialId: number,
  ): Promise<void> {
    const userId = this.getUserId(ctx);

    const event = this.botEventService.get(userId);

    if (!event || event.event !== BotEventType.PROCESSING) {
      await this.editOrReply(ctx, '<b>⏰ انتهت عملية الحذف.</b>');
      return;
    }

    try {
      const material = await this.materialService.getMaterialById(materialId);

      if (!material) {
        await this.editOrReply(ctx, '<b>❌ لا توجد ملزمة بهذا المعرف.</b>');
        return;
      }

      await this.materialService.deleteMaterial(materialId);

      this.botEventService.delete(userId);

      await this.editOrReply(
        ctx,
        `
✅ <b>تم حذف الملزمة بنجاح</b>

📚 <b>${material.title}</b>

<i>تم حذف سجل الملزمة من النظام.</i>
        `.trim(),
        Markup.inlineKeyboard([
          [Markup.button.callback('🗑️ حذف ملزمة أخرى', 'dm')],
        ]),
      );
    } catch (error) {
      console.error('Failed to delete material:', error);

      await this.editOrReply(
        ctx,
        `
❌ <b>تعذر حذف الملزمة</b>

<i>حدث خطأ أثناء تنفيذ العملية، حاول مرة أخرى.</i>
        `.trim(),
        Markup.inlineKeyboard([
          [Markup.button.callback('🔄 المحاولة مرة أخرى', 'dm')],
        ]),
      );
    }
  }

  // ============================================================
  // Helpers
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

  private getUserId(ctx: Context): number {
    if (!ctx.from?.id) {
      throw new Error('Telegram user ID is missing');
    }

    return ctx.from.id;
  }

  private getMessageId(ctx: Context): number {
    const message = ctx.message;

    if (message && 'message_id' in message) {
      return message.message_id;
    }

    return 0;
  }

  private deleteEvent(ctx: Context): void {
    this.botEventService.delete(this.getUserId(ctx));
  }
}
