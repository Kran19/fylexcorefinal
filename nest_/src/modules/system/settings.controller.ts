import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { SystemService } from '../system/system.service';
import { AdminRoleGuard, extractVerifiedJwtUser } from '../../common/guards/admin-role.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly systemService: SystemService) {}

  @Get()
  async getSettings(@Req() req: any) {
    const user = extractVerifiedJwtUser(req);
    return this.systemService.getSettings(user?.role === 'admin');
  }

  @Post()
  @UseGuards(AdminRoleGuard)
  async updateSettings(@Body() data: any) {
    return this.systemService.updateSettings(data);
  }
}
