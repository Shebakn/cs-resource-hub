import { Action, Ctx, Update } from 'nestjs-telegraf';

import { Context } from 'telegraf';

import { ResourceType } from '@prisma/client';

import { AcademicService } from 'src/academic/services/academic.services';

import { ExamService } from 'src/exam/services/exam.service';

@Update()
export class ExamsHandler {
  constructor(
    private readonly examService: ExamService,
    private readonly academicService: AcademicService,
  ) {}

  // ============================================================
  // Main router
  // ============================================================

  @Action(/^se(?:\/.*)?$/)
  async handle(@Ctx() ctx: Context) {
    const callbackQuery = ctx.callbackQuery;

    if (!callbackQuery || !('data' in callbackQuery)) {
      return;
    }

    const data = callbackQuery.data;

    if (typeof data !== 'string') {
      return;
    }

    const parts = data.split('/');

    // se
    if (parts.length === 1) {
      await this.showDepartments(ctx);
      return;
    }

    // se/{departmentId}
    if (parts.length === 2) {
      await this.showLevels(ctx, Number(parts[1]));

      return;
    }

    // se/{departmentId}/{levelId}
    if (parts.length === 3) {
      await this.showTerms(ctx, Number(parts[1]), Number(parts[2]));

      return;
    }

    // se/{departmentId}/{levelId}/{termId}
    if (parts.length === 4) {
      await this.handleAfterTerm(
        ctx,
        Number(parts[1]),
        Number(parts[2]),
        Number(parts[3]),
      );

      return;
    }

    // se/{departmentId}/{levelId}/{termId}/{trackId|none}
    if (parts.length === 5) {
      await this.showCourses(
        ctx,
        Number(parts[1]),
        Number(parts[2]),
        Number(parts[3]),
        parts[4],
      );

      return;
    }

    // se/{departmentId}/{levelId}/{termId}/{trackId|none}/{courseId}
    if (parts.length === 6) {
      await this.showAcademicYears(
        ctx,
        Number(parts[1]),
        Number(parts[2]),
        Number(parts[3]),
        parts[4],
        Number(parts[5]),
      );

      return;
    }

    // se/{departmentId}/{levelId}/{termId}/{trackId|none}/{courseId}/{academicYearId}
    if (parts.length === 7) {
      await this.showTypes(
        ctx,
        Number(parts[1]),
        Number(parts[2]),
        Number(parts[3]),
        parts[4],
        Number(parts[5]),
        Number(parts[6]),
      );

      return;
    }

    // se/{departmentId}/{levelId}/{termId}/{trackId|none}/{courseId}/{academicYearId}/{type}
    if (parts.length === 8) {
      await this.sendExams(
        ctx,
        Number(parts[1]),
        Number(parts[2]),
        Number(parts[3]),
        parts[4],
        Number(parts[5]),
        Number(parts[6]),
        parts[7],
      );
    }
  }

  // ============================================================
  // 1. Departments
  // ============================================================

  private async showDepartments(ctx: Context) {
    const departments = await this.academicService.getDepartments();

    await ctx.answerCbQuery();

    if (!departments.length) {
      await ctx.editMessageText(
        `
<b>لا توجد تخصصات متاحة حاليًا</b>

لم يتم العثور على أي تخصص يحتوي على امتحانات تعليمية.
        `.trim(),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'السابق',
                  callback_data: 'main_menu',
                },
              ],
            ],
          },
        },
      );

      return;
    }

    await ctx.editMessageText(
      `
<b>الامتحانات السابقة</b>

<b>اختر التخصص</b>

اختر تخصصك للانتقال إلى المستويات الدراسية والامتحانات المتاحة.
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...departments.map((department) => [
              {
                text: department.name,
                callback_data: `se/${department.id}`,
              },
            ]),
            [
              {
                text: 'السابق',
                callback_data: 'main_menu',
              },
            ],
          ],
        },
      },
    );
  }

  // ============================================================
  // 2. Levels
  // ============================================================

  private async showLevels(ctx: Context, departmentId: number) {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    if (!department) {
      await ctx.answerCbQuery('التخصص غير موجود.');

      return;
    }

    const levels = await this.academicService.getLevels();

    await ctx.answerCbQuery();

    if (!levels.length) {
      await ctx.editMessageText(
        `
<b>لا توجد مستويات دراسية متاحة</b>

لم يتم إعداد المستويات الدراسية في النظام حتى الآن.
        `.trim(),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'السابق',
                  callback_data: 'se',
                },
              ],
            ],
          },
        },
      );

      return;
    }

    await ctx.editMessageText(
      `
<b>الامتحانات السابقة</b>

<b>التخصص:</b> ${this.escapeHtml(department.name)}

<b>اختر المستوى الدراسي</b>
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...levels.map((level) => [
              {
                text: level.name,
                callback_data: `se/${departmentId}/${level.id}`,
              },
            ]),
            [
              {
                text: 'السابق',
                callback_data: 'se',
              },
            ],
          ],
        },
      },
    );
  }

  // ============================================================
  // 3. Terms
  // ============================================================

  private async showTerms(ctx: Context, departmentId: number, levelId: number) {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    if (!department || !level) {
      await ctx.answerCbQuery('البيانات المحددة غير صحيحة.');

      return;
    }

    const terms = await this.academicService.getTerms();

    await ctx.answerCbQuery();

    if (!terms.length) {
      await ctx.editMessageText(
        `
<b>لا توجد أترام دراسية متاحة</b>

لم يتم إعداد الفصول الدراسية في النظام حتى الآن.
        `.trim(),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'السابق',
                  callback_data: `se/${departmentId}`,
                },
              ],
            ],
          },
        },
      );

      return;
    }

    await ctx.editMessageText(
      `
<b>الامتحانات السابقة</b>

<b>التخصص:</b> ${this.escapeHtml(department.name)}

<b>المستوى:</b> ${this.escapeHtml(level.name)}

<b>اختر الترم الدراسي</b>
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...terms.map((term) => [
              {
                text: term.name,
                callback_data: `se/${departmentId}/${levelId}/${term.id}`,
              },
            ]),
            [
              {
                text: 'السابق',
                callback_data: `se/${departmentId}`,
              },
            ],
          ],
        },
      },
    );
  }

  // ============================================================
  // 4. After term
  // Track only for IT level 3/4
  // ============================================================

  private async handleAfterTerm(
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
      await ctx.answerCbQuery('البيانات المحددة غير صحيحة.');

      return;
    }

    const isIT = department.name === 'تقنية معلومات';

    const needsTrack = isIT && (level.id === 3 || level.id === 4);

    if (needsTrack) {
      await this.showTracks(ctx, departmentId, levelId, termId);

      return;
    }

    await this.showCourses(ctx, departmentId, levelId, termId, 'none');
  }

  // ============================================================
  // 5. Tracks
  // ============================================================

  private async showTracks(
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
      await ctx.answerCbQuery('البيانات المحددة غير صحيحة.');

      return;
    }

    const tracks =
      await this.academicService.getTracksByDepartmentId(departmentId);

    await ctx.answerCbQuery();

    if (!tracks.length) {
      await this.showCourses(ctx, departmentId, levelId, termId, 'none');

      return;
    }

    const buttons = tracks.map((track) => [
      {
        text: track.name,
        callback_data: `se/${departmentId}/${levelId}/${termId}/${track.id}`,
      },
    ]);

    buttons.push([
      {
        text: 'بدون تراك',
        callback_data: `se/${departmentId}/${levelId}/${termId}/none`,
      },
    ]);

    buttons.push([
      {
        text: 'السابق',
        callback_data: `se/${departmentId}`,
      },
    ]);

    await ctx.editMessageText(
      `
<b>الامتحانات السابقة</b>

<b>التخصص:</b> ${this.escapeHtml(department.name)}

<b>المستوى:</b> ${this.escapeHtml(level.name)}

<b>الترم:</b> ${this.escapeHtml(term.name)}

<b>اختر التراك</b>
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: buttons,
        },
      },
    );
  }

  // ============================================================
  // 6. Courses
  // ============================================================

  private async showCourses(
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
      await ctx.answerCbQuery('البيانات المحددة غير صحيحة.');

      return;
    }

    const trackId = trackValue === 'none' ? undefined : Number(trackValue);

    let trackName: string | undefined;

    if (trackId !== undefined) {
      const tracks =
        await this.academicService.getTracksByDepartmentId(departmentId);

      trackName = tracks.find((track) => track.id === trackId)?.name;
    }

    const courses = await this.examService.getCoursesWithExams({
      departmentId,
      levelId,
      termId,
      trackId,
    });

    await ctx.answerCbQuery();

    if (!courses.length) {
      await ctx.editMessageText(
        `
<b>لا توجد مقررات تحتوي على امتحانات</b>

<b>التخصص:</b> ${this.escapeHtml(department.name)}

<b>المستوى:</b> ${this.escapeHtml(level.name)}

<b>الترم:</b> ${this.escapeHtml(term.name)}

لم يتم العثور على امتحانات متاحة لهذا الاختيار.
        `.trim(),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'السابق',
                  callback_data: `se/${departmentId}`,
                },
              ],
            ],
          },
        },
      );

      return;
    }

    const contextLines = [
      `<b>التخصص:</b> ${this.escapeHtml(department.name)}`,
      `<b>المستوى:</b> ${this.escapeHtml(level.name)}`,
      `<b>الترم:</b> ${this.escapeHtml(term.name)}`,
    ];

    if (trackName) {
      contextLines.push(`<b>التراك:</b> ${this.escapeHtml(trackName)}`);
    }

    contextLines.push('');
    contextLines.push('<b>اختر المقرر</b>');

    await ctx.editMessageText(
      `
<b>الامتحانات السابقة</b>

${contextLines.join('\n')}
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...courses.map((course) => [
              {
                text: course.name,
                callback_data: `se/${departmentId}/${levelId}/${termId}/${trackValue}/${course.id}`,
              },
            ]),
            [
              {
                text: 'السابق',
                callback_data: `se/${departmentId}`,
              },
            ],
          ],
        },
      },
    );
  }

  // ============================================================
  // 7. Academic years
  // ============================================================

  private async showAcademicYears(
    ctx: Context,
    departmentId: number,
    levelId: number,
    termId: number,
    trackValue: string,
    courseId: number,
  ) {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    const term = await this.academicService.getTermById(termId);

    if (!department || !level || !term) {
      await ctx.answerCbQuery('البيانات المحددة غير صحيحة.');

      return;
    }

    const trackId = trackValue === 'none' ? undefined : Number(trackValue);

    let trackName: string | undefined;

    if (trackId !== undefined) {
      const tracks =
        await this.academicService.getTracksByDepartmentId(departmentId);

      trackName = tracks.find((track) => track.id === trackId)?.name;
    }

    const courses = await this.examService.getCoursesWithExams({
      departmentId,
      levelId,
      termId,
      trackId,
    });

    const course = courses.find((item) => item.id === courseId);

    if (!course) {
      await ctx.answerCbQuery('المقرر غير موجود.');

      return;
    }

    const offerings = await this.examService.getCourseOfferingsWithExams({
      courseId,
      departmentId,
      levelId,
      termId,
      trackId,
    });

    await ctx.answerCbQuery();

    if (!offerings.length) {
      await ctx.editMessageText(
        `
<b>لا توجد امتحانات لهذا المقرر</b>

<b>التخصص:</b> ${this.escapeHtml(department.name)}

<b>المستوى:</b> ${this.escapeHtml(level.name)}

<b>الترم:</b> ${this.escapeHtml(term.name)}

<b>المقرر:</b> ${this.escapeHtml(course.name)}

لم يتم العثور على سنوات دراسية تحتوي على امتحانات متاحة.
        `.trim(),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'السابق',
                  callback_data: `se/${departmentId}`,
                },
              ],
            ],
          },
        },
      );

      return;
    }

    const contextLines = [
      `<b>التخصص:</b> ${this.escapeHtml(department.name)}`,
      `<b>المستوى:</b> ${this.escapeHtml(level.name)}`,
      `<b>الترم:</b> ${this.escapeHtml(term.name)}`,
    ];

    if (trackName) {
      contextLines.push(`<b>التراك:</b> ${this.escapeHtml(trackName)}`);
    }

    contextLines.push(
      `<b>المقرر:</b> ${this.escapeHtml(course.name)}`,
      '',
      '<b>اختر السنة الدراسية</b>',
    );

    await ctx.editMessageText(
      `
<b>الامتحانات السابقة</b>

${contextLines.join('\n')}
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...offerings.map((offering) => [
              {
                text: this.formatAcademicYear(
                  offering.academicYear.startYear,
                  offering.academicYear.endYear,
                ),
                callback_data: `se/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${offering.academicYearId}`,
              },
            ]),
            [
              {
                text: 'السابق',
                callback_data: `se/${departmentId}`,
              },
            ],
          ],
        },
      },
    );
  }

  // ============================================================
  // 8. Exam types
  // ============================================================

  private async showTypes(
    ctx: Context,
    departmentId: number,
    levelId: number,
    termId: number,
    trackValue: string,
    courseId: number,
    academicYearId: number,
  ) {
    const department =
      await this.academicService.getDepartmentById(departmentId);

    const level = await this.academicService.getLevelById(levelId);

    const term = await this.academicService.getTermById(termId);

    if (!department || !level || !term) {
      await ctx.answerCbQuery('البيانات المحددة غير صحيحة.');

      return;
    }

    const trackId = trackValue === 'none' ? undefined : Number(trackValue);

    let trackName: string | undefined;

    if (trackId !== undefined) {
      const tracks =
        await this.academicService.getTracksByDepartmentId(departmentId);

      trackName = tracks.find((track) => track.id === trackId)?.name;
    }

    const courses = await this.examService.getCoursesWithExams({
      departmentId,
      levelId,
      termId,
      trackId,
    });

    const course = courses.find((item) => item.id === courseId);

    if (!course) {
      await ctx.answerCbQuery('المقرر غير موجود.');

      return;
    }

    const offerings = await this.examService.getCourseOfferingsWithExams({
      courseId,
      departmentId,
      levelId,
      termId,
      trackId,
    });

    const offering = offerings.find(
      (item) => item.academicYearId === academicYearId,
    );

    if (!offering) {
      await ctx.answerCbQuery('السنة الدراسية غير موجودة.');

      return;
    }

    const types = await this.examService.getTypesByCourseOffering(offering.id);

    await ctx.answerCbQuery();

    if (!types.length) {
      await ctx.editMessageText(
        `
<b>لا توجد امتحانات متاحة</b>

<b>التخصص:</b> ${this.escapeHtml(department.name)}

<b>المستوى:</b> ${this.escapeHtml(level.name)}

<b>الترم:</b> ${this.escapeHtml(term.name)}

<b>المقرر:</b> ${this.escapeHtml(course.name)}

<b>السنة:</b> ${this.formatAcademicYear(
          offering.academicYear.startYear,
          offering.academicYear.endYear,
        )}

لم يتم العثور على أنواع امتحانات متاحة لهذا الاختيار.
        `.trim(),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'السابق',
                  callback_data: `se/${departmentId}`,
                },
              ],
            ],
          },
        },
      );

      return;
    }

    const contextLines = [
      `<b>التخصص:</b> ${this.escapeHtml(department.name)}`,
      `<b>المستوى:</b> ${this.escapeHtml(level.name)}`,
      `<b>الترم:</b> ${this.escapeHtml(term.name)}`,
    ];

    if (trackName) {
      contextLines.push(`<b>التراك:</b> ${this.escapeHtml(trackName)}`);
    }

    contextLines.push(
      `<b>المقرر:</b> ${this.escapeHtml(course.name)}`,
      `<b>السنة:</b> ${this.formatAcademicYear(
        offering.academicYear.startYear,
        offering.academicYear.endYear,
      )}`,
      '',
      '<b>اختر نوع الامتحان</b>',
    );

    await ctx.editMessageText(
      `
<b>الامتحانات السابقة</b>

${contextLines.join('\n')}
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...types.map((type) => [
              {
                text: this.getTypeLabel(type),
                callback_data: `se/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${academicYearId}/${type}`,
              },
            ]),
            [
              {
                text: 'السابق',
                callback_data: `se/${departmentId}`,
              },
            ],
          ],
        },
      },
    );
  }

  // ============================================================
  // 9. Send exams
  // ============================================================

  private async sendExams(
    ctx: Context,
    departmentId: number,
    levelId: number,
    termId: number,
    trackValue: string,
    courseId: number,
    academicYearId: number,
    typeValue: string,
  ) {
    const trackId = trackValue === 'none' ? undefined : Number(trackValue);

    if (
      typeValue !== ResourceType.THEORY &&
      typeValue !== ResourceType.PRACTICAL
    ) {
      await ctx.answerCbQuery('نوع الامتحان غير صحيح.');

      return;
    }

    const offerings = await this.examService.getCourseOfferingsWithExams({
      courseId,
      departmentId,
      levelId,
      termId,
      trackId,
    });

    const offering = offerings.find(
      (item) => item.academicYearId === academicYearId,
    );

    if (!offering) {
      await ctx.answerCbQuery('لم يتم العثور على المقرر.');

      return;
    }

    const exams = await this.examService.getExams(offering.id, typeValue);

    await ctx.answerCbQuery();

    if (!exams.length) {
      await ctx.editMessageText(
        `
<b>لا توجد امتحانات متاحة</b>

لم يتم العثور على امتحانات من نوع
<b>${this.getTypeLabel(typeValue)}</b>
لهذا المقرر والسنة الدراسية.
        `.trim(),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'السابق',
                  callback_data: `se/${departmentId}`,
                },
              ],
            ],
          },
        },
      );

      return;
    }

    // Show sending status.
    await ctx.editMessageText(
      `
<b>جاري إرسال الامتحانات...</b>

<i>يتم الآن إرسال الملفات، يرجى الانتظار.</i>
      `.trim(),
      {
        parse_mode: 'HTML',
      },
    );

    let sentCount = 0;
    let failedCount = 0;

    // Copy every exam from the Telegram storage channel.
    for (const exam of exams) {
      try {
        await ctx.telegram.copyMessage(
          ctx.chat!.id,
          exam.telegramChatId,
          exam.telegramMessageId,
        );

        sentCount++;
      } catch (error) {
        failedCount++;

        console.error(`Failed to send exam ${exam.id}:`, error);

        try {
          await ctx.telegram.sendMessage(
            ctx.chat!.id,
            `
<b>تعذر إرسال أحد الامتحانات</b>

<b>${this.escapeHtml(exam.title)}</b>

<i>حدث خطأ أثناء إرسال هذا الملف، ويمكنك المحاولة مرة أخرى لاحقًا.</i>
            `.trim(),
            {
              parse_mode: 'HTML',
            },
          );
        } catch (sendError) {
          console.error(
            `Failed to send error message for exam ${exam.id}:`,
            sendError,
          );
        }
      }
    }

    // ============================================================
    // Final result
    // ============================================================

    if (failedCount === 0) {
      await ctx.telegram.sendMessage(
        ctx.chat!.id,
        `
<b>تم إرسال الامتحانات بنجاح</b>

<b>عدد الملفات:</b> ${sentCount}

<i>يمكنك الآن فتح الملفات مباشرة من المحادثة.</i>
        `.trim(),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'السابق',
                  callback_data: `se/${departmentId}`,
                },
              ],
              [
                {
                  text: 'الرئيسية',
                  callback_data: 'main_menu',
                },
              ],
            ],
          },
        },
      );

      return;
    }

    await ctx.telegram.sendMessage(
      ctx.chat!.id,
      `
<b>اكتمل إرسال الامتحانات</b>

<b>إجمالي الملفات:</b> ${exams.length}

<b>تم إرسال:</b> ${sentCount}

<b>تعذر إرسال:</b> ${failedCount}

<i>يمكنك إعادة المحاولة لإرسال الملفات التي تعذر إرسالها.</i>
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'السابق',
                callback_data: `se/${departmentId}`,
              },
            ],
            [
              {
                text: 'الرئيسية',
                callback_data: 'main_menu',
              },
            ],
          ],
        },
      },
    );
  }

  // ============================================================
  // Helpers
  // ============================================================

  private getTypeLabel(type: ResourceType): string {
    switch (type) {
      case ResourceType.THEORY:
        return 'نظري';

      case ResourceType.PRACTICAL:
        return 'عملي';

      default:
        return type;
    }
  }

  private formatAcademicYear(startYear: number, endYear: number): string {
    return `${startYear}-${endYear}`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
