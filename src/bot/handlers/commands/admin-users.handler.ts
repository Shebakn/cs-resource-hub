import { Update, Action, Ctx } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';

@Update()
export class AdminUsersHandler {
  @Action('admin_users')
  async handleAdminUsers(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('⬆️ ترقية مشرف', 'puh'),
        Markup.button.callback('⬇️ تنزيل مشرف', 'dah'),
      ],
      [Markup.button.callback('❌ حذف مستخدم', 'admin_delete_user')],
      [Markup.button.callback('🔙 العودة للقائمة الرئيسية', 'main_menu')],
    ]);

    await ctx.editMessageText(
      '👥 **قسم إدارة المستخدمين:**\nاختر الإجراء المطلوب:',
      {
        parse_mode: 'Markdown',
        ...keyboard,
      },
    );
  }
}
