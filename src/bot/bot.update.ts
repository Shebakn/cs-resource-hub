// import { Logger } from '@nestjs/common';
// import { Update, Start, Command, Ctx } from 'nestjs-telegraf';
// import { Context } from 'telegraf';
// import { BotService } from './services/bot.service';

// @Update()
// export class BotUpdate {
//   private readonly logger = new Logger(BotUpdate.name);
//   constructor(private readonly botService: BotService) {}

//   @Start()
//   async start(@Ctx() ctx: Context) {
//     this.logger.log(ctx);
//     await ctx.reply(
//       'أهلاً بك في بوت كلية الحاسبات! 🎓\nاختر أحد الأوامر: /notes أو /exams',
//     );
//   }

//   @Command('notes')
//   async handleNotes(@Ctx() ctx: Context) {
//     const notes = this.botService.getNotesList();
//     await ctx.reply(notes);
//   }

//   @Command('exams')
//   async handleExams(@Ctx() ctx: Context) {
//     const exams = this.botService.getExamsList();
//     await ctx.reply(exams);
//   }
// }
