import { Markup } from 'telegraf';

export function levelKeyboard(
  levels: {
    id: number;
    name: string;
  }[],
  prefix: string,
) {
  return Markup.inlineKeyboard(
    levels.map((level) => [
      Markup.button.callback(level.name, `${prefix}/${level.id}`),
    ]),
  );
}
