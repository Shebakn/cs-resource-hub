import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TermRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.term.findMany({
      orderBy: {
        number: 'asc',
      },
    });
  }

  async findById(id: number) {
    return this.prisma.term.findUnique({
      where: {
        id,
      },
    });
  }
}
