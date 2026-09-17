import { Markup } from 'telegraf';

export function trackKeyboard(
  tracks: { id: number; name: string }[],
  prefix: string,
) {
  return Markup.inlineKeyboard(
    tracks.map((track) => [
      Markup.button.callback(track.name, `${prefix}/${track.id}`),
    ]),
  );
}
