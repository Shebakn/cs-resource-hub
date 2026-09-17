import { AdminUsersHandler } from './admin-users.handler';
import { AdminCoursesHandler } from './admin-courses.handler';
import { AdminMaterialsHandler } from './admin-materials.handler';
import { AdminExamsHandler } from './admin-exams.handler';

// تصدير كافة هاندلرز الأدمن
export const CommandHandlers = [
  AdminUsersHandler,
  AdminCoursesHandler,
  AdminMaterialsHandler,
  AdminExamsHandler,
  // باقي الهاندلرز الخاصة بك (EditCourseHandler, DeleteExamHandler, إلخ)...
];
