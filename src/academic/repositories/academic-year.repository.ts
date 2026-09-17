import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AcademicYearRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.academicYear.findMany({
      orderBy: {
        startYear: 'desc',
      },
    });
  }

  async findById(id: number) {
    return this.prisma.academicYear.findUnique({
      where: {
        id,
      },
    });
  }
}
