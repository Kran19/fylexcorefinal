import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { BoxService } from './box.service';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';

@Controller('boxes')
export class BoxController {
  constructor(private readonly boxService: BoxService) {}

  @Get()
  async findAll() {
    return { success: true, data: await this.boxService.findAll() };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { success: true, data: await this.boxService.findOne(+id) };
  }

  @Post()
  @UseGuards(AdminRoleGuard)
  async create(@Body() createBoxDto: any) {
    return { success: true, data: await this.boxService.create(createBoxDto) };
  }

  @Put(':id')
  @UseGuards(AdminRoleGuard)
  async update(@Param('id') id: string, @Body() updateBoxDto: any) {
    return { success: true, data: await this.boxService.update(+id, updateBoxDto) };
  }

  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  async remove(@Param('id') id: string) {
    return { success: true, data: await this.boxService.remove(+id) };
  }
}
