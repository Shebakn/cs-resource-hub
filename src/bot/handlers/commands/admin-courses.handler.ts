import { Update, Action, Ctx } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';

@Update()
export class AdminCoursesHandler {
  @Action('admin_courses')
  async handleAdminCourses(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ إضافة كورس', 'ach'),
        Markup.button.callback('🗑️ حذف كورس', 'ec'),
      ],
      [Markup.button.callback('📌 إسناد كورس لفصل', 'ac')],
      [Markup.button.callback('🔙 العودة للقائمة الرئيسية', 'main_menu')],
    ]);

    await ctx.editMessageText(
      '📖 **قسم إدارة الكورسات:**\nاختر الإجراء المطلوب:',
      {
        parse_mode: 'Markdown',
        ...keyboard,
      },
    );
  }
}
