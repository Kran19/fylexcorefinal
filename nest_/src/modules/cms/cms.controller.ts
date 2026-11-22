import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CmsService } from './cms.service';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';

@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('banners')
  async getBanners(@Query('position') position?: string) {
    return this.cmsService.getBanners(position);
  }

  @Get('popups')
  async getActivePopups() {
    return this.cmsService.getActivePopups();
  }

  @Get('pages')
  async getAllPages() {
    return this.cmsService.getAllPages();
  }

  @Post('pages')
  @UseGuards(AdminRoleGuard)
  async createPage(@Body() data: any) {
    return this.cmsService.createPage(data);
  }

  @Put('pages/:id')
  @UseGuards(AdminRoleGuard)
  async updatePage(@Param('id') id: string, @Body() data: any) {
    return this.cmsService.updatePage(Number(id), data);
  }

  @Delete('pages/:id')
  @UseGuards(AdminRoleGuard)
  async deletePage(@Param('id') id: string) {
    return this.cmsService.deletePage(Number(id));
  }

  @Get('all-banners')
  @UseGuards(AdminRoleGuard)
  async getAllBanners() {
    return this.cmsService.getAllBanners();
  }

  @Post('banners')
  @UseGuards(AdminRoleGuard)
  async createBanner(@Body() data: any) {
    return this.cmsService.createBanner(data);
  }

  @Put('banners/:id')
  @UseGuards(AdminRoleGuard)
  async updateBanner(@Param('id') id: string, @Body() data: any) {
    return this.cmsService.updateBanner(Number(id), data);
  }

  @Delete('banners/:id')
  @UseGuards(AdminRoleGuard)
  async deleteBanner(@Param('id') id: string) {
    return this.cmsService.deleteBanner(Number(id));
  }

  @Get('testimonials')
  async getTestimonials() {
    return this.cmsService.getTestimonials();
  }

  @Post('testimonials')
  @UseGuards(AdminRoleGuard)
  async createTestimonial(@Body() data: any) {
    return this.cmsService.createTestimonial(data);
  }

  @Put('testimonials/:id')
  @UseGuards(AdminRoleGuard)
  async updateTestimonial(@Param('id') id: string, @Body() data: any) {
    return this.cmsService.updateTestimonial(Number(id), data);
  }

  @Delete('testimonials/:id')
  @UseGuards(AdminRoleGuard)
  async deleteTestimonial(@Param('id') id: string) {
    return this.cmsService.deleteTestimonial(Number(id));
  }

  @Get('home-sections')
  async getHomeSections() {
    return this.cmsService.getHomeSections();
  }

  @Post('home-sections')
  @UseGuards(AdminRoleGuard)
  async createHomeSection(@Body() data: any) {
    return this.cmsService.createHomeSection(data);
  }

  @Put('home-sections/:id')
  @UseGuards(AdminRoleGuard)
  async updateHomeSection(@Param('id') id: string, @Body() data: any) {
    return this.cmsService.updateHomeSection(Number(id), data);
  }

  @Delete('home-sections/:id')
  @UseGuards(AdminRoleGuard)
  async deleteHomeSection(@Param('id') id: string) {
    return this.cmsService.deleteHomeSection(Number(id));
  }

  @Get('community-images')
  async getCommunityImages() {
    return this.cmsService.getCommunityImages();
  }

  @Get('community-images/all')
  @UseGuards(AdminRoleGuard)
  async getAllCommunityImages() {
    return this.cmsService.getAllCommunityImages();
  }

  @Post('community-images')
  @UseGuards(AdminRoleGuard)
  async createCommunityImage(@Body() data: any) {
    return this.cmsService.createCommunityImage(data);
  }

  @Put('community-images/:id')
  @UseGuards(AdminRoleGuard)
  async updateCommunityImage(@Param('id') id: string, @Body() data: any) {
    return this.cmsService.updateCommunityImage(Number(id), data);
  }

  @Delete('community-images/:id')
  @UseGuards(AdminRoleGuard)
  async deleteCommunityImage(@Param('id') id: string) {
    return this.cmsService.deleteCommunityImage(Number(id));
  }
}
