import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';

import { CourseService } from './services/course.service';
import { CourseRepository } from './repositories/course.repository';

@Module({
  imports: [PrismaModule],
  providers: [CourseService, CourseRepository],
  exports: [CourseService],
})
export class CourseModule {}
