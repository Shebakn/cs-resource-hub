import { Markup } from 'telegraf';

export function materialCreationCancelKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '✅ نعم، إلغاء والبدء من جديد',
        'adm/material/restart',
      ),
    ],
    [
      Markup.button.callback(
        '↩️ متابعة العملية الحالية',
        'adm/material/continue',
      ),
    ],
  ]);
}

export function materialCreationStartedKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('❌ إلغاء إضافة الملزمة', 'adm/material/cancel')],
  ]);
}
