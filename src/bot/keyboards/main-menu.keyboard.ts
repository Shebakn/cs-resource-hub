import { Markup } from 'telegraf';

export function mainMenuKeyboard(isAdmin: boolean = false) {
  // أزرار المستخدم العادي
  const userButtons = [
    [
      Markup.button.callback('📚 الملازم والمقررات', 'sm'),
      Markup.button.callback('📝 الاختبارات', 'se'),
    ],
    [
      Markup.button.callback('🔗 المصادر', 'er'),
      Markup.button.callback('ℹ️ عن البوت', 'ab'),
    ],
  ];

  // أزرار لوحة الإدارة (تظهر في الأعلى عند تفعيل isAdmin)
  const adminButtons = [
    [
      Markup.button.callback('📖 إدارة الكورسات', 'admin_courses'),
      Markup.button.callback('📂 إدارة الملازم', 'admin_materials'),
    ],
    [
      Markup.button.callback('📝 إدارة الامتحانات', 'admin_exams'),
      Markup.button.callback('👥 إدارة المستخدمين', 'admin_users'),
    ],
  ];

  // إذا كان مسؤولاً يتم وضع أزرار الإدارة أولاً ثم أزرار المستخدم
  const finalButtons = isAdmin
    ? [...adminButtons, ...userButtons]
    : userButtons;

  return Markup.inlineKeyboard(finalButtons);
}
