import { Update, Action, Ctx } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';

@Update()
export class AdminExamsHandler {
  @Action('admin_exams')
  async handleAdminExams(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ إضافة امتحان', 'ae'),
        Markup.button.callback('🗑️ حذف امتحان', 'de'),
      ],
      [Markup.button.callback('🔙 العودة للقائمة الرئيسية', 'main_menu')],
    ]);

    await ctx.editMessageText(
      '📝 **قسم إدارة الامتحانات والاختبارات:**\nاختر الإجراء المطلوب:',
      {
        parse_mode: 'Markdown',
        ...keyboard,
      },
    );
  }
}
