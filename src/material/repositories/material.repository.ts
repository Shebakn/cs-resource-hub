/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResourceType } from '@prisma/client';

@Injectable()
export class MaterialRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // Find Course Offerings with Materials
  // ============================================================

  async findCourseOfferingsWithMaterials(params: {
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

        materials: {
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
  // ============================================================
  // Find Courses with Materials
  // ============================================================

  async findCoursesWithMaterials(params: {
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

        materials: {
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

  // ============================================================
  // Create
  // ============================================================

  async create(data: {
    courseOfferingId: number;
    title: string;
    type: ResourceType;
    telegramChatId: string;
    telegramMessageId: number;
    telegramFileId?: string;
    caption?: string;
    sortOrder?: number;
  }) {
    return this.prisma.material.create({
      data: {
        courseOfferingId: data.courseOfferingId,
        title: data.title,
        type: data.type,

        telegramChatId: data.telegramChatId,
        telegramMessageId: data.telegramMessageId,
        telegramFileId: data.telegramFileId,

        caption: data.caption,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  // ============================================================
  // Find by Course Offering + Type
  // ============================================================

  async findByCourseOfferingType(courseOfferingId: number, type: ResourceType) {
    return this.prisma.material.findMany({
      where: {
        courseOfferingId,
        type,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  // ============================================================
  // Find Course Offerings that have Materials
  // ============================================================

  async findCourseOfferingsByCourse(courseId: number) {
    return this.prisma.courseOffering.findMany({
      where: {
        courseId,
        materials: {
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

  // ============================================================
  // Find Material Types by Course Offering
  // ============================================================

  async findTypesByCourseOffering(courseOfferingId: number) {
    const materials = await this.prisma.material.findMany({
      where: {
        courseOfferingId,
      },
      select: {
        type: true,
      },
      distinct: ['type'],
    });

    return materials.map((material) => material.type);
  }

  // ============================================================
  // Next Sort Order
  // ============================================================

  async getNextSortOrder(courseOfferingId: number, type: ResourceType) {
    const lastMaterial = await this.prisma.material.findFirst({
      where: {
        courseOfferingId,
        type,
      },
      orderBy: {
        sortOrder: 'desc',
      },
      select: {
        sortOrder: true,
      },
    });

    return (lastMaterial?.sortOrder ?? 0) + 1;
  }

  // ============================================================
  // Find By ID
  // ============================================================

  async findById(id: number) {
    return this.prisma.material.findUnique({
      where: {
        id,
      },
    });
  }

  // ============================================================
  // Delete
  // ============================================================

  async delete(id: number) {
    return this.prisma.material.delete({
      where: {
        id,
      },
    });
  }
}
