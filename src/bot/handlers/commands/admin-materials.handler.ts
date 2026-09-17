import { Update, Action, Ctx } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';

@Update()
export class AdminMaterialsHandler {
  @Action('admin_materials')
  async handleAdminMaterials(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ إضافة ملزمة', 'am'),
        Markup.button.callback('🗑️ حذف ملزمة', 'dm'),
      ],
      [Markup.button.callback('🔙 العودة للقائمة الرئيسية', 'main_menu')],
    ]);

    await ctx.editMessageText(
      '📂 **قسم إدارة الملازم والمقررات:**\nاختر الإجراء المطلوب:',
      {
        parse_mode: 'Markdown',
        ...keyboard,
      },
    );
  }
}
