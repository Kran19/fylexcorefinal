"use client";
import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useOrder } from '@/context/OrderContext';
import {
  calculateTotalApi,
  initiateMagicPaymentApi,
  completeMagicPaymentApi,
  checkMagicOrderApi,
  completeFreeMagicOrderApi,
} from '@/lib/api';
import { getFileUrl } from '@/lib/utils';

function ensureRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existing = document.getElementById('razorpay-magic-runtime');
    if (existing) {
      const checkInterval = setInterval(() => {
        if (window.Razorpay) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(Boolean(window.Razorpay));
      }, 6000);
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-magic-runtime';
    script.src = 'https://checkout.razorpay.com/v1/magic-checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      const fallback = document.createElement('script');
      fallback.src = 'https://checkout.razorpay.com/v1/checkout.js';
      fallback.async = true;
      fallback.onload = () => resolve(Boolean(window.Razorpay));
      fallback.onerror = () => resolve(false);
      document.body.appendChild(fallback);
    };
    document.body.appendChild(script);
  });
}

function CartItemRow({ item, index, onQtyChange, onRemove, onMoveToWishlist, isProcessing }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 120 + 80);
    return () => clearTimeout(t);
  }, [index]);

  const displayPrice =
    item.formattedPrice ||
    item.priceDisplay ||
    (item.unitPrice ? `₹${Math.round(Number(item.unitPrice)).toLocaleString('en-IN')}` : '');
  const displayName = `${item.title} ${item.titleAccent || ''}`.trim();
  const displayVariant = item.subtitle;
  const displayColor = item.accentColor || '#1C2E4A';
  const isBelt = item.subtitle === 'Belt' || (item.productId && String(item.productId).startsWith('belt-'));
  const rawImg = item.image || item.imageUrl || item.img || item.filePath || item.mediaUrl || item.beltImage || item.belt?.image;
  let resolvedImgPath = typeof rawImg === 'object'
    ? (rawImg?.url || rawImg?.path || rawImg?.filePath || rawImg?.fileName || rawImg?.media?.url || rawImg?.media?.path)
    : rawImg;

  if (!resolvedImgPath || typeof resolvedImgPath !== 'string' || resolvedImgPath.trim() === '') {
    resolvedImgPath = isBelt ? '/assets/fylex-watch-v2/everose-gold.png' : '/Rim.png';
  }

  const displayImage = getFileUrl(resolvedImgPath);
  const redirectUrl = item.redirectUrl || (isBelt ? '/products' : `/explore?watch=${item.productId}&variant=${item.variantId}`);

  return (
    <div
      className="cart-item-row"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: 'opacity 0.55s ease, transform 0.55s ease',
      }}
    >
      <Link href={redirectUrl} className="cart-item-top-link">
        <div className="cart-item-top">
          <div
            className="cart-watch-visual"
            style={{
              background: `linear-gradient(135deg, ${displayColor}15, ${displayColor}25)`,
            }}
          >
            <img
              src={displayImage}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <div className="cart-item-details">
            <div className="cart-item-name">{displayName}</div>
            <div className="cart-item-variant">{displayVariant}</div>
            <div className="cart-item-price">{displayPrice}</div>
          </div>
        </div>
      </Link>

      <div className="cart-item-actions">
        <div className={`cart-qty-block ${isProcessing ? 'processing' : ''}`}>
          <button
            className="cart-qty-btn"
            onClick={() => !isProcessing && onQtyChange(item.id, -1)}
            disabled={isProcessing}
          >
            −
          </button>
          <span className="cart-qty-val">{isProcessing ? '...' : item.qty}</span>
          <button
            className="cart-qty-btn"
            onClick={() => !isProcessing && onQtyChange(item.id, 1)}
            disabled={isProcessing}
          >
            +
          </button>
        </div>

        <div className="cart-row-secondary-actions">
          {!isBelt && (
            <button
              className={`cart-wishlist-btn ${isProcessing ? 'processing' : ''}`}
              onClick={() => !isProcessing && onMoveToWishlist(item)}
              disabled={isProcessing}
              title="Move to Wishlist"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </button>
          )}

          <button
            className={`cart-remove-btn ${isProcessing ? 'processing' : ''}`}
            onClick={() => !isProcessing && onRemove(item.id)}
            disabled={isProcessing}
            title="Remove"
          >
            {isProcessing ? (
              <div className="cart-spinner-small" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CartContent() {
  const navigate = useRouter();
  const searchParams = useSearchParams();
  const { items, updateQty, removeFromCart, clearCart, totals: cartTotals, processingItems } = useCart();
  const { toggleWishlist } = useWishlist();
  const { user, guestId, setSession } = useAuth();
  const { prependRawOrder, refreshOrders } = useOrder();

  const [heroVisible, setHeroVisible] = useState(true);
  const summaryRef = useRef(null);
  const paymentHandledRef = useRef(false);
  const autoTriggeredRef = useRef(false);

  // Coupon & FYLEX Credits State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponErrorMsg, setCouponErrorMsg] = useState('');
  const [useCredits, setUseCredits] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  // 1-Click Magic Checkout State
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutStatusText, setCheckoutStatusText] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  // 100% Free Coupon Claim Modal State (Only used when total === ₹0)
  const [showFreeModal, setShowFreeModal] = useState(false);
  const [freeForm, setFreeForm] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    email: user?.email || '',
    pincode: '',
    city: user?.city || '',
    state: '',
    address: user?.address || '',
  });
  const [isPinFetching, setIsPinFetching] = useState(false);
  const [freeFormError, setFreeFormError] = useState('');

  const getEffectiveUserId = useCallback(() => {
    if (user?.id) return String(user.id);
    if (guestId) return String(guestId);
    if (typeof window !== 'undefined') {
      let gid = localStorage.getItem('fylexx_guest_id');
      if (!gid) {
        gid = `gst_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
        localStorage.setItem('fylexx_guest_id', gid);
      }
      return gid;
    }
    return '';
  }, [user?.id, guestId]);

  const itemsFallbackSubtotal = items.reduce(
    (s, i) => s + (Number(i.total) || Number(i.unitPrice) * Number(i.qty || 1)),
    0,
  );

  const [serverTotals, setServerTotals] = useState({
    subtotal: cartTotals.subtotal || itemsFallbackSubtotal || 0,
    shipping: 0,
    discount: 0,
    couponDiscount: 0,
    creditDiscount: 0,
    availableCredits: 0,
    appliedCredits: 0,
    total: cartTotals.grandTotal || itemsFallbackSubtotal || 0,
    offerDescription: '',
  });

  useEffect(() => {
    if (user) {
      setFreeForm((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        mobile: prev.mobile || user.mobile || '',
        email: prev.email || user.email || '',
        city: prev.city || user.city || '',
        address: prev.address || user.address || '',
      }));
    }
  }, [user]);

  // Live server calculation for Subtotal, Promo Codes, and FYLEX Credits
  useEffect(() => {
    let cancelled = false;
    const syncTotals = async () => {
      const activeId = getEffectiveUserId();
      if (!activeId || items.length === 0) return;

      setIsCalculating(true);
      try {
        const res = await calculateTotalApi(activeId, null, appliedCoupon || undefined, useCredits);
        if (cancelled) return;

        if (res?.success && res?.data && res.data.subtotal > 0) {
          setServerTotals({
            subtotal: Number(res.data.subtotal || itemsFallbackSubtotal),
            shipping: Number(res.data.shipping || 0),
            discount: Number(res.data.discount || 0),
            couponDiscount: Number(res.data.couponDiscount || 0),
            creditDiscount: Number(res.data.creditDiscount || 0),
            availableCredits: Number(res.data.availableCredits || 0),
            appliedCredits: Number(res.data.appliedCredits || 0),
            total: Number(res.data.total ?? itemsFallbackSubtotal),
            offerDescription: res.data.offerDescription || '',
          });
          setCouponErrorMsg(res.data.couponError || '');
        } else {
          setServerTotals((prev) => ({
            ...prev,
            subtotal: itemsFallbackSubtotal,
            shipping: 0,
            discount: 0,
            couponDiscount: 0,
            creditDiscount: 0,
            total: itemsFallbackSubtotal,
          }));
        }
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    };

    syncTotals();
    return () => {
      cancelled = true;
    };
  }, [items, itemsFallbackSubtotal, appliedCoupon, useCredits, getEffectiveUserId]);

  const handleFinalizeSuccess = useCallback(
    (resultData) => {
      if (resultData?.access_token && resultData?.user) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('fylexx_guest_id');
        }
        setSession(resultData.access_token, resultData.user);
      }
      if (resultData?.order) {
        prependRawOrder(resultData.order);
      }
      if (resultData?.user?.id) {
        refreshOrders(resultData.user.id);
      }
      clearCart();
      navigate.push('/thank-you');
    },
    [setSession, prependRawOrder, refreshOrders, clearCart, navigate],
  );

  // Core 1-Click Magic Checkout Launcher
  const handleOneClickCheckout = useCallback(async () => {
    if (isCheckingOut || items.length === 0) return;
    setCheckoutError('');
    setIsCheckingOut(true);
    setCheckoutStatusText('Opening 1-Click Checkout...');
    paymentHandledRef.current = false;

    try {
      const activeId = getEffectiveUserId();
      const validCoupon = !couponErrorMsg && appliedCoupon ? appliedCoupon : '';
      const initRes = await initiateMagicPaymentApi(activeId, validCoupon, useCredits, `fyl_${Date.now()}`);

      if (!initRes?.success || !initRes?.data) {
        throw new Error(initRes?.error || 'Unable to start 1-Click Checkout. Please try again.');
      }

      // 100% Free Coupon / Credit Order (₹0 payable)
      if (initRes.data.freeOrder || Number(initRes.data.amount) <= 0) {
        setIsCheckingOut(false);
        setCheckoutStatusText('');
        setShowFreeModal(true);
        return;
      }

      const sdkLoaded = await ensureRazorpayScript();
      if (!sdkLoaded || !window.Razorpay) {
        throw new Error('Payment gateway could not be loaded. Please check your internet connection.');
      }

      const rzpOrderId = initRes.data.id;
      const rzpKey = initRes.data.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const prefillData = initRes.data.prefill || {};

      const options = {
        key: rzpKey,
        order_id: rzpOrderId,
        amount: initRes.data.amount,
        currency: initRes.data.currency || 'INR',
        one_click_checkout: true,
        name: 'FYLEX Watches',
        description: 'Luxury Timepiece Purchase',
        image: '/fylex_logo.png',
        prefill: {
          name: user?.name || prefillData.name || '',
          email: user?.email || prefillData.email || '',
          contact: user?.mobile || prefillData.contact || '',
        },
        theme: { color: '#000000' },
        handler: async (response) => {
          paymentHandledRef.current = true;
          setCheckoutStatusText('Confirming your timepiece order...');
          try {
            const completeRes = await completeMagicPaymentApi({
              razorpayOrderId: response.razorpay_order_id || rzpOrderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              userId: activeId,
            });

            if (completeRes?.success && completeRes?.data?.completed) {
              handleFinalizeSuccess(completeRes.data);
            } else {
              setCheckoutError(completeRes?.error || 'Payment verification failed. If debited, your order will auto-confirm shortly.');
              setIsCheckingOut(false);
              setCheckoutStatusText('');
            }
          } catch (err) {
            setCheckoutError(err?.message || 'Error finalizing your order.');
            setIsCheckingOut(false);
            setCheckoutStatusText('');
          }
        },
        modal: {
          ondismiss: async () => {
            if (paymentHandledRef.current) return;
            // Silently check if customer completed a Magic COD order (which dismisses modal after COD confirmation)
            setCheckoutStatusText('Verifying order status...');
            try {
              await new Promise((r) => setTimeout(r, 450));
              const checkRes = await checkMagicOrderApi(rzpOrderId, activeId);
              if (checkRes?.success && checkRes?.data?.completed && checkRes?.data?.order) {
                paymentHandledRef.current = true;
                handleFinalizeSuccess(checkRes.data);
                return;
              }
            } catch {
              // User simply closed modal without completing payment
            }
            setIsCheckingOut(false);
            setCheckoutStatusText('');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on?.('payment.failed', (failResp) => {
        const desc = failResp?.error?.description || 'Payment was declined or cancelled. Please try again.';
        setCheckoutError(desc);
      });
      rzp.open();
    } catch (err) {
      setCheckoutError(err?.message || 'Unable to launch checkout.');
      setIsCheckingOut(false);
      setCheckoutStatusText('');
    }
  }, [
    isCheckingOut,
    items.length,
    getEffectiveUserId,
    couponErrorMsg,
    appliedCoupon,
    useCredits,
    user,
    handleFinalizeSuccess,
  ]);

  // Auto-open Magic Checkout if redirected from legacy /checkout?autocheckout=1
  useEffect(() => {
    const shouldAuto = searchParams?.get('autocheckout') === '1';
    if (shouldAuto && !autoTriggeredRef.current && items.length > 0 && !isCalculating) {
      autoTriggeredRef.current = true;
      handleOneClickCheckout();
    }
  }, [searchParams, items.length, isCalculating, handleOneClickCheckout]);

  const handleFreePinChange = async (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setFreeForm((p) => ({ ...p, pincode: clean }));
    if (clean.length === 6) {
      setIsPinFetching(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
        const data = await res.json();
        if (data?.[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setFreeForm((p) => ({
            ...p,
            city: po.District || po.Block || p.city,
            state: po.State || p.state,
          }));
        }
      } catch {
        // Ignore lookup network error
      } finally {
        setIsPinFetching(false);
      }
    }
  };

  const handleCompleteFreeOrder = async (e) => {
    e.preventDefault();
    setFreeFormError('');
    const cleanMob = freeForm.mobile.replace(/\D/g, '').slice(-10);
    if (!freeForm.name.trim()) return setFreeFormError('Please enter your full name.');
    if (cleanMob.length !== 10) return setFreeFormError('Please enter a valid 10-digit mobile number.');
    if (freeForm.pincode.length !== 6) return setFreeFormError('Please enter a valid 6-digit PIN code.');
    if (!freeForm.address.trim()) return setFreeFormError('Please enter your delivery address.');

    setIsCheckingOut(true);
    try {
      const res = await completeFreeMagicOrderApi({
        userId: getEffectiveUserId(),
        couponCode: appliedCoupon,
        useCredits,
        name: freeForm.name.trim(),
        mobile: cleanMob,
        email: freeForm.email.trim() || undefined,
        pincode: freeForm.pincode,
        city: freeForm.city.trim() || 'India',
        state: freeForm.state.trim() || 'India',
        address: freeForm.address.trim(),
      });

      if (res?.success && res?.data?.completed) {
        setShowFreeModal(false);
        handleFinalizeSuccess(res.data);
      } else {
        setFreeFormError(res?.error || 'Could not complete order. Please verify your details.');
        setIsCheckingOut(false);
      }
    } catch (err) {
      setFreeFormError(err?.message || 'Error completing free order.');
      setIsCheckingOut(false);
    }
  };

  const handleQty = (id, delta) => updateQty(id, delta);
  const handleRemove = (id) => removeFromCart(id);

  const handleMoveToWishlist = async (item) => {
    await toggleWishlist({
      variantId: item.variantId,
      productId: item.productId,
    });
    removeFromCart(item.id);
  };

  const isCouponValidAndApplied = Boolean(
    appliedCoupon &&
      appliedCoupon === couponInput.trim() &&
      !couponErrorMsg &&
      (serverTotals.couponDiscount || serverTotals.discount) > 0,
  );

  const subtotal = serverTotals.subtotal || cartTotals.subtotal || itemsFallbackSubtotal;
  const total = serverTotals.total ?? cartTotals.grandTotal ?? subtotal;

  return (
    <div className="cart-page">
      {/* Hero */}
      <div
        className="cart-hero"
        style={{
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        <h1 className="cart-hero-title">Shopping Cart</h1>
      </div>

      <div className={`cart-layout ${items.length === 0 ? 'empty' : ''}`}>
        {/* Items */}
        <div className="cart-items-col">
          {items.length === 0 ? (
            <div className="cart-empty">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" stroke="#ffffff" strokeWidth="1.5" opacity="0.2" />
                <path d="M20 22h24l-3 18H23L20 22z" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                <circle cx="26" cy="46" r="2" fill="#ffffff" opacity="0.4" />
                <circle cx="38" cy="46" r="2" fill="#ffffff" opacity="0.4" />
              </svg>
              <p>Your cart is empty</p>
              <Link href="/products" className="cart-empty-cta">
                Explore Watches
              </Link>
            </div>
          ) : (
            items.map((item, i) => (
              <CartItemRow
                key={item.id}
                item={item}
                index={i}
                onQtyChange={handleQty}
                onRemove={handleRemove}
                onMoveToWishlist={handleMoveToWishlist}
                isProcessing={processingItems.has(item.id)}
              />
            ))
          )}
        </div>

        {/* Summary + Coupon + 1-Click Magic Checkout */}
        {items.length > 0 && (
          <div ref={summaryRef} className="cart-summary-col">
            <div className="cart-summary-card">
              <div className="cart-summary-title">Order Summary</div>

              {/* ✨ FYLEX EARLY BIRD / LOYALTY CREDITS */}
              {(serverTotals.availableCredits > 0 || serverTotals.appliedCredits > 0) && (
                <div className="cart-credits-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="cart-credits-icon">✨</div>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#ffffff' }}>FYLEX Credits</div>
                      <div style={{ fontSize: '11px', color: '#d4af37', marginTop: '2px' }}>
                        {useCredits
                          ? `₹${Math.round(serverTotals.appliedCredits || serverTotals.creditDiscount || 500)} Auto-Deducted`
                          : `₹${Math.round(serverTotals.availableCredits)} Credits Available`}
                      </div>
                    </div>
                  </div>
                  <label className="cart-credits-toggle">
                    <input
                      type="checkbox"
                      checked={useCredits}
                      onChange={(e) => setUseCredits(e.target.checked)}
                    />
                    <span>Use</span>
                  </label>
                </div>
              )}

              {/* 🏷️ PROMO CODE / GIFT CARD BAR */}
              <div className="cart-coupon-wrap">
                <div className={`cart-coupon-bar ${isCouponValidAndApplied ? 'is-applied' : ''}`}>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setCouponInput(val);
                      if (val.trim() === '') {
                        setAppliedCoupon('');
                        setCouponErrorMsg('');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!isCouponValidAndApplied && couponInput.trim()) {
                          setAppliedCoupon(couponInput.trim());
                        }
                      }
                    }}
                    placeholder="PROMO CODE / GIFT CARD"
                    className="cart-coupon-input"
                  />
                  <button
                    type="button"
                    className={`cart-coupon-btn ${isCouponValidAndApplied ? 'remove' : 'apply'}`}
                    disabled={isCalculating || (!appliedCoupon && !couponInput.trim())}
                    onClick={() => {
                      if (isCouponValidAndApplied) {
                        setCouponInput('');
                        setAppliedCoupon('');
                        setCouponErrorMsg('');
                      } else if (couponInput.trim()) {
                        setAppliedCoupon(couponInput.trim());
                      }
                    }}
                  >
                    {isCalculating ? '...' : isCouponValidAndApplied ? 'Remove' : 'Apply'}
                  </button>
                </div>

                {couponErrorMsg && <div className="cart-coupon-error">{couponErrorMsg}</div>}

                {isCouponValidAndApplied && (
                  <div className="cart-coupon-applied-card">
                    <div>
                      <span className="cart-coupon-pill">{appliedCoupon}</span>
                      <span className="cart-coupon-saved">
                        SAVED ₹{Math.round(serverTotals.couponDiscount || serverTotals.discount).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {serverTotals.offerDescription && (
                      <div className="cart-coupon-desc">{serverTotals.offerDescription}</div>
                    )}
                  </div>
                )}
              </div>

              <div className="cart-summary-line">
                <span>Subtotal</span>
                <span>₹{Math.round(subtotal).toLocaleString('en-IN')}</span>
              </div>

              {serverTotals.couponDiscount > 0 && !couponErrorMsg && (
                <div className="cart-summary-line discount-line">
                  <span>Promo Discount</span>
                  <span>−₹{Math.round(serverTotals.couponDiscount).toLocaleString('en-IN')}</span>
                </div>
              )}

              {serverTotals.creditDiscount > 0 && (
                <div className="cart-summary-line credits-line">
                  <span>✨ FYLEX Credits</span>
                  <span>−₹{Math.round(serverTotals.creditDiscount).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="cart-summary-line">
                <span>Shipping</span>
                <span className="cart-free-tag">Free</span>
              </div>

              <div className="cart-summary-divider" />

              <div className="cart-summary-total">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>Total</span>
                  <span style={{ fontSize: '10px', fontWeight: '400', color: '#94a3b8' }}>
                    Incl. all taxes • Free Insured Delivery
                  </span>
                </div>
                <span>₹{Math.round(total).toLocaleString('en-IN')}</span>
              </div>

              {checkoutError && <div className="cart-checkout-error">{checkoutError}</div>}

              <button
                className="cart-checkout-btn"
                onClick={handleOneClickCheckout}
                disabled={isCheckingOut || isCalculating}
              >
                {isCheckingOut ? (
                  <>
                    <div className="cart-btn-spinner" />
                    <span>{checkoutStatusText || 'Launching 1-Click Checkout...'}</span>
                  </>
                ) : (
                  <>
                    <span>{total <= 0 ? 'Claim Complimentary Order ⚡' : 'Proceed to 1-Click Checkout ⚡'}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>

              <div className="cart-magic-hint">
                ⚡ Auto-fills saved address via mobile number • UPI, Cards, Netbanking &amp; COD
              </div>

              <Link href="/products" className="cart-continue-link">
                ← Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 100% Free Coupon Order Modal (Only triggered when payable Total === ₹0) */}
      {showFreeModal && (
        <div className="cart-free-modal-backdrop" onClick={() => !isCheckingOut && setShowFreeModal(false)}>
          <div className="cart-free-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-free-modal-header">
              <h3>Complimentary Order Delivery</h3>
              <button
                type="button"
                onClick={() => setShowFreeModal(false)}
                className="cart-free-close"
                disabled={isCheckingOut}
              >
                ✕
              </button>
            </div>
            <p className="cart-free-sub">
              Your promo code unlocked a ₹0 total. Enter where we should ship your timepiece:
            </p>
            <form onSubmit={handleCompleteFreeOrder} className="cart-free-form">
              <input
                type="text"
                placeholder="Full Name *"
                value={freeForm.name}
                onChange={(e) => setFreeForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <input
                type="tel"
                placeholder="10-Digit Mobile Number (for WhatsApp tracking) *"
                value={freeForm.mobile}
                maxLength={10}
                onChange={(e) => setFreeForm((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                required
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="6-Digit PIN Code *"
                  value={freeForm.pincode}
                  maxLength={6}
                  onChange={(e) => handleFreePinChange(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder={isPinFetching ? 'Fetching city...' : 'City *'}
                  value={freeForm.city}
                  onChange={(e) => setFreeForm((p) => ({ ...p, city: e.target.value }))}
                  required
                />
              </div>
              <input
                type="text"
                placeholder="House / Flat No., Street, Area *"
                value={freeForm.address}
                onChange={(e) => setFreeForm((p) => ({ ...p, address: e.target.value }))}
                required
              />
              {freeFormError && <div className="cart-coupon-error">{freeFormError}</div>}
              <button type="submit" className="cart-checkout-btn" disabled={isCheckingOut}>
                <span>{isCheckingOut ? 'Placing Order...' : 'Place Free Order Now →'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .cart-page {
          min-height: 100vh;
          padding: calc(var(--header-h, 70px) + 40px) 24px 80px;
          position: relative;
          overflow: hidden;
          background: #000000;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
        }

        .cart-hero {
          position: relative; z-index: 1;
          text-align: center;
          margin-bottom: 52px;
        }
        .cart-hero-title {
          font-size: 2rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 10px;
          letter-spacing: -0.02em;
        }

        .cart-layout {
          position: relative; z-index: 1;
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 390px;
          gap: 32px;
          align-items: start;
        }
        .cart-layout.empty {
          grid-template-columns: 1fr;
          max-width: 600px;
        }
        @media(max-width: 860px) {
          .cart-layout { grid-template-columns: 1fr; }
        }

        .cart-item-row {
          display: flex;
          align-items: center;
          gap: 20px;
          background: #111111;
          border: 1px solid #333333;
          padding: 20px 24px;
          margin-bottom: 16px;
          transition: transform 0.3s;
        }
        .cart-item-row:hover {
          transform: translateY(-2px);
        }
        .cart-item-top-link {
          text-decoration: none;
          color: inherit;
          display: block;
          flex: 1;
        }
        .cart-item-top {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .cart-watch-visual {
          width: 80px; height: 96px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          background: transparent !important;
        }
        .cart-item-details { flex: 1; min-width: 0; }
        .cart-item-name {
          font-size: 1.2rem; color: #ffffff;
          font-weight: 700; margin-bottom: 4px;
        }
        .cart-item-variant {
          font-size: 0.9rem; color: #cccccc;
          margin-bottom: 10px;
        }
        .cart-item-price {
          font-size: 1rem; font-weight: 600;
          color: #ffffff;
        }
        @media (min-width: 861px) {
          .cart-item-actions {
            display: flex;
            align-items: center;
            gap: 24px;
            margin-left: auto;
            flex-shrink: 0;
          }
        }

        .cart-qty-block {
          display: flex; align-items: center;
          gap: 10px;
        }
        .cart-qty-btn {
          width: 32px; height: 32px;
          border: none;
          background: transparent; color: #ffffff;
          font-size: 18px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.2s;
        }
        .cart-qty-btn:hover { transform: scale(1.1); }
        .cart-qty-val {
          font-size: 15px; font-weight: 600;
          color: #ffffff; width: 24px; text-align: center;
        }
        .cart-row-secondary-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cart-wishlist-btn, .cart-remove-btn {
          cursor: pointer; border: none; background: transparent;
          padding: 8px;
          display: flex; align-items: center; justify-content: center;
          color: #ffffff;
          transition: all 0.3s ease;
        }
        .cart-wishlist-btn:hover, .cart-remove-btn:hover { transform: scale(1.1); }

        /* Empty */
        .cart-empty {
          text-align: center; padding: 80px 24px;
          color: #ffffff;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }
        .cart-empty p { font-size: 16px; }
        .cart-empty-cta {
          display: inline-block;
          padding: 10px 20px;
          background: #ffffff;
          color: #000000; border-radius: 50px;
          text-decoration: none; font-size: 10px;
          letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700;
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
          border: 1px solid #ffffff;
        }
        .cart-empty-cta:hover {
          background: #000000 !important;
          color: #ffffff !important;
        }

        /* Summary Card */
        .cart-summary-card {
          background: #111111;
          border: 1px solid #333333;
          padding: 28px 24px;
        }
        .cart-summary-title {
          font-size: 1.4rem; font-weight: 700; color: #ffffff;
          margin-bottom: 20px;
        }

        /* Credits Card */
        .cart-credits-box {
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.14) 0%, rgba(184, 134, 11, 0.05) 100%);
          border: 1px solid rgba(212, 175, 55, 0.35);
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .cart-credits-icon {
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(212, 175, 55, 0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
        }
        .cart-credits-toggle {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: #ffffff; cursor: pointer;
        }
        .cart-credits-toggle input {
          accent-color: #d4af37; width: 15px; height: 15px; cursor: pointer;
        }

        /* Promo Code Box */
        .cart-coupon-wrap {
          margin-bottom: 20px;
        }
        .cart-coupon-bar {
          display: flex;
          align-items: center;
          background: #080808;
          border: 1px solid #2e2e2e;
          border-radius: 8px;
          padding: 4px 4px 4px 12px;
          transition: border-color 0.25s;
        }
        .cart-coupon-bar:focus-within {
          border-color: #666666;
        }
        .cart-coupon-bar.is-applied {
          border-color: rgba(52, 211, 153, 0.5);
        }
        .cart-coupon-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          min-width: 0;
        }
        .cart-coupon-input::placeholder {
          color: #666666;
          font-weight: 500;
        }
        .cart-coupon-btn {
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .cart-coupon-btn.apply {
          background: #ffffff;
          color: #000000;
        }
        .cart-coupon-btn.apply:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .cart-coupon-btn.remove {
          background: rgba(239, 68, 68, 0.16);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .cart-coupon-error {
          margin-top: 8px;
          padding: 8px 10px;
          border-radius: 6px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          font-size: 11.5px;
        }
        .cart-coupon-applied-card {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .cart-coupon-pill {
          font-size: 11px;
          font-weight: 800;
          color: #34d399;
          letter-spacing: 0.08em;
          margin-right: 8px;
        }
        .cart-coupon-saved {
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
          background: rgba(16, 185, 129, 0.25);
          padding: 2px 7px;
          border-radius: 99px;
        }
        .cart-coupon-desc {
          font-size: 11px;
          color: #a7f3d0;
          margin-top: 5px;
        }

        .cart-summary-line {
          display: flex; justify-content: space-between;
          font-size: 13px; color: #e5e5e5;
          margin-bottom: 12px;
        }
        .cart-summary-line.discount-line {
          color: #34d399;
          font-weight: 600;
        }
        .cart-summary-line.credits-line {
          color: #d4af37;
          font-weight: 600;
        }
        .cart-free-tag {
          color: #34d399; font-weight: 700; font-size: 11px;
          border: 1px solid rgba(52, 211, 153, 0.4);
          background: rgba(52, 211, 153, 0.1);
          padding: 2px 9px; border-radius: 20px;
        }
        .cart-summary-divider {
          height: 1px;
          background: #333333;
          margin: 18px 0;
        }
        .cart-summary-total {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 19px; font-weight: 700;
          color: #ffffff; margin-bottom: 22px;
        }

        .cart-checkout-error {
          margin-bottom: 14px;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
          font-size: 12px;
          line-height: 1.4;
        }

        .cart-checkout-btn {
          width: 100%;
          min-height: 48px;
          padding: 12px 18px;
          background: #ffffff;
          color: #000000; border: 1px solid #ffffff; border-radius: 999px;
          font-size: 11px; letter-spacing: 0.13em;
          text-transform: uppercase; font-weight: 800;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: all 0.35s cubic-bezier(0.23, 1, 0.32, 1);
          margin-bottom: 12px;
          box-shadow: 0 6px 20px rgba(255, 255, 255, 0.14);
        }
        .cart-checkout-btn:hover:not(:disabled) {
          background: #000000 !important;
          color: #ffffff !important;
          border-color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(255, 255, 255, 0.22);
        }
        .cart-checkout-btn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .cart-magic-hint {
          text-align: center;
          font-size: 11px;
          color: #888888;
          margin-bottom: 16px;
          line-height: 1.4;
        }

        .cart-continue-link {
          display: block; text-align: center;
          font-size: 12px; color: #ffffff;
          letter-spacing: 0.04em;
          transition: color 0.2s;
          text-decoration: none;
        }
        .cart-continue-link:hover { color: #cccccc; }

        /* Free Order Modal */
        .cart-free-modal-backdrop {
          position: fixed; inset: 0; z-index: 4000;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .cart-free-modal {
          width: 100%; max-width: 440px;
          background: #111114;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 18px;
          padding: 28px 24px;
        }
        .cart-free-modal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 8px;
        }
        .cart-free-modal-header h3 {
          margin: 0; font-size: 1.2rem; font-weight: 700; color: #fff;
        }
        .cart-free-close {
          background: none; border: none; color: #999; font-size: 18px; cursor: pointer;
        }
        .cart-free-sub {
          font-size: 12.5px; color: #a1a1aa; margin: 0 0 18px; line-height: 1.5;
        }
        .cart-free-form {
          display: flex; flex-direction: column; gap: 12px;
        }
        .cart-free-form input {
          width: 100%; box-sizing: border-box;
          padding: 12px 14px;
          background: #08080a;
          border: 1px solid #2e2e34;
          border-radius: 10px;
          color: #ffffff;
          font-size: 13px;
          outline: none;
        }
        .cart-free-form input:focus {
          border-color: #ffffff;
        }

        /* Mobile Layout */
        @media (max-width: 600px) {
          .cart-page {
            padding: calc(var(--header-h, 70px) + 20px) 16px 80px;
          }
          .cart-hero-title { font-size: 22px; }
          .cart-item-row {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            padding: 16px;
          }
          .cart-item-top {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .cart-watch-visual { width: 65px; height: 80px; }
          .cart-item-name { font-size: 15px; }
          .cart-item-variant { font-size: 11px; }
          .cart-item-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 12px;
            border-top: 1px solid rgba(255,255,255,0.05);
          }
          .cart-summary-card { padding: 24px 18px; }
        }

        .cart-spinner-small, .cart-btn-spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(128, 128, 128, 0.3);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: cart-spin 0.6s linear infinite;
        }
        @keyframes cart-spin { to { transform: rotate(360deg); } }

        .processing {
          opacity: 0.5;
          pointer-events: none;
          filter: grayscale(0.5);
        }
      `}</style>
    </div>
  );
}

export default function Cart() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#000000' }} />}>
      <CartContent />
    </Suspense>
  );
}
