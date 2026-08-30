"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import '@/app/admin/css/custom.css';
import { orderService } from '@/services';
import PageHeader from '@/components/admin/ui/PageHeader';
import Loader from '@/components/admin/ui/Loader';
import ErrorBanner from '@/components/admin/ui/ErrorBanner';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';

const statusColors = {
  pending:    { bg: '#fef3c7', color: '#92400e' },
  confirmed:  { bg: '#dbeafe', color: '#1e40af' },
  processing: { bg: '#e0e7ff', color: '#3730a3' },
  shipped:    { bg: '#f0f9ff', color: '#0369a1' },
  delivered:  { bg: '#f0fdf4', color: '#166534' },
  cancelled:  { bg: '#fef2f2', color: '#991b1b' },
  refunded:   { bg: '#f5f3ff', color: '#5b21b6' },
};

const paymentStatusColors = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  paid:    { bg: '#f0fdf4', color: '#166534' },
  failed:  { bg: '#fef2f2', color: '#991b1b' },
  refunded:{ bg: '#f5f3ff', color: '#5b21b6' },
};

const infoRow = (label, value) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px dashed var(--admin-border-light)' }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--admin-text-muted)', minWidth: 120 }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--admin-text)', textAlign: 'right' }}>{value || '—'}</span>
  </div>
);

const OrderDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const orderId = params?.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState(false);
  const [sendingToShiprocket, setSendingToShiprocket] = useState(false);
  const [syncingShiprocket, setSyncingShiprocket] = useState(false);
  
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [updatingTracking, setUpdatingTracking] = useState(false);
  
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await orderService.getOrderById(orderId);
    if (err) { setError(err); }
    else {
      const o = data?.data ?? data;
      setOrder(o);
      setNewStatus(o?.status || '');
      setNewPaymentStatus(o?.paymentStatus || '');
      setCarrier(o?.shipments?.[0]?.carrier || '');
      setTrackingNumber(o?.shipments?.[0]?.trackingNumber || '');
      setTrackingUrl(o?.shipments?.[0]?.trackingUrl || '');
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { if (orderId) fetchOrder(); }, [orderId, fetchOrder]);

  const handleConfirmOrder = async () => {
    setUpdatingStatus(true);
    const { error: err } = await orderService.updateOrderStatus(orderId, 'confirmed', 'Order confirmed by Admin');
    setUpdatingStatus(false);
    if (err) {
      toast?.error?.(err);
    } else {
      toast?.success?.('Order confirmed! Ready to dispatch via Shiprocket.');
      setOrder(prev => ({ ...prev, status: 'confirmed' }));
      fetchOrder();
    }
  };

  const handleSendToShiprocket = async () => {
    setSendingToShiprocket(true);
    try {
      const res = await orderService.sendToShiprocket(orderId);
      const resData = res?.data?.data || res?.data;
      if (res?.error || res?.data?.success === false) {
        toast?.error?.(res?.error || res?.data?.message || 'Failed to dispatch to Shiprocket');
      } else {
        toast?.success?.('Order pushed to Shiprocket! Shipment created.');
        fetchOrder();
      }
    } catch (e) {
      toast?.error?.(e?.message || 'Shiprocket dispatch error');
    } finally {
      setSendingToShiprocket(false);
    }
  };

  const handleSyncShiprocket = async () => {
    setSyncingShiprocket(true);
    try {
      const res = await orderService.syncShiprocket(orderId);
      if (res?.error) {
        toast?.error?.(res?.error);
      } else {
        toast?.success?.('Shiprocket tracking synchronized!');
        fetchOrder();
      }
    } catch (e) {
      toast?.error?.(e?.message || 'Shiprocket sync error');
    } finally {
      setSyncingShiprocket(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === order?.status) return;
    setUpdatingStatus(true);
    const { error: err } = await orderService.updateOrderStatus(orderId, newStatus, overrideReason);
    setUpdatingStatus(false);
    if (err) { toast?.error?.(err); }
    else {
      toast?.success?.('Order status updated!');
      setOrder(prev => ({ ...prev, status: newStatus }));
      setOverrideReason('');
      fetchOrder(); // refresh audit logs
    }
  };

  const handlePaymentStatusUpdate = async () => {
    if (!newPaymentStatus || newPaymentStatus === order?.paymentStatus) return;
    setUpdatingPaymentStatus(true);
    const { error: err } = await orderService.updateOrderPaymentStatus(orderId, newPaymentStatus);
    setUpdatingPaymentStatus(false);
    if (err) { toast?.error?.(err); }
    else {
      toast?.success?.('Payment status updated!');
      setOrder(prev => ({ ...prev, paymentStatus: newPaymentStatus }));
      fetchOrder();
    }
  };

  const handleTrackingUpdate = async () => {
    if (!carrier && !trackingNumber) return;
    setUpdatingTracking(true);
    const { error: err } = await orderService.updateOrderTracking(orderId, { carrier, trackingNumber, trackingUrl });
    setUpdatingTracking(false);
    if (err) { toast?.error?.(err); }
    else {
      toast?.success?.('Tracking information saved!');
      fetchOrder();
    }
  };

  const handleRefund = async () => {
    if (!refundAmount || isNaN(refundAmount) || Number(refundAmount) <= 0) return toast?.error?.('Invalid refund amount');
    setProcessingRefund(true);
    const { error: err } = await orderService.processOrderRefund(orderId, { amount: Number(refundAmount), reason: refundReason });
    setProcessingRefund(false);
    if (err) { toast?.error?.(err); }
    else {
      toast?.success?.('Refund processed!');
      setRefundAmount('');
      setRefundReason('');
      fetchOrder();
    }
  };

  if (loading) return <Loader message="Loading order details..." />;
  if (error)   return <ErrorBanner message={error} onRetry={fetchOrder} />;
  if (!order)  return <ErrorBanner message="Order not found" />;

  const statusStyle = statusColors[order.status?.toLowerCase()] || { bg: '#f1f5f9', color: '#475569' };
  const paymentStyle = paymentStatusColors[order.paymentStatus?.toLowerCase()] || { bg: '#f1f5f9', color: '#475569' };
  const items = order.items || order.orderItems || [];
  const customer = order.customer || {};
  const isOrderPlaced = (order.status || '').toLowerCase() === 'pending';
  const isOrderConfirmed = (order.status || '').toLowerCase() === 'confirmed';
  const isOrderProcessing = (order.status || '').toLowerCase() === 'processing';
  const hasShipment = order.shipments && order.shipments.length > 0;
  const currentShipment = order.shipments?.[0];

  return (
    <div className="animate-fade-in">
      <PageHeader title={`Order ${order.orderNumber || order.id}`} subtitle={`Placed on ${order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}`}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => orderService.downloadInvoice(orderId, false)}
            title="View Invoice"
          >
            <i className="fas fa-file-invoice" style={{ fontSize: 12 }}></i>
            Invoice
          </button>
          <Link href="/admin/orders" className="btn-secondary">
            <i className="fas fa-arrow-left" style={{ fontSize: 12 }}></i>
            Back to Orders
          </Link>
        </div>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

        {/* Left — Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Order Items */}
          <div className="admin-card" style={{ borderRadius: 16 }}>
            <div className="admin-card-header">
              <h3>Items Ordered</h3>
              <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                {items.reduce((acc, item) => acc + (item.quantity || item.qty || 1), 0)} unit{items.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="admin-card-body">
              {items.length === 0 ? (
                <p style={{ color: 'var(--admin-text-muted)', textAlign: 'center', padding: '20px 0', fontSize: 13 }}>
                  No items data available
                </p>
              ) : (
                items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < items.length - 1 ? '1px dashed var(--admin-border-light)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f1f5f9', border: '1px solid var(--admin-border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.image ? (
                          <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <i className="fas fa-box" style={{ color: '#cbd5e1', fontSize: 16 }}></i>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--admin-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.productName || item.name || item.product?.name || 'Product'}
                        </div>
                        {item.sku && <div style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>SKU: {item.sku}</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        ₹{Math.round(Number(item.unitPrice || item.price || 0)).toLocaleString('en-IN')} × {item.quantity || item.qty || 1}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--admin-success)', fontWeight: 700 }}>
                        = ₹{Math.round(Number((item.unitPrice || item.price || 0) * (item.quantity || item.qty || 1))).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Order totals */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '2px solid var(--admin-border)' }}>
                {order.subtotal && infoRow('Subtotal', `₹${Math.round(Number(order.subtotal)).toLocaleString('en-IN')}`)}
                {order.taxTotal != null && infoRow('Tax', `₹${Math.round(Number(order.taxTotal)).toLocaleString('en-IN')}`)}
                {order.shippingTotal != null && infoRow('Shipping', `₹${Math.round(Number(order.shippingTotal)).toLocaleString('en-IN')}`)}
                {order.discountTotal != null && Number(order.discountTotal) > 0 && infoRow('Discount', `-₹${Math.round(Number(order.discountTotal)).toLocaleString('en-IN')}`)}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--admin-text)' }}>Grand Total</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--admin-primary)' }}>
                    ₹{Math.round(Number(order.grandTotal || order.total || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {(order.shipping_address || order.shippingAddress || (order.addresses && order.addresses.length > 0)) && (
            <div className="admin-card" style={{ borderRadius: 16 }}>
              <div className="admin-card-header"><h3>Shipping Address</h3></div>
              <div className="admin-card-body">
                {(() => {
                  const addr = order.shipping_address || order.shippingAddress || order.addresses?.find((a) => a.type === 'shipping') || order.addresses?.[0];
                  return (
                    <div style={{ fontSize: 13, color: 'var(--admin-text-secondary)', lineHeight: 1.8 }}>
                      {(addr?.firstName || addr?.name) && <div style={{ fontWeight: 700, color: 'var(--admin-text)' }}>{`${addr.firstName || ''} ${addr.lastName || ''}`.trim() || addr.name}</div>}
                      <div>{addr?.address1 || addr?.address || addr?.line1}</div>
                      {addr?.city && <div>{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postcode || addr.pincode || addr.zip || ''}</div>}
                      <div>{addr?.country || 'India'}</div>
                      {(addr?.phone || order.customerMobile) && (
                        <div style={{ marginTop: 6 }}>
                          <i className="fas fa-phone" style={{ marginRight: 6, fontSize: 11 }}></i>
                          {addr?.phone || order.customerMobile}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Right — Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* 🚀 SHIPROCKET AUTOMATED FULFILLMENT HUB */}
          <div className="admin-card" style={{ borderRadius: 16, border: '1px solid #6366f1', background: '#0a0a0a' }}>
            <div className="admin-card-header" style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }}></span>
                <h3 style={{ color: '#ffffff', fontSize: 15, margin: 0 }}>Shiprocket Fulfillment</h3>
              </div>
              <span style={{ fontSize: 11, background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                Pickup: Auto-Verified
              </span>
            </div>
            <div className="admin-card-body">
              
              {/* STAGE 1: ORDER PLACED (PENDING CONFIRMATION) */}
              {isOrderPlaced && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#fef08a', lineHeight: 1.5 }}>
                      <i className="fas fa-info-circle mr-1"></i> Order placed by customer. Verify watch customizations & payment before confirmation.
                    </p>
                  </div>
                  <button
                    onClick={handleConfirmOrder}
                    disabled={updatingStatus}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 13,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    {updatingStatus ? <><i className="fas fa-spinner fa-spin"></i> Confirming...</> : <><i className="fas fa-check-circle"></i> Confirm Order</>}
                  </button>
                </div>
              )}

              {/* STAGE 2: CONFIRMED (READY TO DISPATCH TO SHIPROCKET) */}
              {isOrderConfirmed && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#bfdbfe', lineHeight: 1.5 }}>
                      <i className="fas fa-check-double mr-1"></i> Order is confirmed! Ready to register with Shiprocket and generate shipment.
                    </p>
                  </div>
                  <button
                    onClick={handleSendToShiprocket}
                    disabled={sendingToShiprocket}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 13,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                    }}
                  >
                    {sendingToShiprocket ? <><i className="fas fa-spinner fa-spin"></i> Dispatching to Shiprocket...</> : <><i className="fas fa-paper-plane"></i> Send to Shiprocket</>}
                  </button>
                </div>
              )}

              {/* STAGE 3 & 4: PROCESSING / SHIPPED / DELIVERED */}
              {(isOrderProcessing || (order.status !== 'pending' && order.status !== 'confirmed')) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', fontWeight: 600 }}>Shipment Status</span>
                      <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, textTransform: 'capitalize' }}>{order.shippingStatus || order.status}</span>
                    </div>
                    {currentShipment?.trackingNumber && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', fontWeight: 600 }}>AWB / Tracking</span>
                        <span style={{ fontSize: 12, color: '#ffffff', fontWeight: 700, fontFamily: 'monospace' }}>{currentShipment.trackingNumber}</span>
                      </div>
                    )}
                    {currentShipment?.carrier && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', fontWeight: 600 }}>Courier</span>
                        <span style={{ fontSize: 12, color: '#ffffff', fontWeight: 600 }}>{currentShipment.carrier}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleSyncShiprocket}
                      disabled={syncingShiprocket}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      {syncingShiprocket ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sync-alt"></i>}
                      Sync Status
                    </button>
                    {!hasShipment && (
                      <button
                        onClick={handleSendToShiprocket}
                        disabled={sendingToShiprocket}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: '#6366f1',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        {sendingToShiprocket ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-upload"></i>}
                        Push to SR
                      </button>
                    )}
                  </div>

                  {currentShipment?.trackingUrl && (
                    <a
                      href={currentShipment.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: 'rgba(14, 165, 233, 0.1)',
                        color: '#38bdf8',
                        border: '1px solid rgba(14, 165, 233, 0.3)',
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none'
                      }}
                    >
                      <i className="fas fa-external-link-alt mr-1"></i> Open Live Tracking
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Refunds & Adjustments */}
          <div className="admin-card" style={{ borderRadius: 16 }}>
            <div className="admin-card-header"><h3>Refunds & Adjustments</h3></div>
            <div className="admin-card-body">
              {order.returns && order.returns.length > 0 && (
                <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px dashed var(--admin-border-light)' }}>
                  {order.returns.map(r => (
                    <div key={r.id} style={{ fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>-₹{r.refundAmount}</span> ({r.reason || 'No reason'})
                    </div>
                  ))}
                </div>
              )}
              <input type="number" placeholder="Refund Amount (₹)" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--admin-border)', borderRadius: 10, fontSize: 13, outline: 'none', marginBottom: 10 }} />
              <input type="text" placeholder="Reason (e.g. Damaged item)" value={refundReason} onChange={e => setRefundReason(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--admin-border)', borderRadius: 10, fontSize: 13, outline: 'none', marginBottom: 10 }} />
              <button onClick={handleRefund} className="btn-primary" disabled={processingRefund || order.paymentStatus !== 'paid'} style={{ width: '100%', justifyContent: 'center', background: '#ef4444', borderColor: '#ef4444' }}>
                {processingRefund ? 'Processing...' : 'Issue Refund'}
              </button>
            </div>
          </div>

          {/* Audit Log */}
          <div className="admin-card" style={{ borderRadius: 16 }}>
            <div className="admin-card-header"><h3>Audit Log</h3></div>
            <div className="admin-card-body" style={{ maxHeight: 250, overflowY: 'auto' }}>
              {order.statusHistory && order.statusHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {order.statusHistory.map(h => (
                    <div key={h.id} style={{ fontSize: 12, borderLeft: '2px solid var(--admin-border)', paddingLeft: 10 }}>
                      <div style={{ fontWeight: 700, color: 'var(--admin-text)' }}>{h.status?.toUpperCase() || 'UPDATE'}</div>
                      <div style={{ color: 'var(--admin-text-muted)', fontSize: 11 }}>{new Date(h.createdAt).toLocaleString()}</div>
                      {h.notes && <div style={{ marginTop: 4, color: 'var(--admin-text-secondary)', fontStyle: 'italic' }}>"{h.notes}"</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>No logs available</p>
              )}
            </div>
          </div>

          {/* Customer Info */}
          <div className="admin-card" style={{ borderRadius: 16 }}>
            <div className="admin-card-header"><h3>Customer Details</h3></div>
            <div className="admin-card-body">
              {infoRow('Name', order.customer_name || (order.customerFirstName ? `${order.customerFirstName} ${order.customerLastName || ''}` : customer.name))}
              {infoRow('Email', order.customer_email || order.customerEmail || customer.email || (order.addresses?.[0]?.email))}
              {infoRow('Phone', order.customer_phone || order.customerMobile || customer.phone || customer.mobile || (order.addresses?.[0]?.phone))}
              {infoRow('Payment', order.paymentMethod)}
            </div>
          </div>

          {/* Order Meta */}
          <div className="admin-card" style={{ borderRadius: 16 }}>
            <div className="admin-card-header"><h3>Order Info</h3></div>
            <div className="admin-card-body">
              {infoRow('Order #', order.orderNumber || order.id)}
              {infoRow('Placed on', order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')}
              {infoRow('Items', items.reduce((acc, item) => acc + (item.quantity || item.qty || 1), 0))}
              {order.couponCode && infoRow('Coupon', order.couponCode)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;

