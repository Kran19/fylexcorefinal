"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, ArrowRight, Check, ShieldCheck, RefreshCw, ChevronLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import * as api from '@/services/adminApi';

const getFileUrl = (path) => {
  if (!path) return '/uploads/placeholder.png';
  if (path.startsWith('http')) return path;
  const clean = path.replace(/\\/g, '/');
  return clean.startsWith('/') ? `http://localhost:5000${clean}` : `http://localhost:5000/${clean}`;
};

function ConfiguredPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const watchId = searchParams.get('watch');

  const [product, setProduct] = useState(null);
  const [activeVariant, setActiveVariant] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState({});

  useEffect(() => {
    if (!watchId) {
      setLoading(false);
      return;
    }

    const loadConfiguredProduct = async () => {
      setLoading(true);
      try {
        const { data: p, success } = await api.getProduct(watchId);
        if (success && p) {
          setProduct(p);

          // Extract URL params for customized attributes
          const currentSelections = {};
          searchParams.forEach((val, key) => {
            if (key !== 'watch') currentSelections[key.toLowerCase()] = val;
          });
          setSelections(currentSelections);

          // Find exact or closest matching variant
          const variants = p.variants || [];
          const match = variants.find(v => {
            const vAttrs = v.variantAttributes || [];
            if (vAttrs.length === 0) return false;
            return Object.entries(currentSelections).every(([selKey, selVal]) => {
              return vAttrs.some(va => {
                const attrName = va.attributeValue?.attribute?.name?.toLowerCase();
                const label = (va.attributeValue?.label || '').toLowerCase();
                return attrName === selKey && label === selVal.toLowerCase();
              });
            });
          }) || variants[0];

          setActiveVariant(match);

          // Enforce ONLY 1 Primary Image
          const mainMedia = match?.variantImages?.find(vi => vi.type === 'MAIN')?.media || match?.variantImages?.[0]?.media;
          const mainImgUrl = getFileUrl(mainMedia?.path || mainMedia?.url || mainMedia?.fileName) || p.heroImage;
          setPreviewImage(mainImgUrl);
        }
      } catch (err) {
        console.error('Error loading configured product:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConfiguredProduct();
  }, [watchId, searchParams]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={28} style={{ color: '#c4a35a', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#a1a1aa' }}>Loading Assembled Timepiece...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Timepiece Configuration Not Found</h2>
          <Link href="/products" style={{ color: '#c4a35a', textDecoration: 'underline', fontSize: '14px' }}>Browse Watch Collection</Link>
        </div>
      </div>
    );
  }

  const formattedPrice = activeVariant?.sellingPrice
    ? `₹ ${Number(activeVariant.sellingPrice).toLocaleString('en-IN')}`
    : (product.price ? `₹ ${Number(product.price).toLocaleString('en-IN')}` : '₹ 25,000');

  const specsList = product.specifications || [];

  return (
    <div style={{ background: '#09090b', color: '#ffffff', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <Header />

      <main style={{ paddingTop: '100px', paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
        
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: '32px' }}>
          <Link href={`/configure?watch=${watchId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a1a1aa', fontSize: '13px', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }}>
            <ChevronLeft size={16} /> Edit Configuration
          </Link>
        </div>

        {/* ── TOP HERO SHOWCASE: 1 SINGLE PRIMARY IMAGE + DETAILS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '60px', alignItems: 'center', marginBottom: '80px' }}>
          
          {/* 1 SINGLE PRIMARY IMAGE CONTAINER */}
          <div style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0) 70%)', padding: '40px', borderRadius: '24px', border: '1px solid #27272a', display: 'flex', alignItems: 'center', justify: 'center', minHeight: '440px', position: 'relative' }}>
            <span style={{ position: 'absolute', top: '20px', left: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '6px 14px', borderRadius: '999px', border: '1px solid rgba(34,197,94,0.2)' }}>
              ✓ ASSEMBLED TIMEPIECE
            </span>
            <img
              src={previewImage}
              alt={product.title}
              style={{ maxHeight: '380px', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.7))' }}
            />
          </div>

          {/* ASSEMBLED DETAILS & ACTIONS */}
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#c4a35a', display: 'block', marginBottom: '8px' }}>
              FYLEX CUSTOM SPECIFICATION
            </span>
            <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', marginBottom: '12px', lineHeight: 1.1 }}>
              {product.title}
            </h1>
            <p style={{ color: '#a1a1aa', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
              {product.subtitle || product.shortDesc || 'Customized luxury timepiece built to order with precision components.'}
            </p>

            {/* SELECTIONS SUMMARY PILLS */}
            <div style={{ background: '#18181b', padding: '20px', borderRadius: '16px', border: '1px solid #27272a', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#71717a' }}>
                Your Configured Specifications
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {Object.entries(selections).map(([key, val]) => (
                  <div key={key} style={{ background: '#27272a', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#a1a1aa', textTransform: 'capitalize' }}>{key}:</span>
                    <span style={{ color: '#008767' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PRICE & CART BUTTONS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#a1a1aa', display: 'block', fontWeight: 600 }}>Total Price</span>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#c4a35a' }}>{formattedPrice}</span>
              </div>

              <div style={{ display: 'flex', gap: '12px', flex: '1 1 240px' }}>
                <button
                  onClick={() => router.push(`/configure?watch=${watchId}`)}
                  style={{
                    flex: 1,
                    padding: '16px 24px',
                    borderRadius: '999px',
                    background: '#18181b',
                    border: '1px solid #3f3f46',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Modify
                </button>
                <button
                  onClick={() => alert(`Added ${product.title} configuration to cart!`)}
                  style={{
                    flex: 2,
                    padding: '16px 24px',
                    borderRadius: '999px',
                    background: '#c4a35a',
                    border: 'none',
                    color: '#000000',
                    fontSize: '13px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <ShoppingBag size={18} /> Add To Order
                </button>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px', color: '#71717a', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={16} color="#c4a35a" /> 2-Year International Warranty</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={16} color="#22c55e" /> Assembled on Order</span>
            </div>

          </div>

        </div>

        {/* ── TECHNICAL SPECIFICATIONS TABLE ── */}
        <section style={{ background: '#18181b', borderRadius: '24px', border: '1px solid #27272a', padding: '40px', marginTop: '60px' }}>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginBottom: '24px', borderBottom: '1px solid #27272a', paddingBottom: '16px' }}>
            Timepiece Technical Specifications
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ padding: '16px', background: '#09090b', borderRadius: '12px', border: '1px solid #27272a' }}>
              <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Model</span>
              <span style={{ fontSize: '14px', color: '#ffffff', fontWeight: 700 }}>{product.title}</span>
            </div>
            <div style={{ padding: '16px', background: '#09090b', borderRadius: '12px', border: '1px solid #27272a' }}>
              <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>SKU Code</span>
              <span style={{ fontSize: '14px', color: '#c4a35a', fontWeight: 700, fontFamily: 'monospace' }}>{activeVariant?.sku || product.productCode || 'FY-CFG-001'}</span>
            </div>
            <div style={{ padding: '16px', background: '#09090b', borderRadius: '12px', border: '1px solid #27272a' }}>
              <span style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Assembly Status</span>
              <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 700 }}>In Stock (Custom Built)</span>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

export default function ConfiguredPage() {
  return (
    <Suspense fallback={<div style={{ background: '#09090b', height: '100vh' }}></div>}>
      <ConfiguredPageContent />
    </Suspense>
  );
}
