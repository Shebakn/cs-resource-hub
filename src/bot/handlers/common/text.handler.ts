import { Ctx, On, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

import {
  BotEventService,
  BotEventType,
} from 'src/bot/services/bot-event.service';
import { AddMaterialHandler } from '../admin/materials/add-material.handler';
//import { AddCourseHandler } from '../admin/courses/add-course.handler';
import { EditCourseHandler } from '../admin/courses/edit-course.handler';
import { AddExamHandler } from '../admin/exams/add-exam.handler';
import { PromoteUserHandler } from '../admin/users/promote-user.handler';
import { DemoteAdminHandler } from '../admin/users/demote-user.handler';
@Update()
export class CentralTextHandler {
  constructor(
    private readonly botEventService: BotEventService,
    //  private readonly addCourseHandler: AddCourseHandler,
    private readonly editCourseHandler: EditCourseHandler,
    private readonly addMaterialHandler: AddMaterialHandler,
    private readonly addExamHandler: AddExamHandler,
    private readonly pomoteUserHandler: PromoteUserHandler,
    private readonly demoteAdminHandler: DemoteAdminHandler,
  ) {}

  @On('text')
  async handleText(@Ctx() ctx: Context): Promise<void> {
    // ============================================================
    // الحصول على User ID
    // ============================================================
    console.log('IN TEXT Handler');

    const userId = ctx.from?.id;

    if (!userId) {
      return;
    }

    // ============================================================
    // التأكد أن الرسالة تحتوي على Text
    // ============================================================

    console.log('TEXT: ', ctx.message);

    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }

    // ============================================================
    // الحصول على Event
    // ============================================================

    const event = this.botEventService.get(userId);

    // لا توجد عملية قيد التنفيذ
    if (!event) {
      return;
    }

    // ============================================================
    // Routing
    // ============================================================

    switch (event.event) {
      // ==========================================================
      // إضافة كورس
      // ==========================================================

      case BotEventType.WAITING_COURSE_NAME:
        //await this.addCourseHandler.handleCourseName(ctx);
        return;

      // ==========================================================
      // تعديل كورس - اسم الكورس القديم
      // ==========================================================

      case BotEventType.WAITING_EDIT_COURSE_NAME:
        await this.editCourseHandler.handleCourseName(ctx);
        return;

      case BotEventType.WAITING_MATERIAL_TITLE:
        await this.addMaterialHandler.receiveTitle(ctx, ctx.message.text);
        return;

      case BotEventType.WAITING_EXAM_TITLE:
        await this.addExamHandler.receiveTitle(ctx, ctx.message.text);
        return;

      // ==========================================================
      // تعديل كورس - الاسم الجديد
      // ==========================================================

      case BotEventType.WAITING_EDIT_COURSE_NEW_NAME:
        await this.editCourseHandler.handleNewCourseName(ctx);
        return;

      case BotEventType.WAITING_PROMOTE_USER:
        await this.pomoteUserHandler.handleUsername(ctx);
        return;

      case BotEventType.WAITING_DEMOTE_ADMIN:
        await this.demoteAdminHandler.handleUsername(ctx);
        return;

      default:
        return;
    }
  }
}
