"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { fetchProducts, fetchVariant } from '../../../lib/api';
import cmsService from '@/services/cms.service';
import { getFileUrl, resolveProductImage, getDisplayData, cleanConfigName } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

export default function PreConfigure() {
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [founderVariants, setFounderVariants] = useState([]);
  const [curatedVariants, setCuratedVariants] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  // Build the configured outcome page URL with all variant attributes
  const getConfiguredUrl = (variant, product) => {
    const watchId = variant.productId || variant.product?.id || product?.id || '';
    const params = new URLSearchParams();
    if (watchId) params.set('watch', watchId.toString());
    if (variant.id) params.set('variant', variant.id.toString());

    const vAttrs = variant.variantAttributes || [];
    vAttrs.forEach(va => {
      const rawName = (va.attributeValue?.attribute?.name || '').toLowerCase().trim();
      let normKey = rawName;
      if (rawName.includes('dial')) normKey = 'dial';
      else if (rawName.includes('belt') || rawName.includes('strap')) normKey = 'belt';
      else if (rawName.includes('case') || rawName.includes('bracelet') || rawName.includes('model') || rawName.includes('color')) normKey = 'case';

      const valLabel = va.attributeValue?.label || va.attributeValue?.value || '';
      if (normKey && valLabel) {
        params.set(normKey, valLabel);
        if (rawName && rawName !== normKey) {
          params.set(rawName, valLabel);
        }
      }
    });

    return `/configured?${params.toString()}`;
  };

  const handleAddToCart = async (e, variant) => {
    e.preventDefault();
    e.stopPropagation();
    const vId = variant?.id || variant?.productId;
    if (!vId) return;
    setAddingId(vId);
    try {
      const res = await addToCart(vId.toString(), 1);
      if (res?.success !== false) {
        setAddedIds(prev => new Set(prev).add(vId));
        setTimeout(() => {
          setAddedIds(prev => {
            const next = new Set(prev);
            next.delete(vId);
            return next;
          });
        }, 2500);
      }
    } catch (err) {
      console.error('Failed to add pre-configured watch to cart:', err);
    } finally {
      setAddingId(null);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [prodRes, cmsRes] = await Promise.all([
          fetchProducts().catch(() => null),
          cmsService.getVideoSettings().catch(() => null)
        ]);

        const rawProducts = prodRes?.data || (Array.isArray(prodRes) ? prodRes : []);
        const settingList = cmsRes?.data || (Array.isArray(cmsRes) ? cmsRes : []);

        const settingMap = {};
        if (Array.isArray(settingList)) {
          settingList.forEach(s => {
            if (s.key) settingMap[s.key] = s.value;
          });
        }

        // 1. Fetch Founder's Pick variants (matching About page)
        const founderIdsStr = settingMap.founder_watch_ids || settingMap.founder_watch_id || '';
        let founders = [];
        if (founderIdsStr) {
          const ids = founderIdsStr.split(',').map(id => id.trim()).filter(Boolean);
          const results = await Promise.all(ids.map(id => fetchVariant(id).catch(() => null)));
          founders = results
            .filter(res => res && res.success !== false && (res.data || res.id))
            .map(res => {
              const v = res.data || res;
              return {
                ...v,
                isFounderPick: true,
                product: v.product || rawProducts.find(p => p.id === v.productId) || null
              };
            });
        }
        setFounderVariants(founders);

        // 2. Fetch Curated Pre-Configured variants from all watch lines
        const curated = [];
        const founderIdSet = new Set(founders.map(f => f.id?.toString()));

        rawProducts.forEach(p => {
          const pVars = p.variants || [];
          pVars.forEach(v => {
            if (founderIdSet.has(v.id?.toString())) return; // skip duplicates of founder picks

            // Include if flagged as sold config or if active with attributes
            const isSold = Boolean(v.isSoldConfiguration === true || v.isSoldConfiguration === 1 || v.isSoldConfiguration === 'true');
            const hasAttrs = (v.variantAttributes || []).length > 0;
            const inStock = Number(v.qty !== undefined ? v.qty : (v.stock !== undefined ? v.stock : 1)) > 0;

            if ((isSold || v.isPrimary || v.isDefault || hasAttrs) && inStock) {
              curated.push({
                ...v,
                isFounderPick: false,
                product: p
              });
            }
          });
        });
        setCuratedVariants(curated);

        // 3. Set categories / collection tabs
        const cats = ['All'];
        if (founders.length > 0) cats.push("Founder's Choice");
        const productNames = rawProducts.map(p => p.name).filter(Boolean);
        uniqueMerge(cats, productNames);
        setCategories(cats);
      } catch (err) {
        console.error('Failed to load pre-configured watches:', err);
      } finally {
        setLoading(false);
      }
    };

    const uniqueMerge = (target, additions) => {
      additions.forEach(item => {
        if (!target.includes(item)) target.push(item);
      });
    };

    loadAll();
  }, []);

  // Filtered watches
  const allWatches = useMemo(() => {
    return [...founderVariants, ...curatedVariants];
  }, [founderVariants, curatedVariants]);

  const displayedWatches = useMemo(() => {
    if (activeCategory === 'All') return allWatches;
    if (activeCategory === "Founder's Choice") return founderVariants;
    return allWatches.filter(w => {
      const pName = w.product?.name || '';
      return pName.toLowerCase().trim() === activeCategory.toLowerCase().trim();
    });
  }, [allWatches, founderVariants, activeCategory]);

  return (
    <div className="fylex-watches-root">
      <style>{`
        .fylex-watches-root {
          background: #000000;
          color: #ffffff;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .fw-hero-section {
          padding: calc(var(--header-h, 75px) + 50px) clamp(20px, 6vw, 80px) 40px;
          text-align: center;
          position: relative;
          background: radial-gradient(circle at 50% 20%, rgba(196, 163, 90, 0.08) 0%, rgba(0, 0, 0, 0) 70%);
        }

        .fw-eyebrow {
          font-size: 11px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #c4a35a;
          font-weight: 700;
          margin-bottom: 14px;
          display: block;
        }

        .fw-title {
          font-size: clamp(2.2rem, 5vw, 3.8rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 16px 0;
          color: #ffffff;
          line-height: 1.1;
        }

        .fw-subtitle {
          max-width: 640px;
          margin: 0 auto;
          font-size: clamp(0.95rem, 1.8vw, 1.1rem);
          line-height: 1.6;
          color: #999b9e;
          font-weight: 400;
        }

        /* ── FILTER TABS ── */
        .fw-tabs-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin: 40px auto 20px;
          padding: 0 20px;
          max-width: 900px;
        }

        .fw-tab-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #a1a1aa;
          padding: 10px 22px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .fw-tab-btn:hover {
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.08);
        }

        .fw-tab-btn.active {
          background: #ffffff;
          color: #000000;
          border-color: #ffffff;
          font-weight: 700;
        }

        /* ── WATCHES GRID ── */
        .fw-grid-container {
          max-width: 1360px;
          margin: 0 auto;
          padding: 20px clamp(20px, 4vw, 60px) 90px;
          width: 100%;
          box-sizing: border-box;
        }

        .fw-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
          gap: clamp(24px, 3vw, 36px);
        }

        .fw-card {
          background: #09090b;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), border-color 0.4s ease, box-shadow 0.4s ease;
          overflow: hidden;
        }

        .fw-card:hover {
          transform: translateY(-8px);
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6);
        }

        .fw-card-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          padding: 5px 12px;
          border-radius: 999px;
          margin-bottom: 20px;
          display: inline-block;
        }

        .badge-founder {
          background: rgba(196, 163, 90, 0.12);
          color: #c4a35a;
          border: 1px solid rgba(196, 163, 90, 0.3);
        }

        .badge-curated {
          background: rgba(255, 255, 255, 0.05);
          color: #a1a1aa;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .fw-img-wrap {
          width: 100%;
          height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .fw-watch-img {
          max-width: 90%;
          max-height: 240px;
          object-fit: contain;
          filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.6));
          transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .fw-card:hover .fw-watch-img {
          transform: scale(1.06);
        }

        .fw-watch-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 10px 0;
          line-height: 1.25;
        }

        .fw-attrs-wrap {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px;
          margin-bottom: 16px;
          min-height: 26px;
        }

        .fw-attr-pill {
          font-size: 10.5px;
          padding: 3px 9px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: #9ca3af;
          font-weight: 500;
        }

        .fw-price {
          font-size: 1.25rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 0.02em;
          margin-bottom: 24px;
        }

        .fw-actions-row {
          display: flex;
          gap: 10px;
          width: 100%;
          margin-top: auto;
        }

        .fw-btn-cart {
          flex: 1;
          padding: 13px 14px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid #ffffff;
          background: #ffffff;
          color: #000000;
          box-shadow: 0 4px 15px rgba(255, 255, 255, 0.15);
        }

        .fw-btn-cart:hover:not(:disabled) {
          background: #e5e5e5;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 255, 255, 0.25);
        }

        .fw-btn-cart.added {
          background: #008767;
          border-color: #008767;
          color: #ffffff;
        }

        .fw-btn-discover {
          flex: 1;
          padding: 13px 14px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: transparent;
          color: #ffffff;
          transition: all 0.3s ease;
        }

        .fw-btn-discover:hover {
          border-color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }

        /* ── CUSTOM BUILD CALLOUT ── */
        .fw-custom-callout {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 70px 24px;
          text-align: center;
          background: radial-gradient(circle at 50% 100%, rgba(255, 255, 255, 0.03) 0%, rgba(0, 0, 0, 0) 70%);
        }

        .fw-callout-box {
          max-width: 650px;
          margin: 0 auto;
        }

        .fw-callout-title {
          font-size: clamp(1.5rem, 3vw, 2.2rem);
          font-weight: 700;
          margin: 0 0 12px 0;
          color: #ffffff;
        }

        .fw-callout-desc {
          font-size: 0.95rem;
          color: #888888;
          line-height: 1.6;
          margin: 0 0 28px 0;
        }

        .fw-btn-build {
          display: inline-block;
          padding: 14px 34px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: #ffffff;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .fw-btn-build:hover {
          background: #ffffff;
          color: #000000;
          border-color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(255, 255, 255, 0.2);
        }

        @media (max-width: 768px) {
          .fw-hero-section {
            padding: calc(var(--header-h, 70px) + 25px) 20px 25px;
          }
          .fw-grid {
            grid-template-columns: 1fr;
          }
          .fw-card {
            padding: 26px 18px;
          }
          .fw-img-wrap {
            height: 220px;
          }
        }
      `}</style>

      <Header />

      <main style={{ flex: 1 }}>
        {/* ── HERO BANNER ── */}
        <section className="fw-hero-section">
          <span className="fw-eyebrow">Ready for Immediate Acquisition</span>
          <h1 className="fw-title">FYLEX Watches</h1>
          <p className="fw-subtitle">
            Masterfully configured timepieces curated by our founder and master watchmakers.
            Every case, dial, and bracelet balanced to absolute perfection.
          </p>

          {/* ── FILTER TABS ── */}
          {categories.length > 1 && (
            <div className="fw-tabs-bar">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`fw-tab-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── WATCHES GRID ── */}
        <section className="fw-grid-container">
          {loading ? (
            <div style={{ padding: '80px 20px', textAlign: 'center', color: '#888' }}>
              <div style={{ fontSize: '14px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Accessing Private Vault...
              </div>
            </div>
          ) : displayedWatches.length === 0 ? (
            <div style={{ padding: '80px 20px', textAlign: 'center', color: '#888' }}>
              <p style={{ fontSize: '16px', color: '#bbb', marginBottom: '16px' }}>No pre-configured watches found in this category.</p>
              <button 
                onClick={() => setActiveCategory('All')}
                className="fw-tab-btn active"
              >
                View All Timepieces
              </button>
            </div>
          ) : (
            <div className="fw-grid">
              {displayedWatches.map((watch) => {
                const vId = watch?.id || watch?.productId;
                const isAdding = addingId === vId;
                const isAdded = addedIds.has(vId);
                const p = watch.product || {};
                const display = getDisplayData(p, watch);

                const watchImg = resolveProductImage(p, watch) || getFileUrl(watch.image || watch.heroImage || (watch.variantImages?.[0]?.media?.fileName ? `/uploads/${watch.variantImages[0].media.fileName}` : '')) || '/assets/fylex-watch-v2/premium.png';
                
                const title = cleanConfigName(display.subtitle || watch.product?.name || watch.name || 'Fylex Timepiece', p);
                
                const priceFormatted = watch.formattedPrice || (watch.price ? `₹${Number(watch.price).toLocaleString('en-IN')}` : (p.formattedPrice || (p.basePrice ? `₹${Number(p.basePrice).toLocaleString('en-IN')}` : '₹5,999')));

                const attrList = (watch.variantAttributes || []).map(va => {
                  return va.attributeValue?.label || va.attributeValue?.value || '';
                }).filter(Boolean);

                const configuredUrl = getConfiguredUrl(watch, p);

                return (
                  <div key={watch.id || vId} className="fw-card">
                    <span className={`fw-card-badge ${watch.isFounderPick ? 'badge-founder' : 'badge-curated'}`}>
                      {watch.isFounderPick ? "The Founder's Pick" : "Curated Edition"}
                    </span>

                    <div className="fw-img-wrap">
                      <img 
                        src={watchImg} 
                        alt={title}
                        className="fw-watch-img"
                        onError={(e) => { e.currentTarget.src = '/assets/fylex-watch-v2/premium.png'; }}
                      />
                    </div>

                    <h3 className="fw-watch-title">{title}</h3>

                    <div className="fw-attrs-wrap">
                      {attrList.map((attr, idx) => (
                        <span key={idx} className="fw-attr-pill">{attr}</span>
                      ))}
                    </div>

                    <div className="fw-price">{priceFormatted}</div>

                    <div className="fw-actions-row">
                      <button
                        className={`fw-btn-cart ${isAdded ? 'added' : ''}`}
                        onClick={(e) => handleAddToCart(e, watch)}
                        disabled={isAdding}
                      >
                        {isAdding ? 'Adding...' : isAdded ? 'Added ✓' : 'Add to Cart'}
                      </button>

                      <Link href={configuredUrl} className="fw-btn-discover">
                        Discover
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── BESPOKE BUILD CALLOUT ── */}
        <section className="fw-custom-callout">
          <div className="fw-callout-box">
            <h2 className="fw-callout-title">Desire a Personal Touch?</h2>
            <p className="fw-callout-desc">
              Custom engineer every detail of your timepiece. Choose your own case finish, dial color, and strap combination in our interactive 3D configurator.
            </p>
            <Link href="/products" className="fw-btn-build">
              Build Your Watch →
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
