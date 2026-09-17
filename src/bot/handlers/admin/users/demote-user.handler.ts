/* eslint-disable @typescript-eslint/no-unused-vars */
import { Action, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

import { UsersService } from 'src/user/services/user.service';
import { BotEventService } from 'src/bot/services/bot-event.service';
import { BotEventConflictService } from 'src/bot/services/bot-conflict.service';
import { BotEventType } from 'src/bot/services/bot-event.service';

@Update()
export class DemoteAdminHandler {
  constructor(
    private readonly usersService: UsersService,
    private readonly botEventService: BotEventService,
    private readonly botEventConflictService: BotEventConflictService,
  ) {}

  @Action('dah')
  async start(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) return;

    const existingEvent = this.botEventService.get(userId);

    if (existingEvent) {
      await this.botEventConflictService.showConflict(ctx, existingEvent);
      return;
    }

    await this.startNewDemote(ctx, userId);
  }

  private async startNewDemote(ctx: Context, userId: number): Promise<void> {
    const message = await ctx.reply(
      '👤 <b>خفض أدمن إلى مستخدم عادي</b>\n\n' +
        'أرسل Username الأدمن فقط:\n\n' +
        'مثال:\n' +
        '<code>@username</code>',
      {
        parse_mode: 'HTML',
      },
    );

    this.botEventService.set({
      userId,
      event: BotEventType.WAITING_DEMOTE_ADMIN,
      messageId: message.message_id,
      chatId: String(ctx.chat?.id ?? ''),
    });
  }

  async handleUsername(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;

    if (!userId) return;

    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }

    const event = this.botEventService.get(userId);

    if (!event) return;

    if (event.event !== BotEventType.WAITING_DEMOTE_ADMIN) {
      return;
    }

    let username = ctx.message.text.trim();

    if (username.startsWith('@')) {
      username = username.substring(1);
    }

    username = username.trim();

    if (!username) {
      await ctx.reply('❌ أرسل Username صحيح.');
      return;
    }

    if (username.length > 32) {
      await ctx.reply('❌ Username غير صحيح.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      await ctx.reply('❌ Username غير صحيح.');
      return;
    }

    const user = await this.usersService.getByUsername(username);

    if (!user) {
      this.botEventService.delete(userId);

      await ctx.reply(
        `❌ لم يتم العثور على المستخدم <b>@${this.escapeHtml(username)}</b>.`,
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    if (!user.isAdmin) {
      this.botEventService.delete(userId);

      await ctx.reply(
        `ℹ️ المستخدم <b>@${this.escapeHtml(username)}</b> ليس أدمن أصلًا.`,
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    const updatedUser = await this.usersService.updateRole(
      user.telegramId,
      false,
    );

    this.botEventService.delete(userId);

    const name = this.getUserName(user);

    await ctx.reply(
      '✅ <b>تم خفض الأدمن بنجاح</b>\n\n' +
        `👤 المستخدم: <b>@${this.escapeHtml(username)}</b>\n` +
        `📛 الاسم: <b>${this.escapeHtml(name)}</b>\n` +
        `🔑 الحالة: مستخدم عادي`,
      {
        parse_mode: 'HTML',
      },
    );
  }

  private getUserName(user: {
    firstName?: string | null;
    lastName?: string | null;
  }): string {
    return (
      [user.firstName, user.lastName].filter(Boolean).join(' ') || 'غير معروف'
    );
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
