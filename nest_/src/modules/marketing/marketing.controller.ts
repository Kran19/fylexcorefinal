import { Controller, Get, Post, Put, Delete, Body, UseGuards, Param } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { LoyaltyService } from './loyalty.service';
import { ValidateCouponDto } from './dto/marketing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';

@Controller('marketing')
export class MarketingController {
  constructor(
    private readonly marketingService: MarketingService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  @Post('coupons/validate')
  async validateCoupon(@GetUser('userId') userId: string, @Body() dto: ValidateCouponDto) {
    return this.marketingService.validateCoupon(userId, dto.code, dto.cartAmount, dto.items || []);
  }

  @UseGuards(JwtAuthGuard)
  @Get('loyalty/balance')
  async getLoyaltyBalance(@GetUser('userId') userId: string) {
    return this.loyaltyService.getLoyaltyBalance(userId);
  }

  @Get('offers/analytics')
  @UseGuards(AdminRoleGuard)
  async getOffersAnalytics() {
    return this.marketingService.getAnalyticsDashboard();
  }

  @Get('offers')
  @UseGuards(AdminRoleGuard)
  async getOffers() {
    return this.marketingService.getAllOffers();
  }

  @Post('offers')
  @UseGuards(AdminRoleGuard)
  async createOffer(@Body() data: any) {
    return this.marketingService.createOffer(data);
  }

  @Put('offers/:id')
  @UseGuards(AdminRoleGuard)
  async updateOffer(@Param('id') id: string, @Body() data: any) {
    return this.marketingService.updateOffer(id, data);
  }

  @Delete('offers/:id')
  @UseGuards(AdminRoleGuard)
  async deleteOffer(@Param('id') id: string) {
    return this.marketingService.deleteOffer(id);
  }
}
