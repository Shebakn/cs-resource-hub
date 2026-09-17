/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Action, Ctx, Start, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

import { UsersService } from 'src/user/services/user.service';
import { mainMenuKeyboard } from '../keyboards/main-menu.keyboard';

@Update()
export class StartHandler {
  constructor(private readonly usersService: UsersService) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    if (!ctx.from) {
      return;
    }

    const telegramId = ctx.from.id.toString();

    // حفظ أو تحديث بيانات المستخدم
    await this.usersService.createOrUpdate({
      telegramId,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      username: ctx.from.username,
    });

    const isAdmin = await this.usersService.isAdmin(telegramId);

    const welcomeMessage = `
<b>أهلاً وسهلاً بك ${ctx.from.first_name} 👋</b>

🎓 <b>مرحبًا بك في بوت ملازم كلية الحاسبات</b>

منصتك الأكاديمية الموحدة للوصول السريع إلى:
📚 الملازم والمقررات
📝 بنك الاختبارات
📖 المصادر التعليمية

👇 <i>اختر الخيار المناسب من القائمة أدناه:</i>
    `.trim();

    await ctx.reply(welcomeMessage, {
      parse_mode: 'HTML',
      ...mainMenuKeyboard(isAdmin),
    });
  }

  @Action('main_menu')
  async onMainMenu(@Ctx() ctx: Context) {
    if (!ctx.from) {
      return;
    }

    await ctx.answerCbQuery();

    const telegramId = ctx.from.id.toString();
    const isAdmin = await this.usersService.isAdmin(telegramId);

    const messageText = `
🏠 <b>القائمة الرئيسية</b>

مرحبًا بك مجددًا! 👋

اختر من القائمة أدناه للوصول إلى القسم المطلوب:
    `.trim();

    await ctx.editMessageText(messageText, {
      parse_mode: 'HTML',
      ...mainMenuKeyboard(isAdmin),
    });
  }
}
