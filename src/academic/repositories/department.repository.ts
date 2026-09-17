import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findById(id: number) {
    return this.prisma.department.findUnique({
      where: {
        id,
      },
    });
  }
}
