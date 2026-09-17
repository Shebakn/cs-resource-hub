import { Markup } from 'telegraf';

export function departmentKeyboard(
  departments: { id: number; name: string }[],
  prefix: string,
) {
  return Markup.inlineKeyboard(
    departments.map((department) => [
      Markup.button.callback(department.name, `${prefix}/${department.id}`),
    ]),
  );
}
