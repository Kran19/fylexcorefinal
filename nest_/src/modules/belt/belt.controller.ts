import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { BeltService } from './belt.service';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';

@Controller('belts')
export class BeltController {
  constructor(private readonly beltService: BeltService) {}

  @Get()
  findAll() {
    return this.beltService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.beltService.findOne(+id);
  }

  @Post()
  @UseGuards(AdminRoleGuard)
  create(@Body() data: any) {
    return this.beltService.create(data);
  }

  @Put(':id')
  @UseGuards(AdminRoleGuard)
  update(@Param('id') id: string, @Body() data: any) {
    return this.beltService.update(+id, data);
  }

  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  remove(@Param('id') id: string) {
    return this.beltService.remove(+id);
  }
}
