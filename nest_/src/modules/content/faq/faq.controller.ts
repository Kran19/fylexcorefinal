import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { FaqService } from './faq.service';
import { AdminRoleGuard } from '../../../common/guards/admin-role.guard';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post()
  @UseGuards(AdminRoleGuard)
  create(@Body() createFaqDto: any) {
    return this.faqService.create(createFaqDto);
  }

  @Get()
  findAll() {
    return this.faqService.findAll();
  }

  @Get('active')
  findActive() {
    return this.faqService.findAll(true);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faqService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(AdminRoleGuard)
  update(@Param('id') id: string, @Body() updateFaqDto: any) {
    return this.faqService.update(+id, updateFaqDto);
  }

  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.faqService.remove(+id);
  }
}
