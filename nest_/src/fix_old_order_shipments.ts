import { PrismaClient } from '@prisma/client';
import { ShiprocketService } from './modules/order/shiprocket.service';
import { Logger } from '@nestjs/common';

const prisma = new PrismaClient();
const logger = new Logger('FixOldOrderShipments');

async function main() {
  console.log('Starting cleanup and sync for old order shipments in production database...');

  const shiprocketService = new ShiprocketService();

  const shipments = await prisma.orderShipment.findMany({
    include: {
      order: true,
    }
  });

  console.log(`Found ${shipments.length} total shipment records in database.`);

  let updatedCount = 0;
  let clearedPlaceholderCount = 0;

  for (const shipment of shipments) {
    const rawAwb = shipment.trackingNumber?.trim() || '';
    const rawCarrier = shipment.carrier?.trim() || '';

    const isNumericAwb = /^\d{8,12}$/.test(rawAwb);
    const isPlaceholderCarrier = rawCarrier === 'Standard Luxury Courier';

    if (isNumericAwb || isPlaceholderCarrier || rawAwb.startsWith('ORD-') || rawAwb.startsWith('SHP-')) {
      console.log(`Processing Order #${shipment.order.orderNumber || shipment.orderId} (Current AWB: "${rawAwb}", Carrier: "${rawCarrier}")`);

      // Try fetching live tracking from Shiprocket using Order ID or Shipment ID
      let trackingData: any = null;
      if (shipment.order.orderNumber || shipment.orderId) {
        trackingData = await shiprocketService.getTrackingByOrderId(shipment.order.orderNumber || shipment.orderId);
      }

      if ((!trackingData || !trackingData.tracking_data) && isNumericAwb) {
        trackingData = await shiprocketService.getTrackingByShipmentId(rawAwb);
      }

      const realAwbCandidate = trackingData?.awb_code || trackingData?.tracking_data?.awb_code || trackingData?.data?.awb_code || trackingData?.tracking_data?.shipment_track?.[0]?.awb_code || null;
      const realCourierCandidate = trackingData?.courier_name || trackingData?.tracking_data?.courier_name || trackingData?.data?.courier_name || trackingData?.tracking_data?.shipment_track?.[0]?.courier_name || null;

      const finalAwb = (realAwbCandidate && !/^\d{8,12}$/.test(realAwbCandidate) && !realAwbCandidate.startsWith('ORD-')) ? realAwbCandidate : null;
      const finalCourier = (realCourierCandidate && realCourierCandidate !== 'Standard Luxury Courier') ? realCourierCandidate : null;

      await prisma.orderShipment.update({
        where: { id: shipment.id },
        data: {
          trackingNumber: finalAwb,
          carrier: finalCourier,
          trackingUrl: finalAwb ? `https://shiprocket.co/tracking/${finalAwb}` : null,
        }
      });

      if (finalAwb || finalCourier) {
        console.log(`Updated Order #${shipment.order.orderNumber || shipment.orderId} with REAL Shiprocket data -> AWB: ${finalAwb}, Courier: ${finalCourier}`);
        updatedCount++;
      } else {
        console.log(`Cleared placeholder shipment data for Order #${shipment.order.orderNumber || shipment.orderId} (Set AWB to null, Carrier to null until generated).`);
        clearedPlaceholderCount++;
      }
    }
  }

  console.log('\n=== SHIPMENT CLEANUP COMPLETED ===');
  console.log(`Total Shipments Inspected: ${shipments.length}`);
  console.log(`Updated with Real AWB/Courier: ${updatedCount}`);
  console.log(`Cleared Placeholders (Set to Pending/Null): ${clearedPlaceholderCount}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error running shipment cleanup script:', err);
  process.exit(1);
});
