import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
  preset?: string;
}

@Injectable()
export class SystemService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  private resolveDateWindow(query?: DateRangeQuery) {
    const now = new Date();
    const preset = (query?.preset || '').toLowerCase().trim();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;
    let label = 'All Time';

    if (query?.startDate || query?.endDate) {
      if (query.startDate) {
        const s = new Date(`${query.startDate}T00:00:00`);
        if (!isNaN(s.getTime())) rangeStart = s;
      }
      if (query.endDate) {
        const e = new Date(`${query.endDate}T23:59:59.999`);
        if (!isNaN(e.getTime())) rangeEnd = e;
      } else if (rangeStart) {
        rangeEnd = endOfToday;
      }
      label = `${query.startDate || 'Start'} → ${query.endDate || 'Today'}`;
    } else if (preset === 'today') {
      rangeStart = startOfToday;
      rangeEnd = endOfToday;
      label = 'Today';
    } else if (preset === 'yesterday') {
      const yStart = new Date(startOfToday);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(endOfToday);
      yEnd.setDate(yEnd.getDate() - 1);
      rangeStart = yStart;
      rangeEnd = yEnd;
      label = 'Yesterday';
    } else if (preset === '7d') {
      const s = new Date(startOfToday);
      s.setDate(s.getDate() - 6);
      rangeStart = s;
      rangeEnd = endOfToday;
      label = 'Last 7 Days';
    } else if (preset === '30d') {
      const s = new Date(startOfToday);
      s.setDate(s.getDate() - 29);
      rangeStart = s;
      rangeEnd = endOfToday;
      label = 'Last 30 Days';
    } else if (preset === 'this_month') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      rangeEnd = endOfToday;
      label = 'This Month';
    }

    // Previous comparison window (defaults to last month vs this month when All Time)
    let prevStart: Date;
    let prevEnd: Date;
    let comparisonLabel = 'vs previous period';

    if (rangeStart && rangeEnd) {
      const spanMs = Math.max(86_400_000, rangeEnd.getTime() - rangeStart.getTime() + 1);
      prevEnd = new Date(rangeStart.getTime() - 1);
      prevStart = new Date(rangeStart.getTime() - spanMs);
    } else {
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      comparisonLabel = 'this month';
    }

    const createdAtFilter =
      rangeStart || rangeEnd
        ? {
            ...(rangeStart ? { gte: rangeStart } : {}),
            ...(rangeEnd ? { lte: rangeEnd } : {}),
          }
        : undefined;

    return {
      rangeStart,
      rangeEnd,
      prevStart,
      prevEnd,
      createdAtFilter,
      label,
      comparisonLabel,
      startOfToday,
    };
  }

  async getDashboardStats(query?: DateRangeQuery) {
    const now = new Date();
    const {
      rangeStart,
      rangeEnd,
      prevStart,
      prevEnd,
      createdAtFilter,
      label: rangeLabel,
      comparisonLabel,
      startOfToday,
    } = this.resolveDateWindow(query);

    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const orderDateWhere = createdAtFilter ? { createdAt: createdAtFilter } : {};
    const paidOrderWhere: any = {
      OR: [
        { paymentStatus: { in: ['paid', 'partially_paid'] }, status: { notIn: ['cancelled', 'refunded'] } },
        { paymentMethod: { in: ['cod', 'partial_cod'] }, status: { notIn: ['cancelled', 'refunded'] } },
      ],
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };
    const prevPaidOrderWhere: any = {
      OR: [
        { paymentStatus: { in: ['paid', 'partially_paid'] }, status: { notIn: ['cancelled', 'refunded'] } },
        { paymentMethod: { in: ['cod', 'partial_cod'] }, status: { notIn: ['cancelled', 'refunded'] } },
      ],
      createdAt: { gte: prevStart, lte: prevEnd },
    };

    const [
      totalOrders,
      totalOrdersPrev,
      totalCustomers,
      totalCustomersPrev,
      totalProducts,
      totalProductsPrev,
      revenueResult,
      revenueResultPrev,
      todayOrders,
      yesterdayOrders,
      todayRevenue,
      yesterdayRevenue,
      pendingOrders,
      lowStockCount,
      outOfStockCount,
      recentOrders,
      recentCustomers,
      statusGroups,
      topProductsRaw,
      funnelResult,
    ] = await Promise.all([
      this.prisma.order.count({ where: orderDateWhere }),
      this.prisma.order.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
      this.prisma.customer.count({ where: createdAtFilter ? { createdAt: createdAtFilter } : {} }),
      this.prisma.customer.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),

      // Revenue (Paid + Confirmed COD)
      this.prisma.order.aggregate({ where: paidOrderWhere, _sum: { grandTotal: true } }),
      this.prisma.order.aggregate({ where: prevPaidOrderWhere, _sum: { grandTotal: true } }),

      // Daily stats
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfYesterday, lt: startOfToday } } }),
      this.prisma.order.aggregate({
        where: {
          OR: [{ paymentStatus: 'paid' }, { paymentMethod: 'cod', status: { notIn: ['cancelled', 'refunded'] } }],
          createdAt: { gte: startOfToday },
        },
        _sum: { grandTotal: true },
      }),
      this.prisma.order.aggregate({
        where: {
          OR: [{ paymentStatus: 'paid' }, { paymentMethod: 'cod', status: { notIn: ['cancelled', 'refunded'] } }],
          createdAt: { gte: startOfYesterday, lt: startOfToday },
        },
        _sum: { grandTotal: true },
      }),

      // Specific metrics
      this.prisma.order.count({ where: { status: 'pending', ...orderDateWhere } }),
      this.prisma.productVariant.count({ where: { qty: { gt: 0, lt: 10 } } }),
      this.prisma.productVariant.count({ where: { qty: 0 } }),

      // Lists
      this.prisma.order.findMany({
        where: orderDateWhere,
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } },
      }),
      this.prisma.customer.findMany({
        where: createdAtFilter ? { createdAt: createdAtFilter } : {},
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, mobile: true, createdAt: true },
      }),

      // Distributions
      this.prisma.order.groupBy({
        by: ['status'],
        where: orderDateWhere,
        _count: { id: true },
      }),

      // Top Products in range
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: createdAtFilter ? { order: { createdAt: createdAtFilter } } : undefined,
        _count: { productId: true },
        _sum: { total: true, quantity: true },
        take: 5,
        orderBy: { _count: { productId: 'desc' } },
      }),

      // Cart & Checkout Marketing Funnel in range
      this.buildCartCheckoutFunnelData(rangeStart, rangeEnd, rangeLabel),
    ]);

    const productIds = topProductsRaw.map((item) => item.productId).filter((id): id is number => id !== null);
    const productsList = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, price: true },
        })
      : [];
    const productMap = new Map(productsList.map((p) => [p.id, p]));

    const validTopProducts = topProductsRaw
      .map((item) => {
        if (item.productId === null) return null;
        const product = productMap.get(item.productId);
        return {
          name: product?.name || 'Unknown',
          sales: Number(item._sum?.quantity || item._count.productId || 0),
          revenue: Number(item._sum?.total || 0),
          price: Number(product?.price || 0),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const stats = {
      total_revenue: Number(revenueResult._sum?.grandTotal || 0),
      revenue_change: calculateChange(
        Number(revenueResult._sum?.grandTotal || 0),
        Number(revenueResultPrev._sum?.grandTotal || 0),
      ),
      total_orders: totalOrders,
      orders_change: calculateChange(totalOrders, totalOrdersPrev),
      total_products: totalProducts,
      products_change: calculateChange(totalProducts, totalProductsPrev),
      total_customers: totalCustomers,
      customers_change: calculateChange(totalCustomers, totalCustomersPrev),
      today_orders: todayOrders,
      yesterday_orders: yesterdayOrders,
      today_revenue: Number(todayRevenue._sum?.grandTotal || 0),
      yesterday_revenue: Number(yesterdayRevenue._sum?.grandTotal || 0),
      pending_orders: pendingOrders,
      low_stock_products: lowStockCount,
      out_of_stock_products: outOfStockCount,
      range_label: rangeLabel,
      comparison_label: comparisonLabel,
    };

    const orderStatusDistribution: Record<string, number> = {};
    statusGroups.forEach((g) => {
      orderStatusDistribution[g.status] = g._count.id;
    });

    // Dynamic chart buckets matching selected date range (defaults to last 7 days when All Time)
    const chartEnd = rangeEnd || new Date();
    const chartStart = rangeStart || new Date(chartEnd.getFullYear(), chartEnd.getMonth(), chartEnd.getDate() - 6);
    const totalSpanDays = Math.max(
      1,
      Math.min(31, Math.round((chartEnd.getTime() - chartStart.getTime()) / 86_400_000) + 1),
    );

    const chartDays = Array.from({ length: totalSpanDays }, (_, i) => {
      const d = new Date(chartEnd);
      d.setDate(chartEnd.getDate() - (totalSpanDays - 1 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const ordersInChartWindow = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: chartDays[0], lte: chartEnd },
        OR: [{ paymentStatus: 'paid' }, { paymentMethod: 'cod', status: { notIn: ['cancelled', 'refunded'] } }],
      },
      select: { createdAt: true, grandTotal: true },
    });

    const revenueChartData = {
      labels: chartDays.map((d) =>
        totalSpanDays <= 7
          ? d.toLocaleDateString('en-IN', { weekday: 'short' })
          : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      ),
      data: chartDays.map((day) => {
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);
        return ordersInChartWindow
          .filter((o) => o.createdAt && o.createdAt >= day && o.createdAt < nextDay)
          .reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
      }),
    };

    // Monthly revenue series (last 6 months)
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return d;
    });
    const sixMonthsOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: last6Months[0] },
        OR: [{ paymentStatus: 'paid' }, { paymentMethod: 'cod', status: { notIn: ['cancelled', 'refunded'] } }],
      },
      select: { createdAt: true, grandTotal: true },
    });
    const monthlyRevenue = {
      labels: last6Months.map((d) => d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })),
      data: last6Months.map((mStart) => {
        const mEnd = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 1);
        return sixMonthsOrders
          .filter((o) => o.createdAt && o.createdAt >= mStart && o.createdAt < mEnd)
          .reduce((s, o) => s + Number(o.grandTotal || 0), 0);
      }),
    };

    const salesByPaymentRaw = await this.prisma.order.groupBy({
      by: ['paymentMethod'],
      _sum: { grandTotal: true },
      _count: { id: true },
      where: paidOrderWhere,
    });

    const salesByPaymentMethod = salesByPaymentRaw.map((s) => ({
      name: s.paymentMethod?.toUpperCase() || 'ONLINE',
      total_amount: Number(s._sum.grandTotal || 0),
      order_count: s._count.id,
    }));

    return {
      success: true,
      data: {
        stats,
        funnel: funnelResult,
        recentOrders: recentOrders.map((o) => ({
          id: o.id.toString(),
          orderNumber: o.orderNumber,
          customer: o.customer?.name || `${o.customerFirstName || ''} ${o.customerLastName || ''}`.trim() || 'Guest',
          amount: Number(o.grandTotal),
          status: o.status,
          createdAt: o.createdAt,
        })),
        recentCustomers: recentCustomers.map((c) => ({
          id: c.id.toString(),
          name: c.name,
          email: c.email || c.mobile || '',
          createdAt: c.createdAt,
        })),
        topProducts: validTopProducts,
        orderStatusDistribution,
        revenueChartData,
        monthlyRevenue,
        salesByPaymentMethod,
      },
    };
  }

  async getCartCheckoutFunnel(query?: DateRangeQuery) {
    const { rangeStart, rangeEnd, label } = this.resolveDateWindow(query);
    const data = await this.buildCartCheckoutFunnelData(rangeStart, rangeEnd, label);
    return { success: true, data };
  }

  private async buildCartCheckoutFunnelData(
    rangeStart: Date | null,
    rangeEnd: Date | null,
    rangeLabel: string,
  ) {
    const dateFilter =
      rangeStart || rangeEnd
        ? {
            ...(rangeStart ? { gte: rangeStart } : {}),
            ...(rangeEnd ? { lte: rangeEnd } : {}),
          }
        : undefined;

    const fromUnix = rangeStart ? Math.floor(rangeStart.getTime() / 1000) : undefined;
    const toUnix = rangeEnd ? Math.floor(rangeEnd.getTime() / 1000) : undefined;

    const [activeCarts, activityLogs, ordersInRange, completedAttempts, rzpRecentOrders] = await Promise.all([
      this.prisma.cart.findMany({
        where: {
          items: { some: {} },
          ...(dateFilter
            ? {
                OR: [{ updatedAt: dateFilter }, { createdAt: dateFilter }],
              }
            : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 250,
        include: {
          customer: { select: { id: true, name: true, email: true, mobile: true, city: true } },
          offer: { select: { code: true, name: true } },
          items: {
            include: {
              productVariant: {
                include: {
                  product: { select: { id: true, name: true, sku: true, heroImage: true } },
                  variantAttributes: {
                    include: { attributeValue: { select: { label: true, value: true } } },
                  },
                },
              },
              belt: true,
            },
          },
        },
      }),
      this.prisma.activityLog.findMany({
        where: {
          action: { in: ['ADD_TO_CART', 'CHECKOUT_INITIATED'] },
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
        include: {
          customer: { select: { id: true, name: true, email: true, mobile: true, city: true } },
        },
      }),
      this.prisma.order.findMany({
        where: {
          deletedAt: null,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: {
          customer: { select: { id: true, name: true, email: true, mobile: true } },
          addresses: true,
          items: true,
        },
      }),
      this.prisma.paymentAttempt.findMany({
        select: { attemptId: true, orderId: true },
        orderBy: { id: 'desc' },
        take: 500,
      }),
      this.paymentService.listRecentOrders(fromUnix, toUnix, 100),
    ]);

    const convertedRzpOrderIds = new Set(completedAttempts.map((pa) => pa.attemptId).filter(Boolean));

    // Look up any numeric userIds referenced in Razorpay notes that aren't already loaded
    const extraCustomerIds = new Set<number>();
    for (const ro of rzpRecentOrders) {
      const uid = ro?.notes?.userId;
      if (uid && !isNaN(Number(uid))) extraCustomerIds.add(Number(uid));
    }
    const extraCustomers = extraCustomerIds.size
      ? await this.prisma.customer.findMany({
          where: { id: { in: Array.from(extraCustomerIds) } },
          select: { id: true, name: true, email: true, mobile: true, city: true },
        })
      : [];
    const customerLookup = new Map<number, any>(extraCustomers.map((c) => [c.id, c]));
    activeCarts.forEach((c) => {
      if (c.customer) customerLookup.set(c.customer.id, c.customer);
    });

    const activeCartMap = new Map<number, any>(activeCarts.map((c) => [c.id, c]));

    const buildWhatsappLink = (rawPhone?: string, name?: string, productSummary?: string, value?: number) => {
      const clean = String(rawPhone || '').replace(/\D/g, '').slice(-10);
      if (clean.length !== 10) return null;
      const greetingName = name && name !== 'Guest Shopper' && name !== 'FYLEX Patron' ? ` ${name.split(' ')[0]}` : '';
      const itemPart = productSummary ? ` for *${productSummary}*` : '';
      const valPart = value && value > 0 ? ` (₹${Math.round(value).toLocaleString('en-IN')})` : '';
      const text = encodeURIComponent(
        `Hello${greetingName}, we noticed your FYLEX timepiece checkout${itemPart}${valPart} wasn't completed. Let us know if we can assist you with your order!`,
      );
      return `https://wa.me/91${clean}?text=${text}`;
    };

    // ─── 1. Aggregate Products Added to Cart & Unique Add-to-Cart Users ─────────
    const productStatsMap = new Map<
      string,
      {
        key: string;
        productId: number | string | null;
        variantId: number | string | null;
        name: string;
        variant: string;
        sku: string;
        unitPrice: number;
        totalQty: number;
        totalValue: number;
        stock: number | null;
        userSet: Set<string>;
      }
    >();
    const uniqueCartUsersSet = new Set<string>();
    const recordedCartVariantPairs = new Set<string>();

    // Pass 1A: Active Carts currently in DB (captures all live + pre-existing carts!)
    for (const cart of activeCarts) {
      const shopperKey = cart.customerId ? `cust_${cart.customerId}` : `sess_${cart.sessionId || cart.id}`;
      uniqueCartUsersSet.add(shopperKey);

      for (const item of cart.items) {
        const variant = item.productVariant;
        const product = variant?.product;
        const belt = item.belt;

        const key = variant
          ? `var_${variant.id}`
          : belt
          ? `belt_${belt.id}`
          : `item_${item.id}`;

        const pairKey = `${cart.id}_${key}`;
        recordedCartVariantPairs.add(pairKey);

        const attrLabel = (variant?.variantAttributes || [])
          .map((va: any) => va.attributeValue?.label || va.attributeValue?.value)
          .filter(Boolean)
          .join(' • ');

        const unitPrice = Number(item.unitPrice || variant?.price || belt?.price || 0);
        const qty = Math.max(1, Number(item.quantity || 1));
        const lineValue = Number(item.total || unitPrice * qty);

        const existing = productStatsMap.get(key) || {
          key,
          productId: product?.id || (belt ? `belt-${belt.id}` : null),
          variantId: variant?.id || (belt ? `belt-${belt.id}` : null),
          name: product?.name || belt?.name || 'FYLEX Timepiece',
          variant: attrLabel || (belt ? 'Compatible Watch Strap' : 'Standard Edition'),
          sku: variant?.sku || (belt ? `BELT-${belt.id}` : `SKU-${item.id}`),
          unitPrice,
          totalQty: 0,
          totalValue: 0,
          stock: variant ? Number(variant.qty ?? 0) : belt ? Number(belt.stock ?? 0) : null,
          userSet: new Set<string>(),
        };

        existing.totalQty += qty;
        existing.totalValue += lineValue;
        existing.userSet.add(shopperKey);
        productStatsMap.set(key, existing);
      }
    }

    // Pass 1B: Historical ADD_TO_CART event logs (includes carts that later converted & cleared CartItem!)
    for (const log of activityLogs) {
      if (log.action !== 'ADD_TO_CART' || !log.newData) continue;
      let parsed: any = null;
      try {
        parsed = JSON.parse(log.newData);
      } catch {
        continue;
      }

      const shopperKey = log.customerId
        ? `cust_${log.customerId}`
        : `sess_${parsed.sessionId || log.oldData || log.id}`;
      uniqueCartUsersSet.add(shopperKey);

      const key = parsed.beltId
        ? `belt_${parsed.beltId}`
        : parsed.variantId
        ? `var_${parsed.variantId}`
        : `prod_${parsed.productId || log.entityId}`;
      const pairKey = `${parsed.cartId || 0}_${key}`;

      // Avoid double-counting if this item is still sitting in the active cart counted in Pass 1A
      if (parsed.cartId && recordedCartVariantPairs.has(pairKey)) {
        const existing = productStatsMap.get(key);
        if (existing) existing.userSet.add(shopperKey);
        continue;
      }

      const qty = Math.max(1, Number(parsed.quantity || 1));
      const unitPrice = Number(parsed.unitPrice || 0);
      const lineValue = Number(parsed.value || unitPrice * qty);

      const existing = productStatsMap.get(key) || {
        key,
        productId: parsed.productId || null,
        variantId: parsed.variantId || null,
        name: parsed.productName || 'FYLEX Timepiece',
        variant: parsed.variantLabel || 'Standard Edition',
        sku: parsed.sku || '-',
        unitPrice,
        totalQty: 0,
        totalValue: 0,
        stock: null,
        userSet: new Set<string>(),
      };

      existing.totalQty += qty;
      existing.totalValue += lineValue;
      existing.userSet.add(shopperKey);
      productStatsMap.set(key, existing);
    }

    const productsAddedToCart = Array.from(productStatsMap.values())
      .map((entry) => ({
        key: entry.key,
        productId: entry.productId,
        variantId: entry.variantId,
        name: entry.name,
        variant: entry.variant,
        sku: entry.sku,
        unitPrice: Number(entry.unitPrice.toFixed(2)),
        totalQty: entry.totalQty,
        uniqueUsers: entry.userSet.size,
        value: Number(entry.totalValue.toFixed(2)),
        currency: 'INR',
        stock: entry.stock,
      }))
      .sort((a, b) => b.value - a.value || b.totalQty - a.totalQty);

    // ─── 2. Aggregate Checkout Initiations & Drop-offs (Went to Checkout, Did Not Pay) ──
    const checkoutRecordsMap = new Map<string, any>();
    const cartsWithUnpaidCheckout = new Set<number>();

    // Source 2A: CHECKOUT_INITIATED ActivityLogs
    for (const log of activityLogs) {
      if (log.action !== 'CHECKOUT_INITIATED' || !log.newData) continue;
      let parsed: any = null;
      let completion: any = null;
      try {
        parsed = JSON.parse(log.newData);
      } catch {
        continue;
      }
      if (log.additionalData) {
        try {
          completion = JSON.parse(log.additionalData);
        } catch {}
      }

      const rzpOrderId = parsed.razorpayOrderId || log.oldData || `chk_${log.id}`;
      const isCompleted = Boolean(completion?.completed) || convertedRzpOrderIds.has(rzpOrderId);

      const cust = log.customer || (parsed.userId && !isNaN(Number(parsed.userId)) ? customerLookup.get(Number(parsed.userId)) : null);
      const name = parsed.customerName || cust?.name || 'Guest Shopper';
      const mobile = String(parsed.customerMobile || cust?.mobile || '').replace(/\D/g, '').slice(-10);
      const email = parsed.customerEmail || cust?.email || '';
      const location = [parsed.city || cust?.city, parsed.pincode].filter(Boolean).join(' - ');
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      const itemSummary = items.map((i: any) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ');
      const value = Number(parsed.value ?? parsed.subtotal ?? 0);

      if (!isCompleted && parsed.cartId) {
        cartsWithUnpaidCheckout.add(Number(parsed.cartId));
      }

      checkoutRecordsMap.set(rzpOrderId, {
        id: rzpOrderId,
        razorpayOrderId: rzpOrderId,
        cartId: parsed.cartId || null,
        createdAt: log.createdAt || parsed.initiatedAt,
        customerName: name,
        customerMobile: mobile,
        customerEmail: email,
        location,
        isGuest: !log.customerId && (!parsed.userId || String(parsed.userId).startsWith('gst_')),
        items,
        itemSummary: itemSummary || 'FYLEX Timepiece',
        itemCount: Number(parsed.itemCount || items.reduce((s: number, i: any) => s + Number(i.quantity || 1), 0) || 1),
        couponCode: parsed.couponCode || '',
        value: Number(value.toFixed(2)),
        currency: 'INR',
        stage: isCompleted ? 'Paid / Completed' : parsed.stage || 'Checkout Opened',
        completed: isCompleted,
        whatsappUrl: !isCompleted ? buildWhatsappLink(mobile, name, itemSummary, value) : null,
      });
    }

    // Source 2B: Razorpay Magic Orders from Razorpay API (captures Nov 18+ sessions & attempted status!)
    for (const ro of rzpRecentOrders) {
      if (!ro?.id) continue;
      const notes = ro.notes || {};
      const rzpCreatedAt = ro.created_at ? new Date(ro.created_at * 1000) : new Date();
      if (rangeStart && rzpCreatedAt < rangeStart) continue;
      if (rangeEnd && rzpCreatedAt > rangeEnd) continue;

      const isPaidInRzp = ro.status === 'paid' || Number(ro.amount_paid || 0) > 0 || convertedRzpOrderIds.has(ro.id);
      const cd = ro.customer_details || {};
      const ship = cd.shipping_address || cd.billing_address || {};
      const linkedCart = notes.cartId ? activeCartMap.get(Number(notes.cartId)) : null;
      const linkedCust =
        linkedCart?.customer ||
        (notes.userId && !isNaN(Number(notes.userId)) ? customerLookup.get(Number(notes.userId)) : null);

      const mobile = String(ship.contact || cd.contact || linkedCust?.mobile || '').replace(/\D/g, '').slice(-10);
      const email = cd.email || ship.email || linkedCust?.email || '';
      const name =
        ship.name ||
        [ship.first_name, ship.last_name].filter(Boolean).join(' ') ||
        cd.name ||
        linkedCust?.name ||
        'Guest Shopper';
      const location = [ship.city || linkedCust?.city, ship.zipcode].filter(Boolean).join(' - ');

      const existing = checkoutRecordsMap.get(ro.id);
      if (existing) {
        // Enrich existing DB log with Razorpay's live status & customer_details
        existing.completed = existing.completed || isPaidInRzp;
        existing.customerName = existing.customerName !== 'Guest Shopper' ? existing.customerName : name;
        existing.customerMobile = existing.customerMobile || mobile;
        existing.customerEmail = existing.customerEmail || email;
        existing.location = existing.location || location;
        if (!existing.completed) {
          existing.stage = ro.status === 'attempted' || Number(ro.attempts || 0) > 0 ? 'Payment Attempted' : existing.stage;
          existing.whatsappUrl = buildWhatsappLink(existing.customerMobile, existing.customerName, existing.itemSummary, existing.value);
        } else {
          existing.stage = 'Paid / Completed';
          existing.whatsappUrl = null;
        }
        continue;
      }

      // Build from Razorpay line_items or linked active cart
      const rzpLineItems = Array.isArray(ro.line_items) ? ro.line_items : [];
      const items = rzpLineItems.length
        ? rzpLineItems.map((li: any) => ({
            name: li.name || 'FYLEX Timepiece',
            variantLabel: li.description || '',
            sku: li.sku || '',
            quantity: Number(li.quantity || 1),
            unitPrice: Number((Number(li.offer_price ?? li.price ?? 0) / 100).toFixed(2)),
            total: Number(((Number(li.offer_price ?? li.price ?? 0) * Number(li.quantity || 1)) / 100).toFixed(2)),
          }))
        : (linkedCart?.items || []).map((ci: any) => ({
            name: ci.productVariant?.product?.name || ci.belt?.name || 'FYLEX Timepiece',
            variantLabel: '',
            sku: ci.productVariant?.sku || '',
            quantity: Number(ci.quantity || 1),
            unitPrice: Number(ci.unitPrice || 0),
            total: Number(ci.total || 0),
          }));

      const itemSummary = items.map((i: any) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ');
      const value = Number(((Number(ro.amount || 0)) / 100).toFixed(2));

      if (!isPaidInRzp && notes.cartId) {
        cartsWithUnpaidCheckout.add(Number(notes.cartId));
      }

      checkoutRecordsMap.set(ro.id, {
        id: ro.id,
        razorpayOrderId: ro.id,
        cartId: notes.cartId ? Number(notes.cartId) : null,
        createdAt: rzpCreatedAt,
        customerName: name,
        customerMobile: mobile,
        customerEmail: email,
        location,
        isGuest: !notes.userId || String(notes.userId).startsWith('gst_'),
        items,
        itemSummary: itemSummary || 'FYLEX Timepiece',
        itemCount: items.reduce((s: number, i: any) => s + Number(i.quantity || 1), 0) || 1,
        couponCode: notes.preAppliedCoupon || '',
        value,
        currency: 'INR',
        stage: isPaidInRzp
          ? 'Paid / Completed'
          : ro.status === 'attempted' || Number(ro.attempts || 0) > 0
          ? 'Payment Attempted'
          : 'Checkout Opened',
        completed: isPaidInRzp,
        whatsappUrl: !isPaidInRzp ? buildWhatsappLink(mobile, name, itemSummary, value) : null,
      });
    }

    // Source 2C: Legacy unpaid online Orders in DB (paymentStatus === 'pending' & paymentMethod !== 'cod')
    for (const ord of ordersInRange) {
      const isCod = ['cod', 'partial_cod'].includes((ord.paymentMethod || '').toLowerCase());
      const isUnpaidOnline = !isCod && ord.paymentStatus === 'pending' && ord.status !== 'delivered';
      if (!isUnpaidOnline) continue;

      const key = `ord_${ord.orderNumber || ord.id}`;
      const addr = ord.addresses?.[0];
      const name =
        ord.customer?.name ||
        `${ord.customerFirstName || ''} ${ord.customerLastName || ''}`.trim() ||
        'Guest Shopper';
      const mobile = String(ord.customerMobile || addr?.phone || ord.customer?.mobile || '')
        .replace(/\D/g, '')
        .slice(-10);
      const email = addr?.email || ord.customer?.email || '';
      const location = [addr?.city, addr?.postcode].filter(Boolean).join(' - ');
      const items = (ord.items || []).map((oi: any) => ({
        name: oi.productName,
        variantLabel: '',
        sku: oi.sku,
        quantity: oi.quantity,
        unitPrice: Number(oi.unitPrice || 0),
        total: Number(oi.total || 0),
      }));
      const itemSummary = items.map((i: any) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ');
      const value = Number(ord.grandTotal || 0);

      checkoutRecordsMap.set(key, {
        id: key,
        razorpayOrderId: ord.orderNumber,
        cartId: null,
        createdAt: ord.createdAt,
        customerName: name,
        customerMobile: mobile,
        customerEmail: email,
        location,
        isGuest: !ord.customerId,
        items,
        itemSummary: itemSummary || 'FYLEX Timepiece',
        itemCount: items.reduce((s: number, i: any) => s + Number(i.quantity || 1), 0) || 1,
        couponCode: ord.couponCode || '',
        value: Number(value.toFixed(2)),
        currency: 'INR',
        stage: ord.status === 'cancelled' ? 'Payment Cancelled' : 'Payment Pending',
        completed: false,
        whatsappUrl: buildWhatsappLink(mobile, name, itemSummary, value),
      });
    }

    // Deduplicate multiple rapid clicks on the same cart within the unpaid list (keep latest attempt per cart/mobile)
    const rawAbandoned = Array.from(checkoutRecordsMap.values())
      .filter((r) => !r.completed)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const seenAbandonedShoppers = new Set<string>();
    const abandonedCheckouts: any[] = [];
    for (const rec of rawAbandoned) {
      const dedupeKey = rec.cartId
        ? `cart_${rec.cartId}`
        : rec.customerMobile
        ? `mob_${rec.customerMobile}_${Math.round(rec.value)}`
        : rec.id;
      if (seenAbandonedShoppers.has(dedupeKey)) continue;
      seenAbandonedShoppers.add(dedupeKey);
      abandonedCheckouts.push(rec);
    }

    // Completed orders in range
    const completedOrders = ordersInRange.filter(
      (o) =>
        (['paid', 'partially_paid'].includes(o.paymentStatus) && !['cancelled', 'refunded'].includes(o.status)) ||
        (['cod', 'partial_cod'].includes((o.paymentMethod || '').toLowerCase()) && !['cancelled', 'refunded'].includes(o.status)),
    );

    // ─── 3. Build Active / Shopper Cart Sessions List ───────────────────────────
    const cartSessions = activeCarts.map((cart) => {
      const cust = cart.customer;
      const items = cart.items.map((item) => {
        const variant = item.productVariant;
        const product = variant?.product;
        const belt = item.belt;
        const attrLabel = (variant?.variantAttributes || [])
          .map((va: any) => va.attributeValue?.label || va.attributeValue?.value)
          .filter(Boolean)
          .join(' • ');
        return {
          name: product?.name || belt?.name || 'FYLEX Timepiece',
          variantLabel: attrLabel || (belt ? 'Strap' : ''),
          sku: variant?.sku || (belt ? `BELT-${belt.id}` : ''),
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice || 0),
          total: Number(item.total || Number(item.unitPrice || 0) * item.quantity),
        };
      });

      const itemSummary = items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ');
      const computedValue =
        Number(cart.grandTotal) > 0
          ? Number(cart.grandTotal)
          : items.reduce((s, i) => s + i.total, 0);
      const reachedCheckout = Boolean(cart.abandonedAt) || cartsWithUnpaidCheckout.has(cart.id);
      const mobile = String(cust?.mobile || '').replace(/\D/g, '').slice(-10);
      const name = cust?.name || 'Guest Visitor';

      return {
        cartId: cart.id,
        sessionId: cart.sessionId || `cust_${cart.customerId}`,
        customerName: name,
        customerMobile: mobile,
        customerEmail: cust?.email || '',
        isGuest: !cart.customerId,
        items,
        itemSummary,
        itemCount: items.reduce((s, i) => s + i.quantity, 0),
        couponCode: cart.offer?.code || '',
        value: Number(computedValue.toFixed(2)),
        currency: 'INR',
        stage: reachedCheckout ? 'Went to Checkout (Unpaid)' : 'Added to Cart Only',
        updatedAt: cart.updatedAt || cart.createdAt,
        createdAt: cart.createdAt,
        whatsappUrl: buildWhatsappLink(mobile, name, itemSummary, computedValue),
      };
    });

    // Ensure uniqueCartUsersSet also counts anyone who initiated or completed checkout in range
    abandonedCheckouts.forEach((ac) => {
      uniqueCartUsersSet.add(ac.cartId ? `cart_${ac.cartId}` : `ab_${ac.id}`);
    });
    completedOrders.forEach((co) => {
      uniqueCartUsersSet.add(co.customerId ? `cust_${co.customerId}` : `ord_${co.id}`);
    });

    const totalItemsAddedToCart = productsAddedToCart.reduce((s, p) => s + p.totalQty, 0);
    const addToCartValue = productsAddedToCart.reduce((s, p) => s + p.value, 0);
    const activeCartsValue = cartSessions.reduce((s, c) => s + c.value, 0);
    const checkoutsAbandonedCount = abandonedCheckouts.length;
    const checkoutsAbandonedValue = abandonedCheckouts.reduce((s, c) => s + c.value, 0);
    const checkoutsCompletedCount = completedOrders.length;
    const checkoutsCompletedValue = completedOrders.reduce((s, o) => s + Number(o.grandTotal || 0), 0);
    const checkoutsInitiatedCount = checkoutsAbandonedCount + checkoutsCompletedCount;
    const checkoutsInitiatedValue = checkoutsAbandonedValue + checkoutsCompletedValue;

    const checkoutAbandonmentRate =
      checkoutsInitiatedCount > 0
        ? Number(((checkoutsAbandonedCount / checkoutsInitiatedCount) * 100).toFixed(1))
        : 0;
    const cartConversionRate =
      uniqueCartUsersSet.size > 0
        ? Number(((checkoutsCompletedCount / uniqueCartUsersSet.size) * 100).toFixed(1))
        : 0;

    return {
      rangeLabel,
      currency: 'INR',
      metaPixelId: '1035472045697724',
      summary: {
        usersAddedToCart: uniqueCartUsersSet.size,
        totalItemsAddedToCart,
        addToCartValue: Number(addToCartValue.toFixed(2)),
        activeCartsCount: cartSessions.length,
        activeCartsValue: Number(activeCartsValue.toFixed(2)),
        checkoutsInitiatedCount,
        checkoutsInitiatedValue: Number(checkoutsInitiatedValue.toFixed(2)),
        checkoutsAbandonedCount,
        checkoutsAbandonedValue: Number(checkoutsAbandonedValue.toFixed(2)),
        checkoutsCompletedCount,
        checkoutsCompletedValue: Number(checkoutsCompletedValue.toFixed(2)),
        checkoutAbandonmentRate,
        cartConversionRate,
      },
      productsAddedToCart,
      abandonedCheckouts,
      cartSessions,
    };
  }

  async getLowStockReport() {
    const report = await this.prisma.productVariant.findMany({
      where: { qty: { lt: 10 } },
      include: {
        product: {
          select: { name: true, sku: true }
        }
      },
      orderBy: { qty: 'asc' }
    });
    return { success: true, data: report };
  }

  // System Settings (with secret redaction on public reads & fast in-memory cache)
  private settingsCache: { all: any[]; expiresAt: number } | null = null;

  private isSensitiveSettingKey(key: string): boolean {
    const k = String(key || '').toLowerCase();
    return (
      k.includes('secret') ||
      k.includes('password') ||
      k.includes('private_key') ||
      k.includes('api_token') ||
      k.includes('access_token') ||
      k.includes('smtp_pass')
    );
  }

  async getSettings(includeSecrets = false) {
    let settings: any[];
    if (this.settingsCache && Date.now() < this.settingsCache.expiresAt) {
      settings = this.settingsCache.all;
    } else {
      settings = await this.prisma.setting.findMany({ orderBy: { sortOrder: 'asc' } });
      this.settingsCache = { all: settings, expiresAt: Date.now() + 30_000 };
    }

    const filtered = includeSecrets
      ? settings
      : settings.filter((s) => !this.isSensitiveSettingKey(s.key));

    return { success: true, data: filtered };
  }

  async updateSettings(data: any) {
    this.settingsCache = null;
    const groupName = data._group || 'shop_page';
    const settingsData = { ...data };
    delete settingsData._group;

    const updates = Object.entries(settingsData).map(async ([key, value]) => {
      const existing = await this.prisma.setting.findFirst({ where: { key } });
      if (existing) {
        return this.prisma.setting.update({
          where: { id: existing.id },
          data: { value: String(value) },
        });
      } else {
        return this.prisma.setting.create({
          data: {
            key,
            value: String(value),
            label: key,
            group: groupName,
          }
        });
      }
    });
    await Promise.all(updates);
    return { success: true };
  }

  // Taxes logic
  async getTaxes() {
    const taxes = await this.prisma.taxRate.findMany({
      where: { deletedAt: null },
      include: { taxClasses: true },
      orderBy: { sortOrder: 'asc' },
    });
    
    const mapped = taxes.map(tax => ({
      ...tax,
      isActive: tax.isActive === 1,
    }));

    return { success: true, data: mapped };
  }

  async createTaxRate(data: any) {
    const { taxClassIds, ...rest } = data;
    const taxRate = await this.prisma.taxRate.create({
      data: {
        name: String(rest.name),
        code: rest.code || null,
        description: rest.description || null,
        rate: Number(rest.rate) || 0,
        type: rest.type || 'percentage',
        isActive: rest.isActive ? 1 : 0,
        priority: Number(rest.priority) || 0,
        sortOrder: Number(rest.sortOrder) || 0,
        isCompound: !!rest.isCompound,
        taxClasses: taxClassIds ? {
          connect: taxClassIds.map((id: any) => ({ id: Number(id) }))
        } : undefined
      },
      include: { taxClasses: true }
    });
    return { success: true, data: { ...taxRate, isActive: taxRate.isActive === 1 } };
  }

  async updateTaxRate(id: number, data: any) {
    const { taxClassIds, ...rest } = data;
    const updateData: any = {};
    if (rest.name !== undefined) updateData.name = String(rest.name);
    if (rest.code !== undefined) updateData.code = rest.code;
    if (rest.description !== undefined) updateData.description = rest.description;
    if (rest.rate !== undefined) updateData.rate = Number(rest.rate);
    if (rest.type !== undefined) updateData.type = rest.type;
    if (rest.isActive !== undefined) updateData.isActive = rest.isActive ? 1 : 0;
    if (rest.priority !== undefined) updateData.priority = Number(rest.priority);
    if (rest.sortOrder !== undefined) updateData.sortOrder = Number(rest.sortOrder);
    if (rest.isCompound !== undefined) updateData.isCompound = !!rest.isCompound;
    
    if (taxClassIds !== undefined) {
      updateData.taxClasses = {
        set: taxClassIds.map((tid: any) => ({ id: Number(tid) }))
      };
    }

    const updated = await this.prisma.taxRate.update({
      where: { id: Number(id) },
      data: updateData,
      include: { taxClasses: true }
    });
    return { success: true, data: { ...updated, isActive: updated.isActive === 1 } };
  }

  async deleteTaxRate(id: number) {
    await this.prisma.taxRate.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  // Tax Classes logic
  async getTaxClasses() {
    const classes = await this.prisma.taxClass.findMany({
      where: { deletedAt: null },
      include: { taxRates: true },
    });
    return { success: true, data: classes };
  }

  async createTaxClass(data: any) {
    const { taxRateIds, ...rest } = data;
    const taxClass = await this.prisma.taxClass.create({
      data: {
        name: String(rest.name),
        code: String(rest.code),
        description: rest.description || null,
        isDefault: rest.isDefault ? 1 : 0,
        taxRates: taxRateIds ? {
          connect: taxRateIds.map((id: any) => ({ id: Number(id) }))
        } : undefined
      },
      include: { taxRates: true }
    });
    return { success: true, data: taxClass };
  }

  async updateTaxClass(id: number, data: any) {
    const { taxRateIds, ...rest } = data;
    const updateData: any = {};
    if (rest.name !== undefined) updateData.name = String(rest.name);
    if (rest.code !== undefined) updateData.code = String(rest.code);
    if (rest.description !== undefined) updateData.description = rest.description;
    if (rest.isDefault !== undefined) updateData.isDefault = rest.isDefault ? 1 : 0;
    
    if (taxRateIds !== undefined) {
      updateData.taxRates = {
        set: taxRateIds.map((rid: any) => ({ id: Number(rid) }))
      };
    }

    const updated = await this.prisma.taxClass.update({
      where: { id: Number(id) },
      data: updateData,
      include: { taxRates: true }
    });
    return { success: true, data: updated };
  }

  async deleteTaxClass(id: number) {
    await this.prisma.taxClass.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }


  // Shipping Methods
  async getShippingMethods() {
    const methods = await this.prisma.shippingMethod.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
    return { success: true, data: methods };
  }

  async createShippingMethod(data: any) {
    const method = await this.prisma.shippingMethod.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        config: data.config ? data.config : null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder || 0,
      },
    });
    return { success: true, data: method };
  }

  async updateShippingMethod(id: number | number, data: any) {
    const sId = Number(id);
    const method = await this.prisma.shippingMethod.update({
      where: { id: sId },
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        config: data.config !== undefined ? data.config : undefined,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });
    return { success: true, data: method };
  }

  async deleteShippingMethod(id: number | number) {
    const sId = Number(id);
    await this.prisma.shippingMethod.update({
      where: { id: sId },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}


