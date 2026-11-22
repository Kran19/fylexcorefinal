import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SystemService } from '../system/system.service';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';

@Controller('taxes')
export class TaxesController {
  constructor(private readonly systemService: SystemService) {}

  @Get()
  async getTaxes() {
    return this.systemService.getTaxes();
  }

  @Post()
  @UseGuards(AdminRoleGuard)
  async createTaxRate(@Body() data: any) {
    return this.systemService.createTaxRate(data);
  }

  @Get('classes')
  async getTaxClasses() {
    return this.systemService.getTaxClasses();
  }

  @Post('classes')
  @UseGuards(AdminRoleGuard)
  async createTaxClass(@Body() data: any) {
    return this.systemService.createTaxClass(data);
  }

  @Put('classes/:id')
  @UseGuards(AdminRoleGuard)
  async updateTaxClass(@Param('id') id: string, @Body() data: any) {
    return this.systemService.updateTaxClass(Number(id), data);
  }

  @Delete('classes/:id')
  @UseGuards(AdminRoleGuard)
  async deleteTaxClass(@Param('id') id: string) {
    return this.systemService.deleteTaxClass(Number(id));
  }

  @Put(':id')
  @UseGuards(AdminRoleGuard)
  async updateTaxRate(@Param('id') id: string, @Body() data: any) {
    return this.systemService.updateTaxRate(Number(id), data);
  }

  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  async deleteTaxRate(@Param('id') id: string) {
    return this.systemService.deleteTaxRate(Number(id));
  }
}
