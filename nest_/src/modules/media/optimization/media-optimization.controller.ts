import { Controller, Get, Post, Param, Body, Put } from '@nestjs/common';
import { MediaOptimizationService } from './media-optimization.service';

@Controller('media/optimization')
export class MediaOptimizationController {
  constructor(private readonly service: MediaOptimizationService) {}

  @Get('dashboard')
  async getDashboardStats() {
    return this.service.getDashboardStats();
  }

  @Get('storage')
  async getStorageAnalytics() {
    return this.service.getStorageAnalytics();
  }

  @Get('logs')
  async getOptimizationLogs() {
    return this.service.getOptimizationLogs();
  }

  @Post('process/:id')
  async optimizeSingle(
    @Param('id') id: string,
    @Body('format') format: 'webp' | 'avif' | 'jpeg' = 'webp',
    @Body('quality') quality: number = 80,
    @Body('preset') preset: string = 'balanced'
  ) {
    return this.service.optimizeMediaAsset(Number(id), format, quality, preset);
  }

  @Post('bulk')
  async bulkOptimize(
    @Body('format') format: 'webp' | 'avif' = 'webp',
    @Body('quality') quality: number = 80
  ) {
    return this.service.bulkOptimize(format, quality);
  }

  @Put('serve-mode/:id')
  async updateServeMode(
    @Param('id') id: string,
    @Body('serveMode') serveMode: string
  ) {
    return this.service.updateServeMode(Number(id), serveMode);
  }
}
