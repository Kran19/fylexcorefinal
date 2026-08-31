import { Module, forwardRef } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MarketingModule } from '../marketing/marketing.module';
import { PaymentModule } from '../payment/payment.module';
import { OrderStatusHistoryService } from './order-status-history.service';
import { ShippingService } from './shipping.service';
import { ShiprocketService } from './shiprocket.service';
import { InvoiceService } from './invoice.service';

@Module({
  imports: [PrismaModule, MarketingModule, forwardRef(() => PaymentModule)],
  controllers: [OrderController],
  providers: [OrderService, OrderStatusHistoryService, ShippingService, ShiprocketService, InvoiceService],
  exports: [OrderService, OrderStatusHistoryService, ShippingService, ShiprocketService, InvoiceService],
})
export class OrderModule {}


