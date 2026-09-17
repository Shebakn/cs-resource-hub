import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';
import { UserRepository } from './repositories/user.repository';
import { UsersService } from './services/user.service';

@Module({
  imports: [PrismaModule],
  providers: [UsersService, UserRepository],
  exports: [UsersService],
})
export class UsersModule {}
