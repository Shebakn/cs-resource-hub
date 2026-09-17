import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';

import { MaterialService } from './services/material.service';
import { MaterialRepository } from './repositories/material.repository';

@Module({
  imports: [PrismaModule],
  providers: [MaterialService, MaterialRepository],
  exports: [MaterialService],
})
export class MaterialModule {}
