import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { BoxService } from './box.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async create(@Body() createBoxDto: any) {
    return { success: true, data: await this.boxService.create(createBoxDto) };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async update(@Param('id') id: string, @Body() updateBoxDto: any) {
    return { success: true, data: await this.boxService.update(+id, updateBoxDto) };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async remove(@Param('id') id: string) {
    return { success: true, data: await this.boxService.remove(+id) };
  }
}
