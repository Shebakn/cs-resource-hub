import { Markup } from 'telegraf';

export function academicYearKeyboard(
  years: {
    id: number;
    startYear: number;
    endYear: number;
  }[],
  prefix: string,
) {
  return Markup.inlineKeyboard(
    years.map((year) => [
      Markup.button.callback(
        `${year.startYear} - ${year.endYear}`,
        `${prefix}/${year.id}`,
      ),
    ]),
  );
}
