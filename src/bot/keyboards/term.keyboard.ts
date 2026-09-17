import { Markup } from 'telegraf';

export function termKeyboard(
  terms: {
    id: number;
    name: string;
  }[],
  prefix: string,
) {
  return Markup.inlineKeyboard(
    terms.map((term) => [
      Markup.button.callback(term.name, `${prefix}/${term.id}`),
    ]),
  );
}
