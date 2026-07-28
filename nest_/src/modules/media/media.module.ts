import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaOptimizationService } from './optimization/media-optimization.service';
import { MediaOptimizationController } from './optimization/media-optimization.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MediaController, MediaOptimizationController],
  providers: [MediaService, MediaOptimizationService],
  exports: [MediaService, MediaOptimizationService],
})
export class MediaModule {}


