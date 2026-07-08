import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { BoxService } from './box.service';

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
  async create(@Body() createBoxDto: any) {
    return { success: true, data: await this.boxService.create(createBoxDto) };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateBoxDto: any) {
    return { success: true, data: await this.boxService.update(+id, updateBoxDto) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return { success: true, data: await this.boxService.remove(+id) };
  }
}
