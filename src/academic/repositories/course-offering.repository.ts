import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CourseOfferingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number) {
    return this.prisma.courseOffering.findUnique({
      where: {
        id,
      },
      include: {
        course: true,
        academicYear: true,
        department: true,
        level: true,
        term: true,
        track: true,
      },
    });
  }

  async findByContext(params: {
    departmentId: number;
    trackId?: number;
    levelId: number;
    termId: number;
    academicYearId: number;
  }) {
    return this.prisma.courseOffering.findMany({
      where: {
        departmentId: params.departmentId,
        trackId: params.trackId ?? null,
        levelId: params.levelId,
        termId: params.termId,
        academicYearId: params.academicYearId,
      },
      include: {
        course: true,
        academicYear: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findCourses(params: {
    departmentId: number;
    trackId?: number;
    levelId: number;
    termId: number;
    academicYearId: number;
  }) {
    return this.prisma.courseOffering.findMany({
      where: {
        departmentId: params.departmentId,
        trackId: params.trackId ?? null,
        levelId: params.levelId,
        termId: params.termId,
        academicYearId: params.academicYearId,
      },
      include: {
        course: true,
      },
      orderBy: {
        course: {
          name: 'asc',
        },
      },
    });
  }

  async create(data: {
    courseId: number;
    departmentId: number;
    trackId?: number;
    levelId: number;
    termId: number;
    academicYearId: number;
  }) {
    return this.prisma.courseOffering.create({
      data: {
        courseId: data.courseId,
        departmentId: data.departmentId,
        trackId: data.trackId,
        levelId: data.levelId,
        termId: data.termId,
        academicYearId: data.academicYearId,
      },
      include: {
        course: true,
        academicYear: true,
      },
    });
  }

  async findOne(params: {
    courseId: number;
    departmentId: number;
    trackId?: number;
    levelId: number;
    termId: number;
    academicYearId: number;
  }) {
    return this.prisma.courseOffering.findFirst({
      where: {
        courseId: params.courseId,
        departmentId: params.departmentId,
        trackId: params.trackId ?? null,
        levelId: params.levelId,
        termId: params.termId,
        academicYearId: params.academicYearId,
      },
      include: {
        course: true,
        academicYear: true,
      },
    });
  }
}
