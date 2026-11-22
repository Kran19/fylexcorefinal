import { Controller, Get, Post, Param, Body, Put, Query, UseGuards } from '@nestjs/common';
import { MediaOptimizationService } from './media-optimization.service';
import { AdminRoleGuard } from '../../../common/guards/admin-role.guard';

@Controller('media/optimization')
@UseGuards(AdminRoleGuard)
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

  @Get('list')
  async getOptimizationAssetsList(@Query('sort') sort: string = 'size_desc') {
    return this.service.getOptimizationAssetsList(sort);
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
    @Body('preset') preset: string = 'web_fast',
  ) {
    return this.service.optimizeMediaAsset(Number(id), format, Number(quality) || 80, preset || 'web_fast');
  }

  @Post('accept/:id')
  async acceptVariant(@Param('id') id: string) {
    return this.service.acceptVariant(Number(id));
  }

  @Post('reject/:id')
  async rejectVariant(@Param('id') id: string) {
    return this.service.rejectVariant(Number(id));
  }

  @Post('bulk')
  async bulkOptimize(
    @Body('format') format: 'webp' | 'avif' = 'webp',
    @Body('quality') quality: number = 80,
    @Body('preset') preset: string = 'web_fast',
  ) {
    return this.service.bulkOptimize(format, Number(quality) || 80, preset || 'web_fast');
  }

  @Get('compare/:id')
  async getComparisonMetadata(@Param('id') id: string) {
    return this.service.getComparisonMetadata(Number(id));
  }

  @Post('merge-duplicates')
  async mergeDuplicates(
    @Body('masterId') masterId: number,
    @Body('duplicateIds') duplicateIds: number[],
  ) {
    return this.service.mergeDuplicates(masterId, duplicateIds);
  }

  @Get('purge-preview')
  async getPurgePreview() {
    return this.service.getPurgePreview();
  }

  @Post('purge')
  async executePurge(@Body('targetType') targetType: 'master_originals' | 'orphans' | 'duplicates' | 'all' = 'all') {
    return this.service.executePurge(targetType);
  }

  @Put('serve-mode/:id')
  async updateServeMode(@Param('id') id: string, @Body('serveMode') serveMode: string) {
    return this.service.updateServeMode(Number(id), serveMode);
  }
}
