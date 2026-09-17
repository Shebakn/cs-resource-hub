/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TrackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.track.findMany({
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findById(id: number) {
    return this.prisma.track.findUnique({
      where: {
        id,
      },
    });
  }

  async findByDepartmentId(departmentId: number) {
    return this.prisma.track.findMany({
      where: {
        departmentId,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }
}
