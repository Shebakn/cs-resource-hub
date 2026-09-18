import { Markup } from 'telegraf';

export function courseKeyboard(
  courses: {
    id: number;
    name: string;
  }[],
  prefix: string,
  page: number,
  totalPages: number,
) {
  const buttons = courses.map((course) => [
    Markup.button.callback(course.name, `${prefix}/${course.id}`),
  ]);

  const pagination: ReturnType<typeof Markup.button.callback>[] = [];

  if (page > 1) {
    pagination.push(Markup.button.callback('⬅️ السابق', `${prefix}/prev`));
  }

  pagination.push(
    Markup.button.callback(`${page} / ${totalPages}`, `${prefix}/page`),
  );

  if (page < totalPages) {
    pagination.push(Markup.button.callback('التالي ➡️', `${prefix}/next`));
  }

  buttons.push(pagination);

  return Markup.inlineKeyboard(buttons);
}
