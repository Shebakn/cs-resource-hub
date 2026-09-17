/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Action, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

import { UsersService } from 'src/user/services/user.service';

import {
  BotEventService,
  BotEventType,
} from 'src/bot/services/bot-event.service';

import { BotEventConflictService } from 'src/bot/services/bot-conflict.service';

@Update()
export class PromoteUserHandler {
  constructor(
    private readonly usersService: UsersService,
    private readonly botEventService: BotEventService,
    private readonly botEventConflictService: BotEventConflictService,
  ) {}

  // ============================================================
  // pu
  // بدء رفع مستخدم إلى Admin
  // ============================================================

  @Action('puh')
  async start(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    // ============================================================
    // Check existing event
    // ============================================================

    const existingEvent = this.botEventService.get(userId);

    if (existingEvent) {
      await this.botEventConflictService.showConflict(ctx, existingEvent);

      return;
    }

    // ============================================================
    // Start new operation
    // ============================================================

    await this.startNewPromote(ctx, userId);
  }

  // ============================================================
  // إنشاء عملية رفع المستخدم
  // ============================================================

  private async startNewPromote(ctx: Context, userId: number): Promise<void> {
    const message = await ctx.reply(
      '👤 <b>رفع مستخدم إلى أدمن</b>\n\n' +
        'أرسل Username المستخدم فقط:\n\n' +
        'مثال:\n' +
        '<code>@username</code>',
      {
        parse_mode: 'HTML',
      },
    );

    // ============================================================
    // تسجيل حالة المستخدم
    // ============================================================

    this.botEventService.set({
      userId,

      event: BotEventType.WAITING_PROMOTE_USER,

      messageId: message.message_id,

      chatId: String(ctx.chat?.id ?? ''),
    });
  }

  // ============================================================
  // استقبال Username
  // ============================================================

  async handleUsername(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }

    // ============================================================
    // Get Event
    // ============================================================

    const event = this.botEventService.get(userId);

    if (!event) {
      return;
    }

    // ============================================================
    // التأكد أن العملية تخص رفع Admin
    // ============================================================

    if (event.event !== BotEventType.WAITING_PROMOTE_USER) {
      return;
    }

    // ============================================================
    // Normalize username
    // ============================================================

    let username = ctx.message.text.trim();

    // إزالة @ إذا المستخدم أرسلها
    if (username.startsWith('@')) {
      username = username.substring(1);
    }

    username = username.trim();

    // ============================================================
    // Validation
    // ============================================================

    if (!username) {
      await ctx.reply(
        '❌ Username لا يمكن أن يكون فارغًا.\n\n' +
          'مثال:\n' +
          '<code>@username</code>',
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    if (username.length > 32) {
      await ctx.reply('❌ Username غير صالح.');

      return;
    }

    // Telegram usernames: letters, numbers and underscore
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      await ctx.reply(
        '❌ Username غير صالح.\n\n' +
          'استخدم Username مثل:\n' +
          '<code>@username</code>',
        {
          parse_mode: 'HTML',
        },
      );

      return;
    }

    // ============================================================
    // Search user
    // ============================================================

    const user = await this.usersService.getByUsername(username);

    if (!user) {
      await ctx.reply(
        `❌ لم يتم العثور على المستخدم <b>@${this.escapeHtml(username)}</b>.`,
        {
          parse_mode: 'HTML',
        },
      );

      // انتهاء العملية
      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // Check current role
    // ============================================================

    if (user.isAdmin) {
      await ctx.reply(
        `⚠️ المستخدم <b>@${this.escapeHtml(username)}</b> أدمن بالفعل.`,
        {
          parse_mode: 'HTML',
        },
      );

      this.botEventService.delete(userId);

      return;
    }

    // ============================================================
    // Promote
    // ============================================================

    const updatedUser = await this.usersService.updateRole(
      user.telegramId,
      true,
    );

    // ============================================================
    // End operation
    // ============================================================

    this.botEventService.delete(userId);

    // ============================================================
    // Result
    // ============================================================

    await ctx.reply(
      '✅ <b>تم رفع المستخدم إلى أدمن بنجاح</b>\n\n' +
        `👤 Username: <b>@${this.escapeHtml(
          updatedUser.username ?? username,
        )}</b>\n` +
        `👤 الاسم: <b>${this.escapeHtml(this.getUserName(updatedUser))}</b>\n` +
        `🆔 Telegram ID: <code>${updatedUser.telegramId}</code>`,
      {
        parse_mode: 'HTML',
      },
    );
  }

  // ============================================================
  // Helpers
  // ============================================================

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
