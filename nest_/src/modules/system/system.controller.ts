import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { AdminRoleGuard, extractVerifiedJwtUser } from '../../common/guards/admin-role.guard';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('inventory/low-stock')
  @UseGuards(AdminRoleGuard)
  async getLowStockReport() {
    return this.systemService.getLowStockReport();
  }

  @Get('dashboard-stats')
  @UseGuards(AdminRoleGuard)
  async getDashboardStats() {
    return this.systemService.getDashboardStats();
  }

  @Get('settings')
  async getSettings(@Req() req: any) {
    const user = extractVerifiedJwtUser(req);
    return this.systemService.getSettings(user?.role === 'admin');
  }

  @Post('settings')
  @UseGuards(AdminRoleGuard)
  async updateSettings(@Body() data: any) {
    return this.systemService.updateSettings(data);
  }

  @Get('taxes')
  async getTaxes() {
    return this.systemService.getTaxes();
  }

  @Post('taxes')
  @UseGuards(AdminRoleGuard)
  async createTaxRate(@Body() data: any) {
    return this.systemService.createTaxRate(data);
  }

  @Get('taxes/classes')
  async getTaxClasses() {
    return this.systemService.getTaxClasses();
  }

  @Post('taxes/classes')
  @UseGuards(AdminRoleGuard)
  async createTaxClass(@Body() data: any) {
    return this.systemService.createTaxClass(data);
  }

  @Put('taxes/classes/:id')
  @UseGuards(AdminRoleGuard)
  async updateTaxClass(@Param('id') id: string, @Body() data: any) {
    return this.systemService.updateTaxClass(Number(id), data);
  }

  @Delete('taxes/classes/:id')
  @UseGuards(AdminRoleGuard)
  async deleteTaxClass(@Param('id') id: string) {
    return this.systemService.deleteTaxClass(Number(id));
  }

  @Put('taxes/:id')
  @UseGuards(AdminRoleGuard)
  async updateTaxRate(@Param('id') id: string, @Body() data: any) {
    return this.systemService.updateTaxRate(Number(id), data);
  }

  @Delete('taxes/:id')
  @UseGuards(AdminRoleGuard)
  async deleteTaxRate(@Param('id') id: string) {
    return this.systemService.deleteTaxRate(Number(id));
  }

  @Get('shipping-methods')
  async getShippingMethods() {
    return this.systemService.getShippingMethods();
  }

  @Post('shipping-methods')
  @UseGuards(AdminRoleGuard)
  async createShippingMethod(@Body() data: any) {
    return this.systemService.createShippingMethod(data);
  }

  @Put('shipping-methods/:id')
  @UseGuards(AdminRoleGuard)
  async updateShippingMethod(@Param('id') id: string, @Body() data: any) {
    return this.systemService.updateShippingMethod(Number(id), data);
  }

  @Delete('shipping-methods/:id')
  @UseGuards(AdminRoleGuard)
  async deleteShippingMethod(@Param('id') id: string) {
    return this.systemService.deleteShippingMethod(Number(id));
  }
}
