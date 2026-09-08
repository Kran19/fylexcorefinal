import { PrismaClient } from '@prisma/client';
import { ShiprocketService } from './modules/order/shiprocket.service';
import { Logger } from '@nestjs/common';

const prisma = new PrismaClient();
const logger = new Logger('FixOldOrderShipments');

function extractShiprocketTracking(res: any) {
  if (!res) return { awb: null, courier: null, trackStatus: null };
  let payload = res;
  if (res.tracking_data) {
    payload = res.tracking_data;
  } else if (res.data?.tracking_data) {
    payload = res.data.tracking_data;
  } else if (typeof res === 'object') {
    for (const key of Object.keys(res)) {
      if (res[key]?.tracking_data) {
        payload = res[key].tracking_data;
        break;
      }
    }
  }

  const shipTrack = Array.isArray(payload?.shipment_track)
    ? payload.shipment_track[0]
    : (payload?.shipment_track || {});

  const rawAwb = payload?.awb_code || payload?.awb || shipTrack?.awb_code || res?.awb_code || null;
  const rawCourier = payload?.courier_name || payload?.courier || shipTrack?.courier_name || res?.courier_name || null;
  const trackStatus = payload?.track_status || payload?.shipment_status || res?.track_status || null;

  const awbStr = rawAwb ? String(rawAwb).trim() : null;
  const isOrderOrShipmentPrefix = awbStr && (awbStr.startsWith('ORD-') || awbStr.startsWith('SHP-'));
  const finalAwb = (awbStr && !isOrderOrShipmentPrefix) ? awbStr : null;

  const courierStr = rawCourier ? String(rawCourier).trim() : null;
  const finalCourier = (courierStr && courierStr !== 'Standard Luxury Courier') ? courierStr : null;

  return {
    awb: finalAwb,
    courier: finalCourier,
    trackStatus,
  };
}

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

    const isNumericShipmentId = /^\d{8,12}$/.test(rawAwb) && rawAwb.startsWith('15');
    const isPlaceholderCarrier = rawCarrier === 'Standard Luxury Courier';

    console.log(`Processing Order #${shipment.order.orderNumber || shipment.orderId} (Current AWB: "${rawAwb}", Carrier: "${rawCarrier}")`);

    // Try fetching live tracking from Shiprocket using Order ID or Shipment ID
    let trackingRes: any = null;
    if (shipment.order.orderNumber || shipment.orderId) {
      trackingRes = await shiprocketService.getTrackingByOrderId(shipment.order.orderNumber || shipment.orderId);
    }

    if ((!trackingRes || Object.keys(trackingRes || {}).length === 0) && rawAwb && !isNumericShipmentId) {
      trackingRes = await shiprocketService.getTracking(rawAwb);
    }

    if ((!trackingRes || Object.keys(trackingRes || {}).length === 0) && isNumericShipmentId) {
      trackingRes = await shiprocketService.getTrackingByShipmentId(rawAwb);
    }

    const { awb: realAwb, courier: realCourier } = extractShiprocketTracking(trackingRes);

    const isCurrentAwbInvalid = !rawAwb || rawAwb.startsWith('ORD-') || rawAwb.startsWith('SHP-') || ['pending', 'null', 'n/a'].includes(rawAwb.toLowerCase());
    const finalAwb = realAwb || (!isCurrentAwbInvalid ? rawAwb : null);
    const finalCourier = realCourier || (isPlaceholderCarrier ? null : rawCarrier);

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
