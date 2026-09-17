import { Injectable } from '@nestjs/common';

import { UserRepository } from '../repositories/user.repository';
import { CreateOrUpdateUserDto } from '../dto/create-or-update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  // Create or update
  async createOrUpdate(data: CreateOrUpdateUserDto) {
    return await this.userRepository.createOrUpdate(data);
  }

  // get all users
  async getAll() {
    return await this.userRepository.getAll();
  }

  // Get by telegram id
  async getByTelegramId(id: string) {
    return await this.userRepository.getByTelegramId(id);
  }

  // Get by telegram id
  async getByUsername(username: string) {
    return await this.userRepository.getByUsername(username);
  }

  // check if admin
  async isAdmin(id: string) {
    const user = await this.getByTelegramId(id);
    return user?.isAdmin;
  }

  // Update admin status
  async updateRole(id: string, isAdmin: boolean) {
    return await this.userRepository.updateRole(id, isAdmin);
  }

  // Delete User
  async delete(id: string) {
    return this.userRepository.delete(id);
  }

  // Restore User
  async restore(id: string) {
    return this.userRepository.restore(id);
  }
}
