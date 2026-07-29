"use client";
import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchProducts, fetchBoxes } from '../../../lib/api';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useDesignSystem } from '@/context/DesignSystemContext';
import { getFileUrl, resolveProductImage, getDisplayData, getPageTheme } from '@/lib/utils';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
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
  const [addedBelts, setAddedBelts] = useState({});
  const lastScrollY = useRef(0);
  const heroRef = useRef(null);
  const strapsSectionRef = useRef(null);
  const strapsTrackRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || loading) return;
    if (window.innerWidth <= 768) return;

    const section = strapsSectionRef.current;
    const track = strapsTrackRef.current;
    if (!section || !track) return;

    const timer = setTimeout(() => {
      const getScrollAmount = () => {
        return track.scrollWidth - window.innerWidth + 120;
      };

      const scrollAmount = getScrollAmount();
      if (scrollAmount <= 0) return;

      const ctx = gsap.context(() => {
        gsap.to(track, {
          x: () => -getScrollAmount(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            pin: true,
            scrub: 1,
            start: 'top top',
            end: () => `+=${getScrollAmount() + 400}`,
            invalidateOnRefresh: true,
          }
        });
      }, section);

      return () => ctx.revert();
    }, 400);

    return () => clearTimeout(timer);
  }, [loading, productsData, watchId]);

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
              galleryImages: (p.productMedia?.length > 0)
                ? p.productMedia
                  .filter(m => m.type === 'GALLERY')
                  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                  .map(m => {
                    let mPath = m.media?.url || (m.media?.fileName ? `/uploads/${m.media.fileName}` : '');
                    return getFileUrl(mPath);
                  }).filter(Boolean)
                : (p.images || []).map(img => getFileUrl(img.startsWith('http') || img.startsWith('/') ? img : `/uploads/${img}`)),
              combinations: (p.variants || []).map(v => {
                const vDisplay = getDisplayData(p, v);
                return {
                  id: v.id.toString(),
                  name: vDisplay.subtitle || v.variantAttributes?.map(va => va.attributeValue?.label).join(' • ') || v.name || v.sku,
                  img: vDisplay.image,
                  price: vDisplay.price,
                  formattedPrice: vDisplay.formattedPrice,
                  isSoldConfiguration: v.isSoldConfiguration,
                  fakeSoldCount: v.fakeSoldCount || 0,
                  attributes: v.variantAttributes?.map(va => ({
                    name: va.attributeValue?.attribute?.name?.toLowerCase(),
                    value: va.attributeValue?.label
                  })) || []
                };
              }),
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
              })(),
              productBelts: p.productBelts?.map(pb => {
                const bImg = pb.belt?.image?.url || pb.belt?.image?.filePath || pb.belt?.image?.path || pb.belt?.image?.fileName || (typeof pb.belt?.image === 'string' ? pb.belt?.image : null);
                return {
                  id: pb.belt.id,
                  name: pb.belt.name,
                  price: pb.belt.price,
                  stock: pb.belt.stock,
                  image: bImg ? getFileUrl(bImg) : null
                };
              }) || [],
              productBoxes: universalBoxes,
              totalSoldConfigurations: (p.variants || []).reduce((sum, v) => sum + (v.fakeSoldCount || 0), 0)
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

  const openInfoModal = (p) => {
    const soldConfigs = (p.combinations || [])
      .filter(combo => combo.isSoldConfiguration)
      .map(combo => ({
        ...combo,
        isProduct: false
      }));
    setActiveModalData({ ...p, combinations: soldConfigs });
  };
  const closeInfoModal = () => setActiveModalData(null);

  const handleComboClick = (combo) => {
    if (combo.isProduct) {
      router.push(`?watch=${combo.id}`);
      closeInfoModal();
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (activeModalData?.id) {
      params.set('watch', activeModalData.id);
    }
    (combo.attributes || []).forEach(attr => {
      if (attr.name && attr.value) {
        params.set(attr.name, attr.value);
      }
    });
    router.push(`?${params.toString()}`);
    closeInfoModal();
  };

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
        <div className="loading-state">Initializing Experience...</div>
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

  // ── EXACT COPY DITTO OF EXPLORE PAGE WITH 1 SINGLE IMAGE ──
  const singleImage = product.heroImage;
  const hasConfig = hasSelections || !!variantIdParam;

  return (
    <div className={`cfg-discover-root ${product.theme}`}>
      <style jsx global>{`
        /* EXACT EXPLORE STYLES */
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@200;300;400;500;600;700&display=swap');

        .cfg-discover-root {
          font-family: 'Inter', sans-serif;
          background: ${product.bgColor || '#ffffff'};
          color: ${product.textColor || '#111111'};
          overflow-x: hidden;
          min-height: 100vh;
        }

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

        {/* HERO SECTION - 1 SINGLE PRIMARY IMAGE */}
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
                src={singleImage}
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

        {/* DESCRIPTION SECTION - 1 SINGLE PRIMARY IMAGE */}
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
            <img src={singleImage} alt={product.title} className="cfg-desc-img" />
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

        {/* TECHNICAL DETAILS SECTION - 1 SINGLE PRIMARY IMAGE */}
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
                <img src={singleImage} alt={product.title} className="cfg-specs-img" />
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
                      <div className="cfg-spec-content">
                        <div className="cfg-spec-inner">
                          {(product.specs[groupName] || []).map((spec, sIdx) => (
                            <div key={sIdx} className="cfg-spec-row">
                              <span className="cfg-spec-label">{spec.label}</span>
                              <span className="cfg-spec-value">{spec.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </section>

        {/* COMPATIBLE BELTS SECTION */}
        {product.productBelts?.length > 0 && (
          <section 
            ref={strapsSectionRef}
            className="cfg-belts-pinned-section"
            style={{ 
              background: '#f5f5f3', 
              width: '100%', 
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: '100vh',
              padding: '60px 0'
            }}
          >
            <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '0 40px' }}>
              <div style={{ marginBottom: '36px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#333', marginBottom: '10px' }}>Compatible Straps</p>
                  <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 300, fontFamily: 'Georgia, serif', color: '#111', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    Add to the look
                  </h2>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Scroll down to explore all straps</span> →
                </div>
              </div>

              <div 
                ref={strapsTrackRef}
                className="cfg-belts-track-row"
                style={{ 
                  display: 'flex', 
                  gap: '28px', 
                  willChange: 'transform',
                  paddingBottom: '24px',
                  paddingTop: '8px'
                }}
              >
                {product.productBelts.map(belt => (
                  <div key={belt.id} className="group" style={{ 
                    flex: '0 0 280px', 
                    width: '280px', 
                    scrollSnapAlign: 'start',
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                    border: '1px solid #eaeaea',
                    transition: 'all 0.3s ease'
                  }}>
                    <div
                      style={{
                        background: '#f9f9f8',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        position: 'relative',
                        paddingBottom: '110%',
                        marginBottom: '16px',
                        transition: 'background 0.3s',
                      }}
                    >
                      {belt.image ? (
                        <img
                          src={belt.image}
                          alt={belt.name}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            padding: '0px',
                            transition: 'transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                          }}
                          className="group-hover:scale-105"
                        />
                      ) : (
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#666', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em'
                        }}>No Image</div>
                      )}
                    </div>

                    <div style={{ paddingBottom: '4px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 500, fontFamily: 'Georgia, serif', color: '#111', lineHeight: 1.25, marginBottom: '6px' }}>{belt.name}</h3>
                      <p style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.05em', color: '#111', marginBottom: '14px' }}>₹{(belt.price || 0).toLocaleString()}</p>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!addedBelts[belt.id]) {
                            addToCart(`belt-${belt.id}`, 1, { title: belt.name, price: belt.price, image: belt.image });
                            setAddedBelts(prev => ({ ...prev, [belt.id]: true }));
                          }
                        }}
                        style={{
                          width: '100%',
                          display: 'block',
                          textAlign: 'center',
                          padding: '10px 18px',
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          border: addedBelts[belt.id] ? '1px solid #111' : '1px solid #111',
                          background: addedBelts[belt.id] ? '#111' : 'transparent',
                          color: addedBelts[belt.id] ? '#fff' : '#111',
                          cursor: addedBelts[belt.id] ? 'default' : 'pointer',
                          transition: 'all 0.25s',
                          borderRadius: '999px',
                        }}
                      >
                        {addedBelts[belt.id] ? '✓ Added to Cart' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* UNIVERSAL PACKAGING BANNER */}
        {product.productBoxes?.length > 0 && (() => {
          const mainBox = product.productBoxes[0];
          const boxImg = mainBox?.image;
          const defaultParagraph = "Inspired by the travel cases from the 1940s, simply sophisticated and refined, our packaging is crafted with attention to details to guarantee great robustness. It includes warranty and certificates papers, a micro-fiber cloth and a secondary strap.";
          let rawDesc = mainBox?.description || defaultParagraph;
          const sentenceList = rawDesc.split(/(?<=[.?!])\s+/).filter(Boolean);
          const uniqueSentences = Array.from(new Set(sentenceList));
          let cleanDesc = uniqueSentences.join(' ').trim() || defaultParagraph;
          const rawBoxName = mainBox?.name?.trim() || '';
          const isLongName = rawBoxName.length >= 50 || rawBoxName.toLowerCase().includes('inspired by');
          const displayBoxName = (!isLongName && rawBoxName && rawBoxName !== cleanDesc)
            ? rawBoxName
            : 'Universal Signature Packaging';

          return (
            <section style={{ 
              width: '100%', 
              background: '#ffffff', 
              padding: '0 0 60px 0', 
              margin: 0,
              borderTop: '1px solid #e5e5e0', 
              borderBottom: '1px solid #e5e5e0',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: '100%', 
                margin: 0, 
                padding: 0, 
                background: '#f9f9f8', 
                overflow: 'hidden' 
              }}>
                {boxImg ? (
                  <img
                    src={boxImg}
                    alt={displayBoxName}
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '75vh',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto',
                      padding: 0
                    }}
                  />
                ) : (
                  <div style={{ padding: '80px 20px', textAlign: 'center', color: '#888' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📦</span>
                    <p style={{ fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>Universal Signature Packaging</p>
                  </div>
                )}
              </div>

              <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 30px 0 30px', width: '100%' }}>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  gap: '24px' 
                }}>
                  <div style={{ flex: '1 1 500px', maxWidth: '850px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#006039', marginBottom: '8px' }}>
                      Included Packaging
                    </p>
                    <h3 style={{ fontSize: '26px', fontWeight: 400, fontFamily: 'Georgia, serif', color: '#111', marginBottom: '12px' }}>
                      {displayBoxName}
                    </h3>
                    <p style={{ fontSize: '15px', color: '#555', lineHeight: 1.7, margin: 0 }}>
                      {cleanDesc}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: 700, 
                      letterSpacing: '0.15em', 
                      textTransform: 'uppercase', 
                      color: '#006039', 
                      background: '#e6f4ed', 
                      padding: '12px 24px', 
                      borderRadius: '999px',
                      border: '1px solid #bce3d0'
                    }}>
                      ✓ Included with order
                    </span>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}
      </div>

      <div className={`cfg-modal-overlay ${activeModalData ? 'show' : ''}`} onClick={closeInfoModal}>
        <div className="cfg-modal-box" onClick={(e) => e.stopPropagation()}>
          <div className="cfg-modal-header">
            <h3 className="cfg-modal-title">Sold Configurations</h3>
            <button className="cfg-modal-close" onClick={closeInfoModal}>✕</button>
          </div>
          <div className="cfg-modal-content" data-lenis-prevent="true" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
            {activeModalData?.combinations?.length > 0 ? (
              activeModalData.combinations.map((combo) => (
                <div key={combo.id} className="cfg-combo-item" onClick={() => handleComboClick(combo)}>
                  <div className="cfg-combo-img-wrap">
                    <img src={combo.img} alt={`Combo ${combo.id}`} />
                  </div>
                  <div className="cfg-combo-details">
                    <span className="cfg-combo-name">{combo.name}</span>
                    <span className="cfg-combo-status">Exclusive Build &bull; {combo.fakeSoldCount || 0} Sold</span>
                  </div>
                  <div className="cfg-combo-chevron">&#8250;</div>
                </div>
              ))
            ) : (
              <div style={{ padding: '60px 40px', textAlign: 'center', color: '#888', fontSize: '0.95rem' }}>
                No configurations have been registered yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function ConfiguredPage() {
  return (
    <Suspense fallback={<div>Loading Assembled Timepiece...</div>}>
      <ConfiguredContent />
    </Suspense>
  );
}
