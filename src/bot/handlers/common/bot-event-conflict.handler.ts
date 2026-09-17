import { Action, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

import { BotEventConflictService } from '../../services/bot-conflict.service';
import { BotEventService } from '../../services/bot-event.service';

@Update()
export class BotEventConflictHandler {
  constructor(
    private readonly botEventService: BotEventService,
    private readonly botEventConflictService: BotEventConflictService,
  ) {}

  // ============================================================
  // العودة للعملية القديمة
  // ============================================================
  //
  // هذا الـ Action أصبح عامًا.
  //
  // جميع العمليات تستخدم:
  //
  // bot-conflict/return
  //
  // بدل:
  //
  // ac/return
  // material/return
  // exam/return
  //
  // ============================================================

  @Action('bot-conflict/return')
  async returnToOld(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    await this.botEventConflictService.returnToOld(ctx);
  }

  // ============================================================
  // إلغاء القديمة
  // ============================================================
  //
  // هنا نحذف Event القديم فقط.
  //
  // ملاحظة:
  //
  // في هذه النسخة زر الإلغاء سيحذف العملية القديمة.
  // وبعدها يمكن للـ Handler الجديد بدء العملية الجديدة.
  //
  // ============================================================

  @Action('bot-conflict/cancel')
  async cancelOld(@Ctx() ctx: Context): Promise<void> {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    const deleted = this.botEventConflictService.cancelOld(userId);

    if (!deleted) {
      await ctx.reply('ℹ️ لا توجد عملية قديمة.\n\n' + 'يمكنك بدء عملية جديدة.');

      return;
    }

    await ctx.reply(
      '✅ تم إلغاء العملية القديمة.\n\n' + 'يمكنك الآن بدء عملية جديدة.',
    );
  }
}
