import { Action, Ctx, Update } from 'nestjs-telegraf';

import { Context } from 'telegraf';

import { ResourceType } from '@prisma/client';

import { AcademicService } from 'src/academic/services/academic.services';

import { MaterialService } from 'src/material/services/material.service';

@Update()
export class MaterialsHandler {
  constructor(
    private readonly materialService: MaterialService,
    private readonly academicService: AcademicService,
  ) {}

  // ============================================================
  // Main callback router
  // ============================================================

  @Action(/^sm(?:\/.*)?$/)
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

    // sm
    // Departments
    if (parts.length === 1) {
      await this.showDepartments(ctx);
      return;
    }

    // sm/{departmentId}
    // Levels
    if (parts.length === 2) {
      await this.showLevels(ctx, Number(parts[1]));
      return;
    }

    // sm/{departmentId}/{levelId}
    // Terms
    if (parts.length === 3) {
      await this.showTerms(ctx, Number(parts[1]), Number(parts[2]));
      return;
    }

    // sm/{departmentId}/{levelId}/{termId}
    // Track or courses
    if (parts.length === 4) {
      await this.handleAfterTerm(
        ctx,
        Number(parts[1]),
        Number(parts[2]),
        Number(parts[3]),
      );
      return;
    }

    // sm/{departmentId}/{levelId}/{termId}/{trackId|none}
    // Courses
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

    // sm/{departmentId}/{levelId}/{termId}/{trackId|none}/{courseId}
    // Academic years
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

    // sm/{departmentId}/{levelId}/{termId}/{trackId|none}/{courseId}/{academicYearId}
    // Material types
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

    // sm/{departmentId}/{levelId}/{termId}/{trackId|none}/{courseId}/{academicYearId}/{type}
    // Send materials
    if (parts.length === 8) {
      await this.sendMaterials(
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
<b>لا توجد تخصصات متاحة</b>

لم يتم العثور على تخصصات تحتوي على مقررات أو مواد تعليمية.
        `.trim(),
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    await ctx.editMessageText(
      `
<b>اختيار ملزمة</b>

<b>اختر التخصص</b>

اختر تخصصك للوصول إلى المستويات والمقررات المتاحة.
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...departments.map((department) => [
              {
                text: department.name,
                callback_data: `sm/${department.id}`,
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
<b>لا توجد مستويات متاحة</b>

لم يتم إعداد المستويات الدراسية في النظام حتى الآن.
        `.trim(),
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    await ctx.editMessageText(
      `
<b>اختيار ملزمة</b>

<b>التخصص:</b> ${this.escapeHtml(department.name)}

<b>اختر المستوى</b>

اختر المستوى الدراسي للوصول إلى الفصول والمقررات.
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...levels.map((level) => [
              {
                text: level.name,
                callback_data: `sm/${departmentId}/${level.id}`,
              },
            ]),
            [
              {
                text: 'السابق',
                callback_data: 'sm',
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
<b>لا توجد فصول دراسية متاحة</b>

لم يتم إعداد الفصول الدراسية في النظام حتى الآن.
        `.trim(),
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    await ctx.editMessageText(
      `
<b>اختيار ملزمة</b>

<b>التخصص:</b> ${this.escapeHtml(department.name)}
<b>المستوى:</b> ${this.escapeHtml(level.name)}

<b>اختر الفصل</b>

اختر الترم الذي تريد عرض مقرراته.
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...terms.map((term) => [
              {
                text: term.name,
                callback_data: `sm/${departmentId}/${levelId}/${term.id}`,
              },
            ]),
            [
              {
                text: 'السابق',
                callback_data: `sm/${departmentId}`,
              },
            ],
          ],
        },
      },
    );
  }

  // ============================================================
  // 4. After term
  // Track is required only for IT level 3/4
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
      await ctx.editMessageText(
        `
<b>لا توجد مسارات متاحة</b>

لا توجد مسارات مرتبطة بهذا التخصص والمستوى.
        `.trim(),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'السابق',
                  callback_data: `sm/${departmentId}`,
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
<b>اختيار ملزمة</b>

<b>التخصص:</b> ${this.escapeHtml(department.name)}
<b>المستوى:</b> ${this.escapeHtml(level.name)}
<b>الفصل:</b> ${this.escapeHtml(term.name)}

<b>اختر المسار</b>

اختر المسار الأكاديمي لعرض المقررات الخاصة به.
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...tracks.map((track) => [
              {
                text: track.name,
                callback_data: `sm/${departmentId}/${levelId}/${termId}/${track.id}`,
              },
            ]),
            [
              {
                text: 'السابق',
                callback_data: `sm/${departmentId}/${levelId}`,
              },
            ],
          ],
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

      const track = tracks.find((item) => item.id === trackId);

      trackName = track?.name;
    }

    const courses = await this.materialService.getCoursesWithMaterials({
      departmentId,
      levelId,
      termId,
      trackId,
    });

    await ctx.answerCbQuery();

    const contextLines = [
      `<b>التخصص:</b> ${this.escapeHtml(department.name)}`,
      `<b>المستوى:</b> ${this.escapeHtml(level.name)}`,
      `<b>الفصل:</b> ${this.escapeHtml(term.name)}`,
    ];

    if (trackName) {
      contextLines.push(`<b>المسار:</b> ${this.escapeHtml(trackName)}`);
    }

    if (!courses.length) {
      await ctx.editMessageText(
        `
<b>لا توجد مقررات متاحة</b>

${contextLines.join('\n')}

لم يتم العثور على مقررات تحتوي على مواد تعليمية لهذا الاختيار.
        `.trim(),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'السابق',
                  callback_data: `sm/${departmentId}`,
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
<b>اختيار ملزمة</b>

${contextLines.join('\n')}

<b>اختر المقرر</b>

اختر المقرر الذي تريد عرض ملازمه ومواده التعليمية.
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...courses.map((course) => [
              {
                text: course.name,
                callback_data: `sm/${departmentId}/${levelId}/${termId}/${trackValue}/${course.id}`,
              },
            ]),
            [
              {
                text: 'السابق',
                callback_data: `sm/${departmentId}`,
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

      const track = tracks.find((item) => item.id === trackId);

      trackName = track?.name;
    }

    const courses = await this.materialService.getCoursesWithMaterials({
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

    const offerings =
      await this.materialService.getCourseOfferingsWithMaterials({
        courseId,
        departmentId,
        levelId,
        termId,
        trackId,
      });

    await ctx.answerCbQuery();

    const contextLines = [
      `<b>التخصص:</b> ${this.escapeHtml(department.name)}`,
      `<b>المستوى:</b> ${this.escapeHtml(level.name)}`,
      `<b>الفصل:</b> ${this.escapeHtml(term.name)}`,
    ];

    if (trackName) {
      contextLines.push(`<b>المسار:</b> ${this.escapeHtml(trackName)}`);
    }

    contextLines.push(`<b>المقرر:</b> ${this.escapeHtml(course.name)}`);

    if (!offerings.length) {
      await ctx.editMessageText(
        `
<b>لا توجد سنوات دراسية متاحة</b>

${contextLines.join('\n')}

لم يتم العثور على سنة دراسية تحتوي على مواد تعليمية لهذا المقرر.
        `.trim(),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'السابق',
                  callback_data: `sm/${departmentId}`,
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
<b>اختيار ملزمة</b>

${contextLines.join('\n')}

<b>اختر السنة الدراسية</b>

حدد السنة الدراسية التي تريد عرض المواد المتوفرة فيها.
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
                callback_data: `sm/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${offering.academicYearId}`,
              },
            ]),
            [
              {
                text: 'السابق',
                callback_data: `sm/${departmentId}`,
              },
            ],
          ],
        },
      },
    );
  }

  // ============================================================
  // 8. Material types
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

      const track = tracks.find((item) => item.id === trackId);

      trackName = track?.name;
    }

    const courses = await this.materialService.getCoursesWithMaterials({
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

    const offerings =
      await this.materialService.getCourseOfferingsWithMaterials({
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

    const types = await this.materialService.getTypesByCourseOffering(
      offering.id,
    );

    await ctx.answerCbQuery();

    const contextLines = [
      `<b>التخصص:</b> ${this.escapeHtml(department.name)}`,
      `<b>المستوى:</b> ${this.escapeHtml(level.name)}`,
      `<b>الفصل:</b> ${this.escapeHtml(term.name)}`,
    ];

    if (trackName) {
      contextLines.push(`<b>المسار:</b> ${this.escapeHtml(trackName)}`);
    }

    contextLines.push(
      `<b>المقرر:</b> ${this.escapeHtml(course.name)}`,
      `<b>السنة:</b> ${this.formatAcademicYear(
        offering.academicYear.startYear,
        offering.academicYear.endYear,
      )}`,
    );

    if (!types.length) {
      await ctx.editMessageText(
        `
<b>لا توجد مواد متاحة</b>

${contextLines.join('\n')}

لا توجد ملفات تعليمية متاحة لهذا المقرر في السنة الدراسية المحددة.
        `.trim(),
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'السابق',
                  callback_data: `sm/${departmentId}`,
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
<b>اختيار ملزمة</b>

${contextLines.join('\n')}

<b>اختر نوع المادة</b>

اختر نوع الملفات التي تريد استلامها.
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            ...types.map((type) => [
              {
                text: this.getTypeLabel(type),
                callback_data: `sm/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${academicYearId}/${type}`,
              },
            ]),
            [
              {
                text: 'السابق',
                callback_data: `sm/${departmentId}`,
              },
            ],
          ],
        },
      },
    );
  }

  // ============================================================
  // 9. Send materials
  // ============================================================

  private async sendMaterials(
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
      await ctx.answerCbQuery('نوع المادة غير صحيح.');
      return;
    }

    const offerings =
      await this.materialService.getCourseOfferingsWithMaterials({
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

    const materials = await this.materialService.getMaterials(
      offering.id,
      typeValue,
    );

    await ctx.answerCbQuery();

    if (!materials.length) {
      await ctx.editMessageText(
        `
<b>لا توجد ملفات متاحة</b>

لم يتم العثور على ملفات من نوع

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
                  callback_data: `sm/${departmentId}`,
                },
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

    // Show a simple sending status without displaying the number of files.
    await ctx.editMessageText(
      `
<b>جاري الإرسال...</b>

<i>يتم الآن إرسال الملفات، يرجى الانتظار.</i>
      `.trim(),
      {
        parse_mode: 'HTML',
      },
    );

    let sentCount = 0;
    let failedCount = 0;

    // Copy every material from the Telegram storage channel.
    for (const material of materials) {
      try {
        await ctx.telegram.copyMessage(
          ctx.chat!.id,
          material.telegramChatId,
          material.telegramMessageId,
        );

        sentCount++;
      } catch (error) {
        failedCount++;

        console.error(`Failed to send material ${material.id}:`, error);

        try {
          await ctx.telegram.sendMessage(
            ctx.chat!.id,
            `
<b>تعذر إرسال أحد الملفات</b>

<b>${this.escapeHtml(material.title)}</b>

<i>حدث خطأ أثناء إرسال هذا الملف، ويمكنك المحاولة مرة أخرى لاحقًا.</i>
            `.trim(),
            {
              parse_mode: 'HTML',
            },
          );
        } catch (sendError) {
          console.error(
            `Failed to send error message for material ${material.id}:`,
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
<b>تم إرسال الملازم بنجاح</b>

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
                  callback_data: `sm/${departmentId}`,
                },
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
<b>اكتمل إرسال الملازم</b>

<b>إجمالي الملفات:</b> ${materials.length}
<b>تم إرسال:</b> ${sentCount}
<b>تعذر إرسال:</b> ${failedCount}

<i>يمكنك إعادة المحاولة للحصول على الملفات التي تعذر إرسالها.</i>
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'السابق',
                callback_data: `sm/${departmentId}`,
              },
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
