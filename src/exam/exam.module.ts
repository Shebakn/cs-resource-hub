import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';

import { ExamRepository } from './repositories/exam.repository';
import { ExamService } from './services/exam.service';

@Module({
  imports: [PrismaModule],

  providers: [ExamRepository, ExamService],

  exports: [ExamService],
})
export class ExamModule {}
