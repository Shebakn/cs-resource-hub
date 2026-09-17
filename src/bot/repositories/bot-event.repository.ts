import { Injectable } from '@nestjs/common';
import { BotEventType } from '@prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BotEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: number) {
    return this.prisma.botEvent.findUnique({
      where: {
        userId,
      },
    });
  }

  async create(data: {
    userId: number;
    chatId: string;
    messageId: number;
    event: BotEventType;
  }) {
    return this.prisma.botEvent.create({
      data,
    });
  }

  async upsert(data: {
    userId: number;
    chatId: string;
    messageId: number;
    event: BotEventType;
  }) {
    return this.prisma.botEvent.upsert({
      where: {
        userId: data.userId,
      },

      create: data,

      update: {
        chatId: data.chatId,
        messageId: data.messageId,
        event: data.event,
        createdAt: new Date(),
      },
    });
  }

  async updateEvent(
    userId: number,
    data: {
      chatId?: string;
      messageId?: number;
      event?: BotEventType;
      createdAt?: Date;
    },
  ) {
    return this.prisma.botEvent.update({
      where: { userId },
      data,
    });
  }

  async delete(userId: number) {
    return this.prisma.botEvent.deleteMany({
      where: {
        userId,
      },
    });
  }

  async deleteExpired(before: Date) {
    return this.prisma.botEvent.deleteMany({
      where: {
        createdAt: {
          lt: before,
        },
      },
    });
  }

  async findExpired(before: Date) {
    return this.prisma.botEvent.findMany({
      where: {
        createdAt: {
          lt: before,
        },
      },
    });
  }
}
