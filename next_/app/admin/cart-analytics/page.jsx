"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '@/services';
import Loader from '@/components/admin/ui/Loader';
import ErrorBanner from '@/components/admin/ui/ErrorBanner';
import {
  DateRangeFilterBar,
  CartCheckoutFunnelPanel,
} from '@/components/admin/CartCheckoutFunnelPanel';

export default function CartAnalyticsPage() {
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Date filter state (defaults to Last 30 Days for Marketing View)
  const [preset, setPreset] = useState('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadFunnel = useCallback(async (queryParams, isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    const { data, error: err } = await dashboardService.getCartCheckoutFunnel(queryParams);
    if (err) {
      setError(err);
    } else {
      setFunnel(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadFunnel({ preset: '30d' }, true);
  }, [loadFunnel]);

  const handleSelectPreset = (nextPreset) => {
    setPreset(nextPreset);
    setStartDate('');
    setEndDate('');
    loadFunnel({ preset: nextPreset });
  };

  const handleApplyCustom = () => {
    if (!startDate && !endDate) return;
    setPreset('custom');
    loadFunnel({ startDate, endDate });
  };

  const handleRefresh = () => {
    if (startDate || endDate) {
      loadFunnel({ startDate, endDate });
    } else {
      loadFunnel({ preset });
    }
  };

  if (loading) return <Loader message="Loading Cart & Checkout Funnel..." />;
  if (error) return <ErrorBanner message={error} onRetry={handleRefresh} />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div>
          <h2>Cart & Checkout Analytics</h2>
          <p>
            Marketing Intelligence — Products added to cart, unpaid checkout drop-offs, ₹ conversion values, and Meta Pixel ROAS readiness.
          </p>
        </div>
      </div>

      {/* Date Range Selector Above All Data */}
      <DateRangeFilterBar
        preset={preset}
        startDate={startDate}
        endDate={endDate}
        rangeLabel={funnel?.rangeLabel}
        loading={refreshing}
        onSelectPreset={handleSelectPreset}
        onChangeStartDate={setStartDate}
        onChangeEndDate={setEndDate}
        onApplyCustom={handleApplyCustom}
        onRefresh={handleRefresh}
      />

      {/* Full Cart & Checkout Panel */}
      <CartCheckoutFunnelPanel funnel={funnel} compact={false} />
    </div>
  );
}
