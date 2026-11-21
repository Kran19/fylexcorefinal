"use client";
import React, { useState, useMemo } from 'react';
import Link from 'next/link';

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

export const formatINR = (val) =>
  `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const formatDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function DateRangeFilterBar({
  preset,
  startDate,
  endDate,
  rangeLabel,
  loading,
  onSelectPreset,
  onChangeStartDate,
  onChangeEndDate,
  onApplyCustom,
  onRefresh,
}) {
  return (
    <div
      className="admin-card"
      style={{
        padding: '14px 20px',
        borderRadius: 16,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      {/* Left: Quick Date Presets */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--admin-text-muted)',
            marginRight: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <i className="fas fa-calendar-alt" style={{ color: 'var(--admin-primary)' }}></i>
          Date Range:
        </span>
        {PRESETS.map((p) => {
          const active = preset === p.key && !startDate && !endDate;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onSelectPreset(p.key)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                border: active ? '1px solid var(--admin-primary)' : '1px solid var(--admin-border-light)',
                background: active ? 'var(--admin-primary)' : '#f8fafc',
                color: active ? '#ffffff' : 'var(--admin-text-secondary)',
                transition: 'all 0.18s ease',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Right: Custom Start & End Date Inputs */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onChangeStartDate(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--admin-border)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--admin-text)',
              background: '#fff',
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onChangeEndDate(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--admin-border)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--admin-text)',
              background: '#fff',
            }}
          />
          <button
            type="button"
            onClick={onApplyCustom}
            disabled={!startDate && !endDate}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: !startDate && !endDate ? 'not-allowed' : 'pointer',
              background: !startDate && !endDate ? '#e2e8f0' : '#0f172a',
              color: !startDate && !endDate ? '#94a3b8' : '#fff',
            }}
          >
            Apply
          </button>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh live data"
            style={{
              padding: '6px 11px',
              borderRadius: 8,
              border: '1px solid var(--admin-border-light)',
              background: '#f8fafc',
              color: 'var(--admin-text-secondary)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
          </button>
        )}

        {rangeLabel && (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: '#eef2ff',
              color: '#4338ca',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Showing: {rangeLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function CartCheckoutFunnelPanel({ funnel, compact = false }) {
  const [activeTab, setActiveTab] = useState('abandoned'); // 'abandoned' | 'products' | 'carts'
  const [search, setSearch] = useState('');

  const summary = funnel?.summary || {};
  const productsAdded = funnel?.productsAddedToCart || [];
  const abandonedCheckouts = funnel?.abandonedCheckouts || [];
  const cartSessions = funnel?.cartSessions || [];
  const rangeLabel = funnel?.rangeLabel || 'Selected Period';

  const filteredAbandoned = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return abandonedCheckouts;
    return abandonedCheckouts.filter(
      (r) =>
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.customerMobile || '').toLowerCase().includes(q) ||
        (r.customerEmail || '').toLowerCase().includes(q) ||
        (r.itemSummary || '').toLowerCase().includes(q) ||
        (r.razorpayOrderId || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q),
    );
  }, [abandonedCheckouts, search]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return productsAdded;
    return productsAdded.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.variant || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q),
    );
  }, [productsAdded, search]);

  const filteredCarts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cartSessions;
    return cartSessions.filter(
      (c) =>
        (c.customerName || '').toLowerCase().includes(q) ||
        (c.customerMobile || '').toLowerCase().includes(q) ||
        (c.customerEmail || '').toLowerCase().includes(q) ||
        (c.itemSummary || '').toLowerCase().includes(q) ||
        (c.stage || '').toLowerCase().includes(q),
    );
  }, [cartSessions, search]);

  const handleExportCsv = () => {
    let headers = [];
    let rows = [];
    let filename = `fylex_${activeTab}_export.csv`;

    if (activeTab === 'abandoned') {
      headers = ['Date', 'Shopper', 'Mobile', 'Email', 'Location', 'Products', 'Qty', 'Coupon', 'Value (INR)', 'Stage', 'Reference'];
      rows = filteredAbandoned.map((r) => [
        formatDateTime(r.createdAt),
        r.customerName,
        r.customerMobile || '-',
        r.customerEmail || '-',
        r.location || '-',
        r.itemSummary,
        r.itemCount,
        r.couponCode || '-',
        r.value,
        r.stage,
        r.razorpayOrderId,
      ]);
      filename = 'fylex_checkout_dropoffs.csv';
    } else if (activeTab === 'products') {
      headers = ['Product', 'Variant / Strap', 'SKU', 'Unique Users Added', 'Total Qty Added', 'Unit Price (INR)', 'Total Cart Value (INR)', 'Current Stock'];
      rows = filteredProducts.map((p) => [
        p.name,
        p.variant,
        p.sku,
        p.uniqueUsers,
        p.totalQty,
        p.unitPrice,
        p.value,
        p.stock ?? '-',
      ]);
      filename = 'fylex_products_added_to_cart.csv';
    } else {
      headers = ['Last Updated', 'Shopper', 'Type', 'Mobile', 'Email', 'Products in Cart', 'Qty', 'Cart Value (INR)', 'Funnel Stage'];
      rows = filteredCarts.map((c) => [
        formatDateTime(c.updatedAt),
        c.customerName,
        c.isGuest ? 'Guest' : 'Registered',
        c.customerMobile || '-',
        c.customerEmail || '-',
        c.itemSummary,
        c.itemCount,
        c.value,
        c.stage,
      ]);
      filename = 'fylex_user_carts.csv';
    }

    const escapeCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csvContent = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpiCards = [
    {
      title: 'Users Added to Cart',
      main: `${Number(summary.usersAddedToCart || 0).toLocaleString('en-IN')} Users`,
      valueBadge: `Value: ${formatINR(summary.addToCartValue)}`,
      sub: `${Number(summary.totalItemsAddedToCart || 0)} total items added`,
      icon: 'fas fa-cart-plus',
      gradient: 'linear-gradient(135deg, #6366f1, #4338ca)',
      badgeBg: '#eef2ff',
      badgeColor: '#4338ca',
    },
    {
      title: 'Went to Checkout (Not Paid)',
      main: `${Number(summary.checkoutsAbandonedCount || 0).toLocaleString('en-IN')} Drop-offs`,
      valueBadge: `Unpaid Value: ${formatINR(summary.checkoutsAbandonedValue)}`,
      sub: `${summary.checkoutAbandonmentRate || 0}% of ${summary.checkoutsInitiatedCount || 0} initiated checkouts`,
      icon: 'fas fa-user-clock',
      gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
      badgeBg: '#fff7ed',
      badgeColor: '#c2410c',
    },
    {
      title: 'Active Unpurchased Carts',
      main: `${Number(summary.activeCartsCount || 0).toLocaleString('en-IN')} Carts`,
      valueBadge: `Cart Value: ${formatINR(summary.activeCartsValue)}`,
      sub: 'Items currently sitting in carts',
      icon: 'fas fa-shopping-basket',
      gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
      badgeBg: '#f0f9ff',
      badgeColor: '#0369a1',
    },
    {
      title: 'Completed Checkouts',
      main: `${Number(summary.checkoutsCompletedCount || 0).toLocaleString('en-IN')} Orders`,
      valueBadge: `Paid Value: ${formatINR(summary.checkoutsCompletedValue)}`,
      sub: `${summary.cartConversionRate || 0}% cart-to-order conversion`,
      icon: 'fas fa-check-circle',
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      badgeBg: '#ecfdf5',
      badgeColor: '#047857',
    },
  ];

  const displayAbandoned = compact ? filteredAbandoned.slice(0, 8) : filteredAbandoned;
  const displayProducts = compact ? filteredProducts.slice(0, 8) : filteredProducts;
  const displayCarts = compact ? filteredCarts.slice(0, 8) : filteredCarts;

  return (
    <div className="space-y-5">
      {/* Header + Meta Pixel Value Tracking Badge */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--admin-text)', margin: 0 }}>
            <i className="fas fa-funnel-dollar" style={{ color: 'var(--admin-primary)', marginRight: 8 }}></i>
            Add-to-Cart & Checkout Funnel ({rangeLabel})
          </h3>
          <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', margin: '3px 0 0' }}>
            Track which products shoppers add to cart, who initiates checkout without completing payment, and total ₹ value at every stage.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 999,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: 11,
              fontWeight: 700,
            }}
            title="Meta Pixel fires ViewContent, AddToCart, InitiateCheckout, and Purchase with numeric INR value & currency parameters"
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Meta Pixel #{funnel?.metaPixelId || '1035472045697724'} · INR Value Parameter Active
          </span>

          {compact && (
            <Link
              href="/admin/cart-analytics"
              style={{
                padding: '7px 14px',
                borderRadius: 10,
                background: 'var(--admin-primary)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Open Full Panel <i className="fas fa-arrow-right" style={{ fontSize: 10 }}></i>
            </Link>
          )}
        </div>
      </div>

      {/* 4 Funnel Value KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((c, idx) => (
          <div
            key={idx}
            className="admin-card"
            style={{ padding: '18px 20px', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-text-muted)', margin: 0 }}>{c.title}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--admin-text)', margin: '4px 0 0', letterSpacing: '-0.02em' }}>
                  {c.main}
                </p>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: c.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <i className={c.icon} style={{ color: '#fff', fontSize: 16 }}></i>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <span
                style={{
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: c.badgeBg,
                  color: c.badgeColor,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {c.valueBadge}
              </span>
              <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', fontWeight: 500 }}>{c.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Tabbed Data Card */}
      <div className="admin-card" style={{ borderRadius: 18, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--admin-border-light)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
            {[
              {
                id: 'abandoned',
                label: `Went to Checkout — Not Paid (${abandonedCheckouts.length})`,
                icon: 'fas fa-exclamation-circle',
              },
              {
                id: 'products',
                label: `Products Added to Cart (${productsAdded.length})`,
                icon: 'fas fa-clock',
              },
              {
                id: 'carts',
                label: `Users / Active Carts (${cartSessions.length})`,
                icon: 'fas fa-shopping-cart',
              },
            ].map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: active ? '#ffffff' : 'transparent',
                    color: active ? '#0f172a' : '#64748b',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <i className={t.icon} style={{ color: active ? 'var(--admin-primary)' : '#94a3b8' }}></i>
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Search + CSV Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <i
                className="fas fa-search"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8' }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product, name, mobile..."
                style={{
                  padding: '6px 12px 6px 30px',
                  borderRadius: 8,
                  border: '1px solid var(--admin-border)',
                  fontSize: 12,
                  minWidth: 210,
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid var(--admin-border)',
                background: '#fff',
                color: '#0f172a',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="fas fa-file-csv" style={{ color: '#059669' }}></i> Export CSV
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div style={{ overflowX: 'auto' }}>
          {activeTab === 'abandoned' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid var(--admin-border-light)' }}>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date & Time</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Shopper / Contact</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Products in Checkout</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Value (INR)</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stage</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayAbandoned.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      No unpaid checkout drop-offs recorded in this date range.
                    </td>
                  </tr>
                ) : (
                  displayAbandoned.map((row, idx) => (
                    <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#475569', fontSize: 12 }}>
                        {formatDateTime(row.createdAt)}
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{row.razorpayOrderId}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {row.customerName}
                          <span
                            style={{
                              marginLeft: 6,
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              background: row.isGuest ? '#f1f5f9' : '#eef2ff',
                              color: row.isGuest ? '#64748b' : '#4338ca',
                            }}
                          >
                            {row.isGuest ? 'Guest' : 'Customer'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#475569' }}>
                          {row.customerMobile ? `+91 ${row.customerMobile}` : 'Mobile not entered yet'}
                          {row.customerEmail ? ` · ${row.customerEmail}` : ''}
                        </div>
                        {row.location && <div style={{ fontSize: 11, color: '#94a3b8' }}>📍 {row.location}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 320 }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{row.itemSummary}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {row.itemCount} {row.itemCount === 1 ? 'item' : 'items'}
                          {row.couponCode ? ` · Coupon: ${row.couponCode}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#ea580c', whiteSpace: 'nowrap' }}>
                        {formatINR(row.value)}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            background: row.stage?.includes('Attempted') ? '#fef2f2' : '#fff7ed',
                            color: row.stage?.includes('Attempted') ? '#dc2626' : '#c2410c',
                          }}
                        >
                          {row.stage || 'Checkout Opened'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {row.whatsappUrl ? (
                          <a
                            href={row.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 12px',
                              borderRadius: 8,
                              background: '#16a34a',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <i className="fab fa-whatsapp"></i> Follow Up
                          </a>
                        ) : (
                          <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'products' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid var(--admin-border-light)' }}>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Product / Timepiece</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>SKU</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Users Added</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Total Qty</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Unit Price</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Total Cart Value</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {displayProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      No products added to cart in this date range.
                    </td>
                  </tr>
                ) : (
                  displayProducts.map((p, idx) => (
                    <tr key={p.key || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{p.variant}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>{p.sku}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#4338ca' }}>
                        {p.uniqueUsers} {p.uniqueUsers === 1 ? 'user' : 'users'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{p.totalQty}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#475569' }}>{formatINR(p.unitPrice)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>{formatINR(p.value)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {p.stock !== null && p.stock !== undefined ? (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: p.stock > 5 ? '#ecfdf5' : p.stock > 0 ? '#fffbeb' : '#fef2f2',
                              color: p.stock > 5 ? '#059669' : p.stock > 0 ? '#d97706' : '#dc2626',
                            }}
                          >
                            {p.stock} left
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'carts' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid var(--admin-border-light)' }}>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Last Activity</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Shopper</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Products in Cart</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Cart Value</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Funnel Status</th>
                  <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayCarts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      No active carts found in this date range.
                    </td>
                  </tr>
                ) : (
                  displayCarts.map((c, idx) => (
                    <tr key={c.cartId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: 12, color: '#475569' }}>
                        {formatDateTime(c.updatedAt)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {c.customerName}
                          <span
                            style={{
                              marginLeft: 6,
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              background: c.isGuest ? '#f1f5f9' : '#eef2ff',
                              color: c.isGuest ? '#64748b' : '#4338ca',
                            }}
                          >
                            {c.isGuest ? 'Guest' : 'Customer'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {c.customerMobile ? `+91 ${c.customerMobile}` : c.sessionId}
                          {c.customerEmail ? ` · ${c.customerEmail}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', maxWidth: 320 }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.itemSummary}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {c.itemCount} {c.itemCount === 1 ? 'item' : 'items'}
                          {c.couponCode ? ` · Coupon: ${c.couponCode}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap' }}>
                        {formatINR(c.value)}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            background: c.stage?.includes('Checkout') ? '#fff7ed' : '#f0f9ff',
                            color: c.stage?.includes('Checkout') ? '#c2410c' : '#0369a1',
                          }}
                        >
                          {c.stage}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {c.whatsappUrl ? (
                          <a
                            href={c.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 12px',
                              borderRadius: 8,
                              background: '#16a34a',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <i className="fab fa-whatsapp"></i> Follow Up
                          </a>
                        ) : (
                          <span style={{ fontSize: 11, color: '#cbd5e1' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {compact &&
          ((activeTab === 'abandoned' && filteredAbandoned.length > 8) ||
            (activeTab === 'products' && filteredProducts.length > 8) ||
            (activeTab === 'carts' && filteredCarts.length > 8)) && (
            <div style={{ padding: '12px 20px', background: '#f8fafc', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
              <Link
                href="/admin/cart-analytics"
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--admin-primary)', textDecoration: 'none' }}
              >
                View all records in Cart & Checkout Analytics →
              </Link>
            </div>
          )}
      </div>
    </div>
  );
}
