"use client";
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchProfileDashboardApi, updateMyProfileApi } from '@/lib/api';
import { getFileUrl } from '@/lib/utils';
import { orderService } from '@/services';
import './profile.css';

const emptyDashboard = {
  profile: null,
  stats: { totalOrders: 0, activeOrders: 0, totalSpent: 0, wishlistCount: 0 },
  recentOrders: [],
  orderHistory: [],
  trackingOrders: [],
  latestOrderTracking: null,
};

const statusStyles = {
  PENDING:            'status-processing',
  CONFIRMED:          'status-processing',
  PROCESSING:         'status-processing',
  SHIPPED:            'status-shipped',
  OUT_FOR_DELIVERY:   'status-shipped',
  DELIVERED:          'status-delivered',
  CANCELLED:          'status-cancelled',
  FAILED:             'status-cancelled',
  REFUNDED:           'status-refunded',
  PARTIALLY_REFUNDED: 'status-refunded',
  RETURNED:           'status-returned',
};

const resolveOrderImg = (order) => {
  if (!order) return getFileUrl('/Rim.png');
  const raw = order.preview?.image ||
              order.items?.[0]?.image ||
              order.items?.[0]?.productVariant?.variantImages?.[0]?.media?.filePath ||
              order.items?.[0]?.productVariant?.variantImages?.[0]?.media ||
              order.items?.[0]?.productVariant?.image ||
              order.items?.[0]?.product?.heroImage ||
              order.items?.[0]?.product?.image ||
              order.heroImage;
  const path = typeof raw === 'object' ? (raw?.url || raw?.path || raw?.filePath || raw?.fileName) : raw;
  if (!path || typeof path !== 'string' || path.trim() === '') return getFileUrl('/Rim.png');
  return getFileUrl(path) || getFileUrl('/Rim.png');
};

const Profile = () => {
  const { logout, loading, isAuthenticated, verifySession } = useAuth();
  const navigate = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [selectedTrackingOrderId, setSelectedTrackingOrderId] = useState('');
  const [settingsForm, setSettingsForm] = useState({ name: '', mobile: '', address: '' });

  const pillsRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const handlePillsMouseDown = (e) => {
    isDraggingRef.current = true;
    startXRef.current = e.pageX - (pillsRef.current?.offsetLeft || 0);
    scrollLeftRef.current = pillsRef.current?.scrollLeft || 0;
  };

  const handlePillsMouseMove = (e) => {
    if (!isDraggingRef.current || !pillsRef.current) return;
    e.preventDefault();
    const x = e.pageX - (pillsRef.current.offsetLeft || 0);
    const walk = (x - startXRef.current) * 1.5;
    pillsRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handlePillsMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handlePillsTouchStart = (e) => {
    isDraggingRef.current = true;
    startXRef.current = e.touches[0].pageX - (pillsRef.current?.offsetLeft || 0);
    scrollLeftRef.current = pillsRef.current?.scrollLeft || 0;
  };

  const handlePillsTouchMove = (e) => {
    if (!isDraggingRef.current || !pillsRef.current) return;
    const x = e.touches[0].pageX - (pillsRef.current.offsetLeft || 0);
    const walk = (x - startXRef.current) * 1.5;
    pillsRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate.replace('/login');
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const orderIdParam = params.get('order_id') || params.get('orderId');
      if (tabParam && ['overview', 'orders', 'track', 'settings'].includes(tabParam)) {
        setActiveTab(tabParam);
      } else if (orderIdParam) {
        setActiveTab('track');
      }
      if (orderIdParam) {
        setSelectedTrackingOrderId(orderIdParam);
      }
    }
  }, []);

  const loadDashboard = async () => {
    setDashboardLoading(true);
    setDashboardError('');
    const result = await fetchProfileDashboardApi();
    if (!result?.success || !result?.data?.profile) {
      setDashboardError(result?.error || 'Unable to load your profile.');
      setDashboardLoading(false);
      return;
    }
    setDashboard(result.data);

    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const requestedOrderId = params?.get('order_id') || params?.get('orderId');
    const matchingOrder = requestedOrderId
      ? result.data.trackingOrders?.find(o => 
          String(o.orderId) === String(requestedOrderId) || 
          String(o.orderNumber) === String(requestedOrderId)
        )
      : null;

    setSelectedTrackingOrderId(
      matchingOrder?.orderId || 
      matchingOrder?.orderNumber ||
      requestedOrderId || 
      result.data.latestOrderTracking?.orderId || 
      result.data.trackingOrders?.[0]?.orderId || 
      ''
    );

    setSettingsForm({
      name: result.data.profile.name || '',
      mobile: result.data.profile.mobile || '',
      address: result.data.profile.address || '',
    });
    setDashboardLoading(false);
  };

  useEffect(() => {
    if (!loading && isAuthenticated) loadDashboard();
  }, [loading, isAuthenticated]);

  const handleProfileUpdate = async () => {
    if (!settingsForm.name.trim()) { setDashboardError('Full name is required.'); return; }
    setSaving(true); setSaveMessage('');
    const result = await updateMyProfileApi({
      name: settingsForm.name.trim(),
      mobile: settingsForm.mobile.trim() || undefined,
      address: settingsForm.address.trim() || undefined,
    });
    if (!result?.success) { setDashboardError(result?.error || 'Update failed.'); setSaving(false); return; }
    await verifySession();
    await loadDashboard();
    setSaveMessage('Profile updated successfully.');
    setSaving(false);
  };

  if (loading || !isAuthenticated || dashboardLoading) {
    return (
      <div className="profile-spinner-wrap">
        <div className="profile-spinner"></div>
      </div>
    );
  }

  const { profile, stats, recentOrders, orderHistory, trackingOrders } = dashboard;
  const tracking = (trackingOrders || []).find(o => 
    String(o.orderId) === String(selectedTrackingOrderId) || 
    String(o.orderNumber) === String(selectedTrackingOrderId)
  ) || dashboard.latestOrderTracking;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    { id: 'orders',   label: 'History',  icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg> },
    { id: 'track',    label: 'Tracking', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { id: 'settings', label: 'Settings', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg> },
  ];

  return (
    <div className="profile-page-wrapper">
      <div className="profile-bg-blob blob-1"></div>
      <div className="profile-bg-blob blob-2"></div>

      <div className="profile-container">
        {/* MOBILE HEADER */}
        <header className="mobile-header">
          <div className="mobile-avatar">
            {profile?.name ? profile.name[0] : (profile?.email ? profile.email[0] : '?')}
          </div>
          <div className="mobile-user-info">
            <h2>{profile?.name || 'Member'}</h2>
          </div>
        </header>

        {/* MOBILE BOTTOM NAV */}
        <nav className="mobile-nav">
          {tabs.map(tab => (
            <button key={tab.id} className={`mobile-nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.icon}
            </button>
          ))}
          <button className="mobile-nav-item" style={{ color: '#ef4444' }} onClick={() => { logout(); navigate.push('/'); }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </nav>

        {/* DESKTOP SIDEBAR */}
        <aside className="profile-sidebar">
          <div className="user-profile-header">
            <div className="profile-avatar-large">
              {profile?.name ? profile.name[0] : (profile?.email ? profile.email[0] : '?')}
            </div>
            <h2 className="profile-name-title">{profile?.name || 'Member'}</h2>
          </div>
          <ul className="profile-nav-list">
            {tabs.map(tab => (
              <li key={tab.id} className={`profile-nav-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                {tab.icon} {tab.label}
              </li>
            ))}
          </ul>
          <div className="logout-pill" onClick={() => { logout(); navigate.push('/'); }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </div>
          <Link href="/" className="back-to-home">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Return to Store
          </Link>
        </aside>

        {/* MAIN CONTENT */}
        <main className="profile-main-content">
          {dashboardError && <div className="profile-message error">{dashboardError}</div>}
          {saveMessage   && <div className="profile-message success">{saveMessage}</div>}

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="tab-pane">
              <h1 className="section-title" style={{ marginBottom: '36px' }}>The Collection Overview</h1>

              <div className="stats-cluster">
                <div className="stat-box">
                  <span className="stat-lbl">Total Orders</span>
                  <span className="stat-val">{stats.totalOrders.toString().padStart(2, '0')}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-lbl">Active Orders</span>
                  <span className="stat-val">{stats.activeOrders.toString().padStart(2, '0')}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-lbl">Wishlist Items</span>
                  <span className="stat-val">{stats.wishlistCount.toString().padStart(2, '0')}</span>
                </div>
              </div>

              <h3 style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#ffffff', marginBottom: '20px' }}>Recent Acquisitions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentOrders.length > 0 ? recentOrders.map(order => (
                  <div key={order.id} className="order-card-premium">
                    <img
                      src={resolveOrderImg(order)}
                      alt="Product"
                      className="item-thumb"
                      onError={(e) => { e.currentTarget.src = getFileUrl('/Rim.png'); }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>#{order.orderNumber || order.id}</span>
                      <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}>{order.preview?.title || 'Bespoke Timepiece'}</h4>
                      <div className="md:hidden" style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={`item-status-pill ${statusStyles[order.status?.toUpperCase()] || 'status-processing'}`}>{order.status}</span>
                        {order.trackingUrl && (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="order-action-track"
                            title={`Track shipment on ${order.carrier || 'Shiprocket'}`}
                          >
                            <span>Track</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 11, height: 11 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {order.trackingUrl && (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="order-action-track"
                            title={`Track shipment on ${order.carrier || 'Shiprocket'}`}
                          >
                            <span>Track</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 11, height: 11 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                        <span className={`item-status-pill ${statusStyles[order.status?.toUpperCase()] || 'status-processing'}`}>{order.status}</span>
                      </div>
                    </div>
                  </div>
                )) : <div className="empty-state">No recent acquisitions.</div>}
              </div>
            </div>
          )}

          {/* ── ORDERS ── */}
          {activeTab === 'orders' && (
            <div className="tab-pane">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: 16 }}>
                <div>
                  <h1 className="section-title" style={{ marginBottom: 4 }}>Acquisition History</h1>
                  <p className="section-subtitle" style={{ marginBottom: 0 }}>A complete record of all {stats.totalOrders} orders.</p>
                </div>
                {orderHistory.length > 0 && (
                  <button 
                    onClick={() => setDashboard(prev => ({ ...prev, orderHistory: [] }))}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)', padding: '6px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: '#ffffff' }}
                  >
                    Clear History
                  </button>
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block" style={{ overflowX: 'auto' }}>
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Timepiece</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderHistory.map(order => (
                      <tr key={order.id}>
                        <td className="col-id">#{order.orderNumber || order.id}</td>
                        <td className="col-date">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : 'N/A'}</td>
                        <td className="col-name">{order.preview?.title || 'Watch'}</td>
                        <td className="col-amt">₹{Number(order.grandTotal || 0).toLocaleString('en-IN')}</td>
                        <td><span className={`item-status-pill ${statusStyles[order.status?.toUpperCase()] || 'status-processing'}`}>{order.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {order.trackingUrl && (
                              <a
                                href={order.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="order-action-track"
                                title={`Track shipment on ${order.carrier || 'Shiprocket'}`}
                              >
                                <span>Track</span>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 11, height: 11 }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            )}
                            <button 
                              onClick={() => orderService.downloadInvoice(order.id, true)}
                              title="Download Invoice"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff', padding: '4px', display: 'flex', alignItems: 'center' }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {orderHistory.map(order => (
                  <div key={order.id} className="mobile-order-card">
                    <div className="m-order-info">
                      <span className="m-order-num">#{order.orderNumber || order.id}</span>
                      <span className="m-order-name">{order.preview?.title || 'Watch'}</span>
                      <span className="m-order-date">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : 'N/A'}</span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="m-order-price" style={{ marginBottom: '6px' }}>₹{Number(order.grandTotal || 0).toLocaleString('en-IN')}</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {order.trackingUrl && (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="order-action-track"
                            title={`Track shipment on ${order.carrier || 'Shiprocket'}`}
                          >
                            <span>Track</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 11, height: 11 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                        <button 
                          onClick={() => orderService.downloadInvoice(order.id, true)}
                          title="Download Invoice"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff', display: 'flex', alignItems: 'center' }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                        <span className={`item-status-pill ${statusStyles[order.status?.toUpperCase()] || 'status-processing'}`}>{order.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TRACKING ── */}
          {activeTab === 'track' && (
            <div className="tab-pane">
              <h1 className="section-title">Timeline & Tracking</h1>
              <p className="section-subtitle">Select an order to view its real-time progress.</p>

              {trackingOrders.length > 1 ? (
                <div
                  ref={pillsRef}
                  className="order-pills-scroll lenis-prevent"
                  data-lenis-prevent="true"
                  onMouseDown={handlePillsMouseDown}
                  onMouseMove={handlePillsMouseMove}
                  onMouseUp={handlePillsMouseUpOrLeave}
                  onMouseLeave={handlePillsMouseUpOrLeave}
                  onTouchStart={handlePillsTouchStart}
                  onTouchMove={handlePillsTouchMove}
                  onTouchEnd={handlePillsMouseUpOrLeave}
                >
                  {trackingOrders.map(order => {
                    const isSelected = String(selectedTrackingOrderId) === String(order.orderId) || String(selectedTrackingOrderId) === String(order.orderNumber);
                    return (
                      <button
                        key={order.orderId}
                        onClick={() => setSelectedTrackingOrderId(order.orderId)}
                        style={{
                          flexShrink: 0,
                          padding: '10px 20px',
                          borderRadius: '999px',
                          background: isSelected ? '#ffffff' : '#111111',
                          color: isSelected ? '#000000' : '#ffffff',
                          border: '1px solid ' + (isSelected ? '#ffffff' : 'rgba(255,255,255,0.15)'),
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        #{order.orderNumber || order.orderId} · {order.preview?.title || 'Watch'}
                      </button>
                    );
                  })}
                </div>
              ) : trackingOrders.length === 1 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#111111', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', marginBottom: '24px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>#{trackingOrders[0].orderNumber || trackingOrders[0].orderId}</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{trackingOrders[0].preview?.title || 'Bespoke Timepiece'}</span>
                </div>
              ) : null}

              {tracking ? (
                <div className="tracking-viz">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '9px', color: '#a0a0a0', textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>Current Journey</span>
                      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 500, marginTop: '4px', wordBreak: 'break-word' }}>Order #{tracking.orderNumber}</h4>
                      {tracking.trackingNumber && (
                        <div className="tracking-awb-badge">
                          <span>AWB:</span>
                          <strong>{tracking.trackingNumber}</strong>
                          {tracking.carrier && <span style={{ opacity: 0.7 }}>· {tracking.carrier}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {tracking.trackingUrl && (
                        <a
                          href={tracking.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tracking-direct-btn"
                          title={`Track directly on ${tracking.carrier || 'Shiprocket'}`}
                        >
                          <span>Live Shiprocket Tracking</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: 12, height: 12 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                      <span style={{ fontSize: '9px', fontWeight: 700, background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '999px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ffffff', flexShrink: 0, whiteSpace: 'nowrap' }}>{tracking.currentStatus}</span>
                    </div>
                  </div>

                  {/* Desktop timeline */}
                  <div className="hidden md:block" style={{ position: 'relative', zIndex: 1, marginTop: '40px' }}>
                    <div style={{ position: 'relative' }}>
                      {/* Background Bar */}
                      <div style={{ position: 'absolute', top: '14px', left: '0', right: '0', height: '2px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px' }}></div>
                      
                      {/* Active Progress Bar */}
                      <div style={{ 
                        position: 'absolute', top: '14px', left: '0', height: '2px', 
                        background: '#ffffff', borderRadius: '2px', transition: 'width 1s ease',
                        width: `${tracking?.timeline && tracking.timeline.length > 1 ? Math.max(0, Math.min(100, ((tracking.timeline.filter(s => s.completed).length - 1) / (tracking.timeline.length - 1)) * 100)) : 0}%`,
                        boxShadow: '0 0 10px rgba(255,255,255,0.4)'
                      }}></div>

                      {/* Nodes */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                        {(tracking?.timeline || []).map((step, index) => (
                          <div key={step.label || index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '120px', marginLeft: index === 0 ? '-60px' : '0', marginRight: index === (tracking?.timeline?.length || 1) - 1 ? '-60px' : '0' }}>
                            <div style={{
                              width: '30px', height: '30px', borderRadius: '50%', background: '#000000',
                              border: `2px solid ${step.completed ? '#ffffff' : 'rgba(255, 255, 255, 0.2)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: step.completed ? '0 0 12px rgba(255,255,255,0.3)' : 'none',
                              transition: 'all 0.3s ease', zIndex: 2
                            }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: step.completed ? '#ffffff' : 'transparent' }}></div>
                            </div>
                            <span style={{ 
                              marginTop: '16px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
                              color: step.completed ? '#ffffff' : 'rgba(255, 255, 255, 0.4)', textAlign: 'center'
                            }}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mobile timeline */}
                  <div className="md:hidden" style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
                    {/* Vertical Background Line */}
                    <div style={{ position: 'absolute', left: '14px', top: '14px', bottom: '14px', width: '2px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px' }}></div>
                    
                    {(tracking?.timeline || []).map((step, index) => (
                      <div key={step.label || index} style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', position: 'relative', zIndex: 2 }}>
                        {/* Node */}
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%', background: '#000000', flexShrink: 0,
                          border: `2px solid ${step.completed ? '#ffffff' : 'rgba(255, 255, 255, 0.2)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: step.completed ? '0 0 12px rgba(255,255,255,0.3)' : 'none',
                          transition: 'all 0.3s ease'
                        }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: step.completed ? '#ffffff' : 'transparent' }}></div>
                        </div>
                        {/* Info */}
                        <div style={{ paddingTop: '4px' }}>
                          <h4 style={{ 
                            fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, margin: 0,
                            color: step.completed ? '#ffffff' : 'rgba(255, 255, 255, 0.4)'
                          }}>
                            {step.label}
                          </h4>
                          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                            {step.date ? new Date(step.date).toLocaleString('en-IN') : 'Pending'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state">No timelines available.</div>
              )}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (
            <div className="tab-pane">
              <h1 className="section-title">Security & Profile</h1>
              <p className="section-subtitle">Maintain your profile and secure your experience.</p>

              <div className="settings-card">
                <div className="profile-form-grid">
                  <div className="form-field">
                    <label className="form-label">Full Name</label>
                    <input type="text" value={settingsForm.name} onChange={e => setSettingsForm(p => ({ ...p, name: e.target.value }))} className="form-input" placeholder="Enter full name" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Mobile Number</label>
                    <input type="text" value={settingsForm.mobile} onChange={e => setSettingsForm(p => ({ ...p, mobile: e.target.value }))} className="form-input" placeholder="Enter mobile number" />
                  </div>
                </div>

                <div className="profile-form-grid">
                  <div className="form-field">
                    <label className="form-label form-label-muted">Digital Address</label>
                    <input type="email" value={profile?.email || ''} className="form-input" disabled />
                  </div>
                  <div className="form-field">
                    <label className="form-label form-label-muted">Member Since</label>
                    <input type="text" value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN') : 'N/A'} className="form-input" disabled />
                  </div>
                </div>

                <div className="form-field" style={{ marginBottom: '32px' }}>
                  <label className="form-label">Address</label>
                  <textarea rows="3" value={settingsForm.address} onChange={e => setSettingsForm(p => ({ ...p, address: e.target.value }))} className="form-textarea form-input" placeholder="Enter your full address…" />
                </div>

                <hr className="settings-divider" />

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '20px' }}>
                  <button onClick={handleProfileUpdate} disabled={saving} className="primary-btn">
                    {saving ? 'Updating…' : 'Update Registry'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Profile;