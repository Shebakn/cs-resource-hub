import { Markup } from 'telegraf';

export function levelKeyboard(
  levels: {
    id: number;
    name: string;
  }[],
  prefix: string,
) {
  console.log('On levels ');
  const buttons = levels.map((level) => [
    Markup.button.callback(level.name, `${prefix}/${level.id}`),
  ]);

  const previousPrefix = prefix.split('/').slice(0, -1).join('/');

  buttons.push([Markup.button.callback('⬅️ السابق', previousPrefix)]);

  return Markup.inlineKeyboard(buttons);
}
