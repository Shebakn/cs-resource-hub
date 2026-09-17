import { Markup } from 'telegraf';

export function courseKeyboard(
  courses: {
    id: number;
    name: string;
  }[],
  prefix: string,
) {
  return Markup.inlineKeyboard(
    courses.map((course) => [
      Markup.button.callback(course.name, `${prefix}/${course.id}`),
    ]),
  );
}
