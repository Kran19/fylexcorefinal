import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';

@Controller('dashboard')
@UseGuards(AdminRoleGuard)
export class DashboardController {
  constructor(private readonly systemService: SystemService) {}

  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('preset') preset?: string,
  ) {
    return this.systemService.getDashboardStats({ startDate, endDate, preset });
  }

  @Get('cart-checkout-funnel')
  async getCartCheckoutFunnel(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('preset') preset?: string,
  ) {
    return this.systemService.getCartCheckoutFunnel({ startDate, endDate, preset });
  }

  @Get()
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('preset') preset?: string,
  ) {
    return this.systemService.getDashboardStats({ startDate, endDate, preset });
  }
}
