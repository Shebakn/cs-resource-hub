import { Markup } from 'telegraf';

export function resourceTypeKeyboard(prefix: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📘 نظري', `${prefix}/T`),
      Markup.button.callback('🛠️ عملي', `${prefix}/P`),
    ],
  ]);
}
