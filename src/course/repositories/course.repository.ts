import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.course.findMany({
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findById(id: number) {
    return this.prisma.course.findUnique({
      where: {
        id,
      },
    });
  }

  async findByName(name: string) {
    return this.prisma.course.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
  }

  async searchByName(name: string) {
    return this.prisma.course.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(data: { name: string; code?: string }) {
    return this.prisma.course.create({
      data: {
        name: data.name,
        code: data.code,
      },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      code?: string;
    },
  ) {
    return this.prisma.course.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.course.delete({
      where: {
        id,
      },
    });
  }
}
