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
  // Main router
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
    if (parts.length === 1) {
      await this.showDepartments(ctx);
      return;
    }

    // sm/{departmentId}
    if (parts.length === 2) {
      await this.showLevels(ctx, Number(parts[1]));
      return;
    }

    // sm/{departmentId}/{levelId}
    if (parts.length === 3) {
      await this.showTerms(ctx, Number(parts[1]), Number(parts[2]));
      return;
    }

    // sm/{departmentId}/{levelId}/{termId}
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
❌ <b>لا توجد تخصصات متاحة حاليًا</b>

لم يتم العثور على أي تخصص يحتوي على مقررات أو مواد تعليمية.
        `.trim(),
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    await ctx.editMessageText(
      `
📚 <b>الملازم والمصادر التعليمية</b>

<b>الخطوة 1 من 7</b>

🎓 <b>اختر التخصص</b>

اختر تخصصك للانتقال إلى المستويات الدراسية والمقررات المتاحة.
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: departments.map((department) => [
            {
              text: `🎓 ${department.name}`,
              callback_data: `sm/${department.id}`,
            },
          ]),
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
      await ctx.answerCbQuery('❌ التخصص غير موجود.');
      return;
    }

    const levels = await this.academicService.getLevels();

    await ctx.answerCbQuery();

    if (!levels.length) {
      await ctx.editMessageText(
        `
❌ <b>لا توجد مستويات دراسية متاحة</b>

لم يتم إعداد المستويات الدراسية لهذا النظام حتى الآن.
        `.trim(),
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    await ctx.editMessageText(
      `
📚 <b>الملازم والمصادر التعليمية</b>

<b>الخطوة 2 من 7</b>

🎓 <b>التخصص:</b>
${this.escapeHtml(department.name)}

📖 <b>اختر المستوى الدراسي</b>

اختر المستوى للوصول إلى المقررات والمواد التعليمية الخاصة به.
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: levels.map((level) => [
            {
              text: `📖 ${level.name}`,
              callback_data: `sm/${departmentId}/${level.id}`,
            },
          ]),
        },
      },
    );
  }

  // ============================================================
  // 3. Terms
  // ============================================================

  private async showTerms(ctx: Context, departmentId: number, levelId: number) {
    const level = await this.academicService.getLevelById(levelId);

    if (!level) {
      await ctx.answerCbQuery('❌ المستوى غير موجود.');
      return;
    }

    const terms = await this.academicService.getTerms();

    await ctx.answerCbQuery();

    if (!terms.length) {
      await ctx.editMessageText(
        `
❌ <b>لا توجد أترام دراسية متاحة</b>

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
📚 <b>الملازم والمصادر التعليمية</b>

<b>الخطوة 3 من 7</b>

📖 <b>المستوى:</b>
${this.escapeHtml(level.name)}

🗓️ <b>اختر الترم الدراسي</b>

اختر الترم الذي تريد عرض مقرراته ومواده التعليمية.
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: terms.map((term) => [
            {
              text: `🗓️ ${term.name}`,
              callback_data: `sm/${departmentId}/${levelId}/${term.id}`,
            },
          ]),
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
      await ctx.answerCbQuery('❌ البيانات المحددة غير صحيحة.');
      return;
    }

    const isIT = department.name === 'تقنية معلومات';
    const needsTrack = isIT && (level.id === 3 || level.id === 4);

    if (needsTrack) {
      await this.showTracks(ctx, departmentId, levelId, termId);
      return;
    }

    // لا يوجد Track لهذا السياق
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
    const tracks =
      await this.academicService.getTracksByDepartmentId(departmentId);

    await ctx.answerCbQuery();

    const buttons = tracks.map((track) => [
      {
        text: `🎯 ${track.name}`,
        callback_data: `sm/${departmentId}/${levelId}/${termId}/${track.id}`,
      },
    ]);

    buttons.push([
      {
        text: '📚 بدون تراك',
        callback_data: `sm/${departmentId}/${levelId}/${termId}/none`,
      },
    ]);

    await ctx.editMessageText(
      `
📚 <b>الملازم والمصادر التعليمية</b>

<b>الخطوة 4 من 7</b>

🎯 <b>اختر التراك</b>

حدد المسار الأكاديمي الذي تريد عرض مقرراته ومواده التعليمية.

💡 <i>إذا لم يكن المقرر مرتبطًا بتراك، اختر «بدون تراك».</i>
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
    const trackId = trackValue === 'none' ? undefined : Number(trackValue);

    const courses = await this.materialService.getCoursesWithMaterials({
      departmentId,
      levelId,
      termId,
      trackId,
    });

    await ctx.answerCbQuery();

    if (!courses.length) {
      await ctx.editMessageText(
        `
❌ <b>لا توجد مقررات متاحة</b>

لم يتم العثور على مقررات تحتوي على مواد تعليمية لهذا الاختيار.

💡 <i>يمكنك الرجوع واختيار تخصص أو مستوى أو ترم آخر.</i>
        `.trim(),
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    await ctx.editMessageText(
      `
📚 <b>الملازم والمصادر التعليمية</b>

<b>الخطوة 5 من 7</b>

📖 <b>اختر المقرر</b>

اختر المقرر الذي تريد الاطلاع على ملازمه ومواده التعليمية.
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: courses.map((course) => [
            {
              text: `📘 ${course.name}`,
              callback_data: `sm/${departmentId}/${levelId}/${termId}/${trackValue}/${course.id}`,
            },
          ]),
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
    const trackId = trackValue === 'none' ? undefined : Number(trackValue);

    const offerings =
      await this.materialService.getCourseOfferingsWithMaterials({
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
❌ <b>لا توجد مواد لهذا المقرر</b>

لم يتم العثور على سنة دراسية تحتوي على مواد تعليمية متاحة لهذا المقرر.
        `.trim(),
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    await ctx.editMessageText(
      `
📚 <b>الملازم والمصادر التعليمية</b>

<b>الخطوة 6 من 7</b>

📅 <b>اختر السنة الدراسية</b>

حدد السنة الدراسية التي تريد عرض المواد المتوفرة فيها.
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: offerings.map((offering) => [
            {
              text: `📅 ${this.formatAcademicYear(
                offering.academicYear.startYear,
                offering.academicYear.endYear,
              )}`,
              callback_data: `sm/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${offering.academicYearId}`,
            },
          ]),
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
    const trackId = trackValue === 'none' ? undefined : Number(trackValue);

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
      await ctx.answerCbQuery('❌ السنة الدراسية غير موجودة.');
      return;
    }

    const types = await this.materialService.getTypesByCourseOffering(
      offering.id,
    );

    await ctx.answerCbQuery();

    if (!types.length) {
      await ctx.editMessageText(
        `
❌ <b>لا توجد مواد متاحة</b>

لا توجد ملفات تعليمية متاحة لهذا المقرر في السنة الدراسية المحددة.
        `.trim(),
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    await ctx.editMessageText(
      `
📚 <b>الملازم والمصادر التعليمية</b>

<b>الخطوة 7 من 7</b>

📂 <b>اختر نوع المادة</b>

اختر نوع الملفات التي تريد استلامها:

📘 <b>نظري</b> — المحاضرات والملازم النظرية
🧪 <b>عملي</b> — المعامل والتطبيقات العملية
      `.trim(),
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: types.map((type) => [
            {
              text: this.getTypeLabel(type),
              callback_data: `sm/${departmentId}/${levelId}/${termId}/${trackValue}/${courseId}/${academicYearId}/${type}`,
            },
          ]),
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
      await ctx.answerCbQuery('❌ نوع المادة غير صحيح.');
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
      await ctx.answerCbQuery('❌ لم يتم العثور على المقرر.');
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
❌ <b>لا توجد ملفات متاحة</b>

لم يتم العثور على ملفات من نوع
<b>${this.getTypeLabel(typeValue)}</b>
لهذا المقرر والسنة الدراسية.
        `.trim(),
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    // رسالة حالة الإرسال
    await ctx.editMessageText(
      `
📚 <b>جاري تجهيز الملفات</b>

تم العثور على <b>${materials.length}</b> ملفًا.

⏳ <i>يرجى الانتظار... سيتم إرسال الملفات واحدًا تلو الآخر.</i>
      `.trim(),
      {
        parse_mode: 'HTML',
      },
    );

    let sentCount = 0;
    let failedCount = 0;

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
⚠️ <b>تعذر إرسال أحد الملفات</b>

📄 <b>${this.escapeHtml(material.title)}</b>

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
✅ <b>تم إرسال جميع الملفات بنجاح</b>

📚 <b>عدد الملفات:</b> ${sentCount}

يمكنك الآن فتح الملفات مباشرة من المحادثة.
        `.trim(),
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    await ctx.telegram.sendMessage(
      ctx.chat!.id,
      `
⚠️ <b>اكتمل إرسال الملفات</b>

📚 <b>إجمالي الملفات:</b> ${materials.length}
✅ <b>تم إرسال:</b> ${sentCount}
❌ <b>تعذر إرسال:</b> ${failedCount}

<i>يمكنك إعادة المحاولة للحصول على الملفات التي تعذر إرسالها.</i>
      `.trim(),
      {
        parse_mode: 'HTML',
      },
    );
  }

  // ============================================================
  // Helpers
  // ============================================================

  private getTypeLabel(type: ResourceType): string {
    switch (type) {
      case ResourceType.THEORY:
        return '📘 نظري';

      case ResourceType.PRACTICAL:
        return '🧪 عملي';

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
