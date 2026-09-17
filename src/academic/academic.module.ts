import { Module } from '@nestjs/common';

import { AcademicService } from './services/academic.services';

import { DepartmentRepository } from './repositories/department.repository';
import { LevelRepository } from './repositories/level.repository';
import { TermRepository } from './repositories/term.repository';
import { AcademicYearRepository } from './repositories/academic-year.repository';
import { TrackRepository } from './repositories/track.repository';
import { CourseOfferingRepository } from './repositories/course-offering.repository';

@Module({
  providers: [
    AcademicService,

    DepartmentRepository,
    LevelRepository,
    TermRepository,
    AcademicYearRepository,
    TrackRepository,
    CourseOfferingRepository,
  ],

  exports: [AcademicService],
})
export class AcademicModule {}
