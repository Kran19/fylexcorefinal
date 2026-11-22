import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
  UnauthorizedException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { OrderService } from './order.service';
import { InvoiceService } from './invoice.service';
import { AdminRoleGuard, extractVerifiedJwtUser } from '../../common/guards/admin-role.guard';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Post()
  async createOrder(@Body('customerId') customerId: string, @Body() createOrderDto: any) {
    return this.orderService.checkout(customerId, createOrderDto);
  }

  @Get()
  async getAllOrders(@Request() req: any, @Query('customerId') customerId?: string) {
    if (customerId) {
      // If querying a registered numeric customer ID, require matching JWT or Admin
      if (/^\d+$/.test(String(customerId).trim())) {
        const user = extractVerifiedJwtUser(req);
        if (!user || (user.role !== 'admin' && String(user.userId) !== String(customerId).trim())) {
          throw new UnauthorizedException('Authentication required to view customer order history.');
        }
      }
      return this.orderService.getOrders(customerId);
    }

    // Listing ALL store orders requires Administrator JWT
    const user = extractVerifiedJwtUser(req);
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Administrator privileges required to list all orders.');
    }
    return this.orderService.getAllOrders();
  }

  @Post('calculate-shipping')
  async calculateShipping(@Body('customerId') customerId: string, @Body('pincode') pincode: string) {
    return this.orderService.calculateShipping(customerId, pincode);
  }

  @Post('calculate-total')
  async calculateTotal(
    @Body('customerId') customerId: string,
    @Body('pincode') pincode?: string,
    @Body('couponCode') couponCode?: string,
    @Body('useCredits') useCredits?: boolean,
  ) {
    return this.orderService.calculateOrderTotal(customerId, pincode, couponCode, useCredits);
  }

  @Post(['shiprocket-webhook', 'tracking-update', 'webhook-listener', 'status-update'])
  @HttpCode(HttpStatus.OK)
  async handleShiprocketWebhook(@Body() payload: any) {
    return this.orderService.handleShiprocketWebhook(payload);
  }

  @Get('track')
  async trackOrder(@Query('order_id') orderId: string, @Query('mobile') mobile: string) {
    return this.orderService.trackOrder(orderId, mobile);
  }

  @Get('by-mobile')
  async getOrdersByMobile(@Query('mobile') mobile: string, @Query('type') type?: string) {
    return this.orderService.getOrdersByMobile(mobile, type);
  }

  @Get(':id')
  async getOrderById(@Query('customerId') customerId: string, @Param('id') id: string) {
    return this.orderService.getOrderById(customerId, id);
  }

  @Get(':id/invoice')
  async downloadInvoice(
    @Request() req: any,
    @Query('download') download: string,
    @Query('customerId') queryCustomerId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const orderRes = await this.orderService.getOrderById('', id);
    const order = orderRes.data;

    // Prevent sequential IDOR invoice enumeration (/api/orders/1/invoice, /api/orders/2/invoice)
    const user = extractVerifiedJwtUser(req);
    const isAdmin = user?.role === 'admin';
    const isOwnerJwt = Boolean(user && order?.customerId && String(order.customerId) === String(user.userId));
    const isOrderNumberLookup = !/^\d+$/.test(String(id)); // Non-sequential orderNumber e.g. ORD-179...
    const matchesGuestQuery = Boolean(
      queryCustomerId && order?.customerId && String(order.customerId) === String(queryCustomerId),
    );

    if (!isAdmin && !isOwnerJwt && !isOrderNumberLookup && !matchesGuestQuery) {
      throw new ForbiddenException('You do not have permission to access this invoice.');
    }

    res.setHeader('Content-Type', 'application/pdf');
    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-ORD-${order.orderNumber || id}.pdf"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="Invoice-ORD-${order.orderNumber || id}.pdf"`);
    }

    await this.invoiceService.generateInvoicePdf(id, res);
  }

  @Post(':id/send-to-shiprocket')
  @UseGuards(AdminRoleGuard)
  async sendToShiprocket(@Param('id') id: string, @Request() req: any) {
    const adminId = req?.user?.userId || req?.user?.id;
    return this.orderService.sendToShiprocket(id, adminId);
  }

  @Get(':id/shiprocket-sync')
  @UseGuards(AdminRoleGuard)
  async syncShiprocket(@Param('id') id: string) {
    return this.orderService.syncShiprocketTracking(id);
  }

  @Put(':id/status')
  @UseGuards(AdminRoleGuard)
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
    @Request() req?: any,
  ) {
    const adminId = req?.user?.userId || req?.user?.id;
    return this.orderService.updateStatus(id, status, notes, adminId);
  }

  @Put(':id/payment-status')
  @UseGuards(AdminRoleGuard)
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body('payment_status') paymentStatus: string,
    @Body('notes') notes?: string,
  ) {
    return this.orderService.updatePaymentStatus(id, paymentStatus, notes);
  }

  @Put(':id')
  @UseGuards(AdminRoleGuard)
  async updateOrder(@Param('id') id: string, @Body('status') status: string, @Request() req?: any) {
    const adminId = req?.user?.userId || req?.user?.id;
    return this.orderService.updateStatus(id, status, undefined, adminId);
  }

  @Post(':id/cancel')
  async cancelOrder(@Body('customerId') customerId: string, @Param('id') id: string, @Body('reason') reason: string) {
    return this.orderService.cancelOrder(customerId, id, reason);
  }

  @Post(':id/tracking')
  @UseGuards(AdminRoleGuard)
  async updateTracking(@Param('id') id: string, @Body() trackingData: any) {
    return this.orderService.updateTracking(id, trackingData);
  }

  @Post(':id/refund')
  @UseGuards(AdminRoleGuard)
  async processRefund(@Param('id') id: string, @Body() refundData: any) {
    return this.orderService.processRefund(id, refundData);
  }

  @Delete(':id')
  @UseGuards(AdminRoleGuard)
  async deleteOrder(@Param('id') id: string) {
    return this.orderService.deleteOrder(id);
  }
}
