"use client";
import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectFade, EffectCoverflow, Navigation, Pagination, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import 'swiper/css/effect-coverflow';
import 'swiper/css/free-mode';
import { fetchProducts, fetchBoxes } from '../../../lib/api';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useDesignSystem } from '@/context/DesignSystemContext';
import { getFileUrl, resolveProductImage, getDisplayData, getPageTheme } from '@/lib/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

function ConfiguredContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { productOverrides } = useDesignSystem();
  const watchId = searchParams.get('watch');
  const mode = searchParams.get('mode');
  const isGeneralMode = mode === 'all';

  const [productsData, setProductsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrollDir, setScrollDir] = useState('up');
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeModalData, setActiveModalData] = useState(null);
  const [activeSpecGroup, setActiveSpecGroup] = useState(null);
  const [activeSection, setActiveSection] = useState('hero');
  const [isAdded, setIsAdded] = useState(false);
  const lastScrollY = useRef(0);
  const heroRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodRes, boxesRes] = await Promise.all([
          fetchProducts(),
          fetchBoxes().catch(() => null)
        ]);
        if (prodRes) {
          const actualData = prodRes.data || (Array.isArray(prodRes) ? prodRes : []);
          const rawBoxes = boxesRes?.data || [];
          const universalBoxes = rawBoxes.filter(b => b.isActive).map(b => {
            const bxImg = b.image?.url || b.image?.filePath || b.image?.path || b.image?.fileName || (typeof b.image === 'string' ? b.image : null);
            return {
              id: b.id,
              name: b.name,
              price: b.price || 0,
              stock: b.stock || 0,
              image: bxImg ? getFileUrl(bxImg) : null
            };
          });

          const hexToRgb = (hex) => {
            if (!hex) return '196, 163, 90';
            const cleanHex = hex.replace('#', '');
            const r = parseInt(cleanHex.substring(0, 2), 16);
            const g = parseInt(cleanHex.substring(2, 4), 16);
            const b = parseInt(cleanHex.substring(4, 6), 16);
            return `${r}, ${g}, ${b}`;
          };

          const mapped = actualData.map(p => {
            const display = getDisplayData(p);
            const pageTheme = getPageTheme(p, 'discover');
            return {
              ...p,
              ...display,
              heroBgImage: display.heroBgImage,
              id: p.id.toString(),
              variantId: display.variantId,
              heroImage: display.image,
              title: p.name || display.name || 'Atlas Legacy',
              name: p.name || display.name || 'Atlas Legacy',
              subtitle: display.subtitle || 'Luxury Collection',
              description: p.shortDescription || p.description || '',
              longDesc: p.description || p.shortDescription || 'Experience the pinnacle of watchmaking with our masterfully crafted timepiece.',
              theme: p.theme || 'champagne',
              accentColor: pageTheme.accentColor,
              accentRgb: hexToRgb(pageTheme.accentColor),
              mistColor: p.mistColor || '',
              mistRgb: hexToRgb(p.mistColor || pageTheme.accentColor),
              textColor: pageTheme.textColor,
              bgColor: pageTheme.bg,
              gradient: pageTheme.gradient,
              videoUrl: p.videoUrl || null,
              heritageText: p.heritageText || 'Founded on the principles of precision and timeless elegance, Fylex has been at the forefront of horological innovation for generations.',
              sold: (p.soldCount !== undefined && p.soldCount !== null) ? p.soldCount : Math.min((p.id % 100) + 120, p.qty || p.stockCount || 500),
              totalStock: p.qty || p.stockCount || 500,
              specs: (() => {
                const specsObj = {};
                if (Array.isArray(p.specifications) && p.specifications.length > 0) {
                  p.specifications.forEach(s => {
                    const gName = s.specification?.groups?.[0]?.group?.name || s.groupName || 'Technical Specifications';
                    const label = s.specification?.name || s.name || s.label || s.key || 'Feature';
                    const value = s.value || s.val || '-';
                    if (!specsObj[gName]) specsObj[gName] = [];
                    specsObj[gName].push({ label, value });
                  });
                }
                if (Object.keys(specsObj).length === 0) {
                  return {
                    "Model Architecture & Case": [
                      { label: "Model Case", value: `${p.name || 'Fylex Timepiece'}, 40 mm, Oystersteel & Precious Gold` },
                      { label: "Bezel", value: "Fluted, 18 ct Gold / Diamond-set" },
                      { label: "Water Resistance", value: "Waterproof to 100 metres / 330 feet" }
                    ],
                    "Movement & Precision": [
                      { label: "Movement", value: "Perpetual, mechanical, self-winding" },
                      { label: "Calibre", value: "Fylex 3255 Manufacture Precision" },
                      { label: "Precision", value: "-2/+2 sec/day, after casing" },
                      { label: "Power Reserve", value: "Approximately 70 hours" }
                    ],
                    "Bracelet & Clasp": [
                      { label: "Bracelet", value: "President, semi-circular three-piece links" },
                      { label: "Clasp", value: "Concealed folding Crownclasp" }
                    ]
                  };
                }
                return specsObj;
              })()
            };
          });
          setProductsData(mapped);
        }
      } catch (err) {
        console.error("Configured loadData error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 60);

      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setScrollDir('down');
      } else {
        setScrollDir('up');
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (loading) return;

    const sections = ['hero', 'description', 'specs', 'heritage'];
    const observerOptions = {
      root: null,
      rootMargin: '-49% 0px -49% 0px',
      threshold: 0
    };

    const handleIntersect = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    const timeoutId = setTimeout(() => {
      sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [loading, watchId]);

  const handleBookNow = () => {
    let targetVariant = null;
    const variants = product?.variants || [];

    const selectionsLocal = {};
    const variantIdParam = searchParams.get('variant');
    searchParams.forEach((value, key) => {
      if (key !== 'watch' && key !== 'mode' && key !== 'variant') {
        selectionsLocal[key.toLowerCase()] = value;
      }
    });

    if (variants.length > 0) {
      targetVariant = variants.find(v => {
        if (variantIdParam && v.id.toString() === variantIdParam) return true;
        const vAttrs = v.variantAttributes || [];
        if (vAttrs.length === 0) return false;
        return Object.keys(selectionsLocal).every(key => {
          const va = vAttrs.find(a => a.attributeValue?.attribute?.name?.toLowerCase() === key);
          return va && va.attributeValue?.label === selectionsLocal[key];
        });
      });
    }

    if (!targetVariant && variants.length > 0) {
      targetVariant = variants[0];
    }

    if (targetVariant) {
      addToCart(targetVariant.id.toString(), 1, { title: product.name });
      setIsAdded(true);
    } else {
      alert("This timepiece is currently unavailable for purchase.");
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [watchId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div className="loading-state">Initializing Assembled Timepiece...</div>
      </div>
    );
  }

  const productIndex = productsData.findIndex(p => p.id === watchId || p.slug === watchId);
  const initialIndex = productIndex !== -1 ? productIndex : 0;
  const product = productsData[initialIndex];

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>No Products Available</h2>
          <p style={{ color: '#888', marginBottom: '2rem' }}>We are currently updating our collection. Please check back soon.</p>
          <Link href="/" style={{ color: '#1a1a1a', fontWeight: 600 }}>← Back to Home</Link>
        </div>
      </div>
    );
  }

  if (productOverrides) {
    product.bgColor = productOverrides.discoverBg || product.bgColor;
    product.textColor = productOverrides.discoverTextColor || product.textColor;
    product.accentColor = productOverrides.discoverAccentColor || product.accentColor;
    product.gradient = productOverrides.discoverGradient || product.gradient;
  }
  
  const selections = {};
  const variantIdParam = searchParams.get('variant');

  searchParams.forEach((value, key) => {
    if (key !== 'watch' && key !== 'mode' && key !== 'variant') {
      selections[key.toLowerCase()] = value;
    }
  });

  const hasSelections = Object.keys(selections).length > 0;
  let matchingVariant = null;

  if (hasSelections || variantIdParam) {
    matchingVariant = (product.variants || []).find(v => {
      if (variantIdParam && v.id.toString() === variantIdParam) return true;
      const vAttrs = v.variantAttributes || [];
      if (vAttrs.length === 0) return false;

      return Object.keys(selections).every(key => {
        const va = vAttrs.find(a => a.attributeValue?.attribute?.name?.toLowerCase() === key);
        return va && va.attributeValue?.label?.toLowerCase() === selections[key].toLowerCase();
      });
    });
  }

  if (matchingVariant) {
    const vDisplay = getDisplayData(product, matchingVariant);
    product.heroImage = vDisplay.image;
    product.formattedPrice = vDisplay.formattedPrice;
    product.price = vDisplay.price;
    product.subtitle = vDisplay.subtitle;
    product.currentVariantId = matchingVariant.id.toString();
  }

  // ── ENFORCE 1 SINGLE PRIMARY IMAGE ACROSS ALL SECTIONS ──
  const singlePrimaryImage = product.heroImage;
  const hasConfig = hasSelections || !!variantIdParam;

  return (
    <div className={`cfg-discover-root ${product.theme}`}>
      <style jsx global>{`
        /* Global Reset & Base Fonts */
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@200;300;400;500;600;700&display=swap');

        .cfg-discover-root {
          font-family: 'Inter', sans-serif;
          background: ${product.bgColor || '#ffffff'};
          color: ${product.textColor || '#111111'};
          overflow-x: hidden;
          min-height: 100vh;
        }

        /* Fixed Navigation Buttons */
        .cfg-top-right-cta {
          position: fixed;
          top: 30px;
          right: 40px;
          z-index: 100;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
        }

        .cfg-top-right-cta.hidden {
          transform: translateY(-100px);
          opacity: 0;
        }

        .top-actions {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 99;
        }

        .close-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(8px);
        }
        .close-btn:hover {
          background: rgba(0, 0, 0, 0.7);
          transform: scale(1.05);
        }

        .cfg-cta-pill {
          display: inline-block;
          padding: 12px 28px;
          background: ${product.textColor || '#111111'};
          color: ${product.bgColor || '#ffffff'};
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-radius: 40px;
          text-decoration: none;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .cfg-cta-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.25);
        }

        /* Vertical Dash Indicators */
        .cfg-page-pagination {
          position: fixed;
          left: 40px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 16px;
          z-index: 90;
        }

        .cfg-pagination-bar {
          width: 3px;
          height: 24px;
          background: ${product.heroBgImage ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'};
          cursor: pointer;
          transition: height 0.3s ease, background 0.3s ease;
          border-radius: 2px;
        }

        .cfg-pagination-bar.active {
          height: 48px;
          background: ${product.accentColor || '#c4a35a'};
        }

        /* Hero Section */
        .cfg-hero {
          position: relative;
          min-height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 120px 80px 40px;
          box-sizing: border-box;
          overflow: hidden;
        }

        .cfg-hero-aura {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 70vw;
          height: 70vw;
          background: radial-gradient(circle, ${product.accentColor || '#c4a35a'}18 0%, transparent 65%);
          pointer-events: none;
          z-index: 1;
        }

        .cfg-hero-main-visual {
          position: relative;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
        }

        .cfg-hero-visual-box {
          position: relative;
          width: 100%;
          max-width: 500px;
          height: 55vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .cfg-hero-product-img {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
          filter: drop-shadow(0 30px 50px rgba(0,0,0,0.3));
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Details Box */
        .cfg-details-box {
          position: relative;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .cfg-details-title {
          font-family: 'Cinzel', serif;
          font-size: 3.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin: 0 0 10px 0;
          line-height: 1.1;
        }

        .cfg-price-add-row {
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .cfg-details-price {
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .cfg-actions-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .cfg-add-now-btn {
          padding: 14px 36px;
          border-radius: 40px;
          background: ${product.accentColor || '#c4a35a'};
          color: #000000;
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border: none;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .cfg-add-now-btn:hover {
          transform: scale(1.03);
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }

        .cfg-fav-inline {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .cfg-fav-inline svg {
          width: 20px;
          height: 20px;
        }
        .cfg-fav-inline.active {
          color: #ef4444;
          border-color: #ef4444;
        }

        /* Description Section */
        .cfg-desc-section {
          position: relative;
          padding: 140px 80px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
          box-sizing: border-box;
          overflow: hidden;
        }

        .cfg-heritage-eyebrow {
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 20px;
        }

        .cfg-desc-heading {
          font-family: 'Cinzel', serif;
          font-size: 2.8rem;
          font-weight: 600;
          line-height: 1.2;
          margin: 0 0 30px 0;
        }

        .cfg-desc-text {
          font-size: 1.05rem;
          line-height: 1.8;
          opacity: 0.85;
          margin: 0;
        }

        .cfg-desc-img-wrap {
          position: relative;
          width: 100%;
          height: 500px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .cfg-desc-img {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.4));
        }

        /* Technical Specs Section */
        .cfg-specs-section {
          padding: 140px 80px;
          background: #000000;
          color: #ffffff;
          box-sizing: border-box;
        }

        .cfg-specs-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .cfg-specs-title {
          font-family: 'Cinzel', serif;
          font-size: 2.5rem;
          font-weight: 600;
          margin-bottom: 60px;
        }
        .cfg-specs-title span {
          display: block;
          color: ${product.accentColor || '#c4a35a'};
        }

        .cfg-specs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }

        .cfg-specs-img-wrap {
          width: 100%;
          height: 450px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .cfg-specs-img {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.6));
        }

        .cfg-spec-item {
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .cfg-spec-trigger {
          width: 100%;
          padding: 24px 0;
          background: none;
          border: none;
          color: #ffffff;
          font-size: 1.1rem;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          text-align: left;
        }

        .cfg-spec-content {
          padding-bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cfg-spec-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
        }
        .cfg-spec-label {
          color: rgba(255,255,255,0.6);
        }
        .cfg-spec-value {
          color: #ffffff;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .cfg-hero { padding: 100px 24px 40px; }
          .cfg-details-title { font-size: 2.2rem; }
          .cfg-desc-section { grid-template-columns: 1fr; padding: 80px 24px; gap: 40px; }
          .cfg-specs-section { padding: 80px 24px; }
          .cfg-specs-grid { grid-template-columns: 1fr; gap: 40px; }
          .cfg-page-pagination { display: none; }
        }
      `}</style>

      {/* Header */}
      <Header />

      {!hasConfig && (
        <div className={`cfg-top-right-cta ${scrollDir === 'down' && isScrolled ? 'hidden' : ''}`}>
          {product.productType === 'simple' ? (
            <button onClick={handleBookNow} className="cfg-cta-pill">Book Now</button>
          ) : (
            <Link href={`/configure?watch=${product.id}`} className="cfg-cta-pill">Configure</Link>
          )}
        </div>
      )}

      <div className="cfg-page-pagination">
        {['hero', 'description', 'specs', 'heritage'].map((id) => (
          <div
            key={id}
            className={`cfg-pagination-bar ${activeSection === id ? 'active' : ''}`}
            onClick={() => {
              const el = document.getElementById(id);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
        ))}
      </div>

      <div className="cfg-content-wrapper">
        {hasConfig && (
          <div className="top-actions">
            <button onClick={() => router.push(`/products`)} className="close-btn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        )}

        {/* ── HERO SECTION: 1 SINGLE PRIMARY IMAGE ── */}
        <section id="hero" className={`cfg-hero ${product.heroBgImage ? 'has-bg-image' : ''}`} ref={heroRef} style={!product.heroBgImage ? { background: product.bgColor || 'radial-gradient(circle at center, #ffffff 0%, #e8edf3 100%)' } : {}}>
          {product.heroBgImage ? (
            <>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${getFileUrl(product.heroBgImage)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: 0
                }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%)', zIndex: 1 }} />
            </>
          ) : (
            <div className="cfg-hero-aura"></div>
          )}

          <div className="cfg-hero-main-visual" style={{ zIndex: 10 }}>
            <div className="cfg-hero-visual-box">
              <img
                src={singlePrimaryImage}
                alt={product.title}
                className="cfg-hero-product-img"
              />
            </div>
          </div>

          <div className="cfg-details-box" style={{ zIndex: 10 }}>
            <div className="cfg-details-left">
              <h1 className="cfg-details-title" style={product.heroBgImage ? { color: '#ffffff' } : { color: product.textColor || '#111111' }}>{product.title}</h1>

              {hasConfig && (
                <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Object.entries(selections).map(([key, val]) => {
                    const tc = product.textColor || '#111111';
                    const isLight = !product.heroBgImage;
                    return (
                      <span key={key} style={{ fontSize: '0.8rem', padding: '6px 12px', background: isLight ? `${tc}12` : 'rgba(255,255,255,0.1)', borderRadius: '20px', color: isLight ? tc : '#ffffff', border: isLight ? `1px solid ${tc}22` : '1px solid rgba(255,255,255,0.2)', textTransform: 'capitalize', fontWeight: '500' }}>
                        <span style={{opacity: 0.6, marginRight: '4px'}}>{key}:</span> {val}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="cfg-price-add-row">
                <div className="cfg-details-price" style={product.heroBgImage ? { color: '#ffffff' } : { color: product.textColor || '#111111' }}>
                  {product.formattedPrice || (typeof product.price === 'number' ? `₹ ${product.price.toLocaleString()}` : product.price) || '₹ 25,000'}
                </div>

                <div className="cfg-actions-group">
                  {hasConfig && (
                    <button 
                      className={`cfg-add-now-btn cfg-book-btn ${isAdded ? 'btn-added' : ''}`} 
                      onClick={handleBookNow}
                    >
                      {isAdded ? 'Added to Cart' : 'Add to Cart'}
                    </button>
                  )}
                  {hasConfig && (
                    <div className="cfg-details-right" style={{ color: product.heroBgImage ? '#ffffff' : (product.textColor || '#1a1a1a') }}>
                      <div
                        className={`cfg-fav-inline ${isInWishlist(product.currentVariantId || product.variantId) ? 'active' : ''}`}
                        onClick={() => toggleWishlist({ ...product, variantId: product.currentVariantId || product.variantId })}
                        title={isInWishlist(product.currentVariantId || product.variantId) ? 'Remove from Favourite' : 'Add to Favourite'}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill={isInWishlist(product.currentVariantId || product.variantId) ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECONDARY SECTION ("your timepiece") - USES 1 SINGLE PRIMARY IMAGE ── */}
        <section id="description" className="cfg-desc-section" style={{
          background: product.heroBgImage ? 'rgba(0,0,0,0.85)' : (product.bgColor || '#ffffff'),
          color: product.textColor || '#111111'
        }}>
          <div className="cfg-mist-layer" style={{
            background: `radial-gradient(circle at 70% 40%, ${product.accentColor || '#c4a35a'}22 0%, transparent 70%)`
          }}></div>
          <div className="cfg-desc-content" style={{ position: 'relative', zIndex: 2 }}>
            <span className="cfg-heritage-eyebrow" style={{ color: product.heroBgImage ? '#aaaaaa' : '#666666' }}>your timepiece.</span>
            <h2 className="cfg-desc-heading" style={{ color: product.heroBgImage ? '#ffffff' : (product.textColor || '#111111') }}>{product.subtitle || 'Crafted with passion'}</h2>
            {product.longDesc.startsWith('<') ? (
              <div className="cfg-desc-text" dangerouslySetInnerHTML={{ __html: product.longDesc }} />
            ) : (
              <p className="cfg-desc-text">{product.longDesc.replace(/<[^>]*>/g, '')}</p>
            )}
          </div>
          <div className="cfg-desc-img-wrap" style={{ position: 'relative', zIndex: 2 }}>
            <img src={singlePrimaryImage} alt={product.title} className="cfg-desc-img" />
          </div>
        </section>

        {product.videoUrl && (
          <section className="cfg-video-section">
            <div className="cfg-video-wrap">
              <video
                src={product.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </section>
        )}

        {/* ── TECHNICAL DETAILS SECTION - USES 1 SINGLE PRIMARY IMAGE ── */}
        <section id="specs" className="cfg-specs-section">
          <div className="cfg-specs-container">
            <div className="cfg-specs-header">
              <h2 className="cfg-specs-title">
                More {product.title}
                <span>technical details</span>
              </h2>
            </div>

            <div className="cfg-specs-grid">
              <div className="cfg-specs-img-wrap">
                <img src={singlePrimaryImage} alt={product.title} className="cfg-specs-img" />
              </div>

              <div className="cfg-spec-accordion" style={{ width: '100%' }}>
                {(() => {
                  const specKeys = Object.keys(product.specs || {});
                  const currentActiveGroup = activeSpecGroup === 'NONE' ? null : (activeSpecGroup || specKeys[0]);

                  return specKeys.map((groupName) => (
                    <div key={groupName} className={`cfg-spec-item ${currentActiveGroup === groupName ? 'active' : ''}`}>
                      <button
                        className="cfg-spec-trigger"
                        onClick={() => setActiveSpecGroup(currentActiveGroup === groupName ? 'NONE' : groupName)}
                      >
                        <span className="cfg-spec-group-name">{groupName}</span>
                      </button>

                      {currentActiveGroup === groupName && (
                        <div className="cfg-spec-content">
                          {(product.specs[groupName] || []).map((s, i) => (
                            <div key={i} className="cfg-spec-row">
                              <span className="cfg-spec-label">{s.label}</span>
                              <span className="cfg-spec-value">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </section>

        {/* ── HERITAGE SECTION ── */}
        <section id="heritage" style={{ padding: '140px 80px', background: '#09090b', color: '#ffffff', textAlign: 'center' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: product.accentColor || '#c4a35a', display: 'block', marginBottom: '16px' }}>
              HERITAGE &amp; CRAFTSMANSHIP
            </span>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '2.5rem', fontWeight: 600, marginBottom: '24px' }}>
              The Legacy of Precision
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'rgba(255,255,255,0.75)' }}>
              {product.heritageText}
            </p>
          </div>
        </section>

      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function ConfiguredPage() {
  return (
    <Suspense fallback={<div style={{ background: '#09090b', height: '100vh' }}></div>}>
      <ConfiguredContent />
    </Suspense>
  );
}
