import { Controller, Get, Param, Put, Post, Delete, Body, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminRoleGuard, extractVerifiedJwtUser } from '../../common/guards/admin-role.guard';

function assertOwnerOrAdminForRegisteredCustomer(req: any, customerId: string) {
  const trimmed = String(customerId || '').trim();
  // Guest cart/checkout IDs ('gst_...') do not correspond to registered customer accounts
  if (!/^\d+$/.test(trimmed)) return;
  const user = extractVerifiedJwtUser(req);
  if (!user || (user.role !== 'admin' && String(user.userId) !== trimmed)) {
    throw new ForbiddenException('You are not authorized to access another customer record.');
  }
}

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me/dashboard')
  async getDashboard(@Req() req: any) {
    return this.customerService.getDashboard(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMyProfile(@Req() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    return this.customerService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Get()
  @UseGuards(AdminRoleGuard)
  async findAll() {
    return this.customerService.getAllUsers();
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    assertOwnerOrAdminForRegisteredCustomer(req, id);
    return this.customerService.getProfile(id);
  }

  @Put(':id')
  @UseGuards(AdminRoleGuard)
  async update(@Param('id') id: string, @Body() updateCustomerDto: any) {
    return this.customerService.updateCustomer(id, updateCustomerDto);
  }

  @Get(':id/addresses')
  async getAddresses(@Req() req: any, @Param('id') customerId: string) {
    assertOwnerOrAdminForRegisteredCustomer(req, customerId);
    return this.customerService.getAddresses(customerId);
  }

  @Post(':id/addresses')
  async addAddress(
    @Req() req: any,
    @Param('id') customerId: string,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    assertOwnerOrAdminForRegisteredCustomer(req, customerId);
    return this.customerService.addAddress(customerId, createAddressDto);
  }

  @Put(':id/addresses/:addressId')
  async updateAddress(
    @Req() req: any,
    @Param('id') customerId: string,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    assertOwnerOrAdminForRegisteredCustomer(req, customerId);
    return this.customerService.updateAddress(customerId, addressId, updateAddressDto);
  }

  @Delete(':id/addresses/:addressId')
  async deleteAddress(
    @Req() req: any,
    @Param('id') customerId: string,
    @Param('addressId') addressId: string,
  ) {
    assertOwnerOrAdminForRegisteredCustomer(req, customerId);
    return this.customerService.deleteAddress(customerId, addressId);
  }
}
