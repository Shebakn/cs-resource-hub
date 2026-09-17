import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResourceType } from '@prisma/client';

@Injectable()
export class ExamRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // Student
  // ============================================================

  /**
   * Get course offerings that have exams for a course
   */
  async findCourseOfferingsByCourse(courseId: number) {
    return this.prisma.courseOffering.findMany({
      where: {
        courseId,
        exams: {
          some: {},
        },
      },
      include: {
        department: true,
        track: true,
        level: true,
        term: true,
        academicYear: true,
      },
      orderBy: {
        academicYear: {
          startYear: 'desc',
        },
      },
    });
  }

  /**
   * Get available exam types for a course offering
   */
  async findTypesByCourseOffering(courseOfferingId: number) {
    const exams = await this.prisma.exam.findMany({
      where: {
        courseOfferingId,
      },
      select: {
        type: true,
      },
      distinct: ['type'],
    });

    return exams.map((exam) => exam.type);
  }

  /**
   * Get exams by course offering + type
   */
  async findByCourseOfferingType(courseOfferingId: number, type: ResourceType) {
    return this.prisma.exam.findMany({
      where: {
        courseOfferingId,
        type,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  /**
   * Get exam by ID
   */
  async findById(id: number) {
    return this.prisma.exam.findUnique({
      where: {
        id,
      },
    });
  }

  // ============================================================
  // Admin
  // ============================================================

  /**
   * Create exam
   */
  async create(data: {
    courseOfferingId: number;
    title: string;
    type: ResourceType;
    telegramChatId: string;
    telegramMessageId: number;
    telegramFileId?: string;
    caption?: string;
  }) {
    return this.prisma.exam.create({
      data: {
        courseOfferingId: data.courseOfferingId,
        title: data.title,
        type: data.type,

        telegramChatId: data.telegramChatId,
        telegramMessageId: data.telegramMessageId,
        telegramFileId: data.telegramFileId,

        caption: data.caption,
      },
    });
  }

  /**
   * Update exam
   */
  async update(
    id: number,
    data: {
      title?: string;
      type?: ResourceType;
      caption?: string;
      telegramFileId?: string;
      telegramMessageId?: number;
      courseOfferingId?: number;
    },
  ) {
    return this.prisma.exam.update({
      where: {
        id,
      },
      data,
    });
  }

  /**
   * Delete exam
   */
  async delete(id: number) {
    return this.prisma.exam.delete({
      where: {
        id,
      },
    });
  }

  /**
   * Get all exams
   */
  async findAll() {
    return this.prisma.exam.findMany({
      include: {
        courseOffering: {
          include: {
            course: true,
            department: true,
            track: true,
            level: true,
            term: true,
            academicYear: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  /**
   * Get exams for admin by course
   */
  async findByCourse(courseId: number) {
    return this.prisma.exam.findMany({
      where: {
        courseOffering: {
          courseId,
        },
      },
      include: {
        courseOffering: {
          include: {
            department: true,
            track: true,
            level: true,
            term: true,
            academicYear: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  /**
   * Get exams for admin by academic year
   */
  async findByAcademicYear(academicYearId: number) {
    return this.prisma.exam.findMany({
      where: {
        courseOffering: {
          academicYearId,
        },
      },
      include: {
        courseOffering: {
          include: {
            course: true,
            department: true,
            track: true,
            level: true,
            term: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  /**
   * Get exams for admin by course + academic year
   */
  async findByCourseAndAcademicYear(courseId: number, academicYearId: number) {
    return this.prisma.exam.findMany({
      where: {
        courseOffering: {
          courseId,
          academicYearId,
        },
      },
      include: {
        courseOffering: {
          include: {
            department: true,
            track: true,
            level: true,
            term: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  /**
   * Get exams for admin by course offering + type
   */
  async findByCourseOfferingTypeForAdmin(
    courseOfferingId: number,
    type: ResourceType,
  ) {
    return this.prisma.exam.findMany({
      where: {
        courseOfferingId,
        type,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  // ============================================================
  // Student
  // ============================================================

  /**
   * Get unique courses that have exams for the selected context
   */
  async findCoursesWithExams(params: {
    departmentId: number;
    levelId: number;
    termId: number;
    trackId?: number;
  }) {
    const offerings = await this.prisma.courseOffering.findMany({
      where: {
        departmentId: params.departmentId,
        levelId: params.levelId,
        termId: params.termId,
        trackId: params.trackId ?? null,
        exams: {
          some: {},
        },
      },
      select: {
        courseId: true,
        course: true,
      },
      orderBy: {
        course: {
          name: 'asc',
        },
      },
    });

    const uniqueCourses = new Map<
      number,
      (typeof offerings)[number]['course']
    >();

    for (const offering of offerings) {
      if (!uniqueCourses.has(offering.courseId)) {
        uniqueCourses.set(offering.courseId, offering.course);
      }
    }

    return Array.from(uniqueCourses.values());
  }

  /**
   * Get course offerings that have exams
   * for the selected course + context
   */
  async findCourseOfferingsWithExams(params: {
    courseId: number;
    departmentId: number;
    levelId: number;
    termId: number;
    trackId?: number;
  }) {
    return this.prisma.courseOffering.findMany({
      where: {
        courseId: params.courseId,
        departmentId: params.departmentId,
        levelId: params.levelId,
        termId: params.termId,
        trackId: params.trackId ?? null,
        exams: {
          some: {},
        },
      },
      select: {
        id: true,
        courseId: true,
        departmentId: true,
        trackId: true,
        levelId: true,
        termId: true,
        academicYearId: true,
        academicYear: true,
      },
      orderBy: {
        academicYear: {
          startYear: 'desc',
        },
      },
    });
  }
}
