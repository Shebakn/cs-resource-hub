import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Create or update user (re-activates user if previously soft-deleted)
  async createOrUpdate(data: {
    telegramId: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  }) {
    return await this.prisma.user.upsert({
      where: {
        telegramId: data.telegramId,
      },
      create: {
        telegramId: data.telegramId,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        isDeleted: false, // إعادة تفعيل الحساب في حال قام المستخدم بحذف واستعادة البوت
        deletedAt: null,
      },
    });
  }

  // Get all active users (excludes soft-deleted)
  async getAll() {
    return await this.prisma.user.findMany({
      where: {
        isDeleted: false,
      },
    });
  }

  // Get active user by Telegram ID
  async getByTelegramId(id: string) {
    return await this.prisma.user.findFirst({
      where: {
        telegramId: id,
        isDeleted: false,
      },
    });
  }

  async getByUsername(username: string) {
    return await this.prisma.user.findFirst({
      where: {
        username: username,
        isDeleted: false,
      },
    });
  }

  // Update admin role
  async updateRole(id: string, isAdmin: boolean) {
    return await this.prisma.user.update({
      where: {
        telegramId: id,
      },
      data: {
        isAdmin: isAdmin,
      },
    });
  }

  // Soft delete user
  async delete(id: string) {
    return await this.prisma.user.update({
      where: {
        telegramId: id,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  // Restore soft-deleted user
  async restore(id: string) {
    return await this.prisma.user.update({
      where: {
        telegramId: id,
      },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    });
  }
}
