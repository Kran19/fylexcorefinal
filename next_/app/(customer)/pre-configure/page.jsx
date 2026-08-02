"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { fetchProducts } from '../../../lib/api';
import { useDesignSystem } from '@/context/DesignSystemContext';
import { getDisplayData, getPageTheme } from '../../../lib/utils';

const PreConfigure = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [swiperInstance, setSwiperInstance] = useState(null);
  const { productOverrides } = useDesignSystem();
  const [activeCategory, setActiveCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [activeModalData, setActiveModalData] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const openInfoModal = (product) => {
    setActiveModalData(product);
  };
  const closeInfoModal = () => {
    setActiveModalData(null);
  };



  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetchProducts();
        const rawData = res.data || (Array.isArray(res) ? res : []);
        const mapped = rawData.map(p => {
          // Find cheapest variant
          let cheapestVariant = null;
          if (p.variants && p.variants.length > 0) {
            cheapestVariant = p.variants.reduce((prev, curr) => {
              const prevPrice = Number(prev.sellingPrice || prev.price || 0);
              const currPrice = Number(curr.sellingPrice || curr.price || 0);
              return (currPrice > 0 && (currPrice < prevPrice || prevPrice === 0)) ? curr : prev;
            }, p.variants[0]);
          }

          const display = getDisplayData(p);
          const pageTheme = getPageTheme(p, 'preConfigure');

          // Flatten orderItems into individual "sold cards"
          const soldCards = [];
          let globalIdx = 1;
          (p.orderItems || []).forEach(item => {
            const variant = item.productVariant;
            for (let i = 0; i < item.quantity; i++) {
              const vDisplay = getDisplayData(p, variant);
              soldCards.push({
                id: globalIdx++,
                orderId: item.orderId?.toString(),
                name: vDisplay.subtitle || vDisplay.name,
                img: vDisplay.image,
                soldAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently',
                sku: item.sku
              });
            }
          });

          return {
            id: p.id.toString(),
            title: p.name,
            price: display.formattedPrice,
            heroImage: display.image,
            theme: p.theme || 'champagne',
            textColor: pageTheme.textColor,
            accentColor: pageTheme.accentColor,
            bgColor: pageTheme.bg,
            shortDescription: p.shortDescription || p.description || '',
            category: p.mainCategory?.name || 'Uncategorized',
            combinations: soldCards
          };
        });
        setProducts(mapped);

        // Extract unique categories
        const uniqueCats = ['All', ...new Set(mapped.map(p => p.category).filter(c => c !== 'Uncategorized'))];
        setCategories(uniqueCats);
      } catch (err) {
        console.error('Failed to fetch products for pre-configure', err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-white text-navy font-serif text-2xl">Initializing Atelier...</div>;
  const filteredList = products.filter(p => activeCategory === 'All' || p.category === activeCategory);
  const currentProd = filteredList[activeIndex] || filteredList[0];
  const isDark = currentProd ? (
    currentProd.textColor === '#ffffff' || 
    currentProd.bgColor?.toLowerCase() === '#000000' || 
    currentProd.bgColor?.toLowerCase()?.startsWith('#1')
  ) : false;
  const activeNavTextColor = isDark ? '#ffffff' : '#000000';

  return (
    <div className="pre-configure-page fixed inset-0 flex flex-col bg-white overflow-hidden z-[1001]">
      <style>{`
        .pre-configure-page {
          font-family: 'Inter', sans-serif;
        }
        .swiper-container-main {
          width: 100%;
          height: 100%;
          position: absolute;
          inset: 0;
          z-index: 5;
        }
        .swiper-slide {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        
        .slide-bg {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }
        .p-aura-shadow {
          position: absolute;
          inset: 0;
          background: 
            linear-gradient(to right, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 20%, transparent 60%),
            linear-gradient(to left, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.02) 25%, transparent 65%);
          z-index: 2;
        }
        .p-mist-layer {
          position: absolute;
          width: 120%;
          height: 120%;
          filter: blur(120px);
          opacity: 0.7;
          z-index: 1;
        }
        .p-accent-beam {
          position: absolute;
          width: 200%;
          height: 300px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
          transform: rotate(-35deg);
          top: -10%;
          left: -20%;
          pointer-events: none;
          z-index: 3;
          opacity: 0.6;
        }


        .section-champagne { background: #fffafb; --theme-text: #1a1a1a; --theme-accent: #c4a35a; }
        .section-champagne .p-mist-layer { background: radial-gradient(circle at 70% 40%, rgba(196,163,90,0.2) 0%, transparent 70%); }
        
        .section-mist-blue { background: #e5f0f0ef; --theme-text: #1a1a1a; --theme-accent: #1e40af; }
        .section-mist-blue .p-mist-layer { background: radial-gradient(circle at 70% 40%, rgba(30,64,175,0.15) 0%, transparent 70%); }

        .section-soft-green { background: #ddfddcff; --theme-text: #1a1a1a; --theme-accent: #066e50; }
        .section-soft-green .p-mist-layer { background: radial-gradient(circle at 70% 40%, rgba(6,110,80,0.15) 0%, transparent 70%); }

        .section-pearl-silver { background: #fcfcfc; --theme-text: #1a1a1a; --theme-accent: #475569; }
        .section-pearl-silver .p-mist-layer { background: radial-gradient(circle at 70% 40%, rgba(71,85,105,0.15) 0%, transparent 70%); }

        .section-rose-burgundy { background: #d4c0c4cb; --theme-text: #1a1a1a; --theme-accent: #7f1d1d; }
        .section-rose-burgundy .p-mist-layer { background: radial-gradient(circle at 70% 40%, rgba(127,29,29,0.12) 0%, transparent 70%); }

        .slide-content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: 100%;
          height: 100%;
          padding: 0;
          pointer-events: none;
        }
        .product-image-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
          overflow: hidden;
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transform: scale(1.45);
          filter: drop-shadow(0 30px 60px rgba(0,0,0,0.15));
          transition: transform 0.8s cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        .product-info {
          position: absolute;
          bottom: 80px;
          left: 0;
          right: 0;
          z-index: 20;
          color: var(--theme-text, #1a1a1a);
          pointer-events: auto;
          padding: 0 60px;
        }
        .product-name {
          font-family: 'Avenir', 'Neue Haas Grotesk Display Pro', 'Inter', sans-serif;
          font-size: clamp(1.8rem, 4vw, 3rem);
          font-weight: 400;
          margin: 0;
          line-height: 1;
          text-align: left;
        }
        .product-name em {
          font-style: italic;
          opacity: 0.6;
          margin-left: 10px;
        }
        .product-price {
          font-size: 1.1rem;
          color: #555;
          margin: 0 0 15px;
          font-weight: 300;
          display: block;
          text-align: left;
        }
        .product-desc-container {
          max-width: 600px;
          margin: 10px 0;
          text-align: left;
        }
        .product-desc {
          font-size: 0.95rem;
          color: #000;
          line-height: 1.5;
          font-weight: 300;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .product-desc.expanded {
          -webkit-line-clamp: unset;
        }
        .btn-read-more {
          background: none;
          border: none;
          color: var(--theme-accent, #c4a35a);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          padding: 4px 0;
          margin-top: 6px;
          pointer-events: auto;
          display: inline-block;
          text-align: left;
          transition: opacity 0.3s ease;
        }
        .btn-read-more:hover {
          opacity: 0.8;
        }
        .btn-container {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          width: 100%;
        }
        .btn-configure {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 24px;
          background: #000000;
          color: #ffffff;
          text-decoration: none;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
          border-radius: 999px;
          border: 1px solid #000000;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          align-self: flex-start;
          margin-left: 0;
          margin-right: auto;
        }
        .btn-configure:hover, .btn-configure:active {
          background: #222222 !important;
          border-color: #222222;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
        }
        .btn-explore {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 18px;
          background: transparent;
          color: #1a1a1a;
          text-decoration: none;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
          border-radius: 999px;
          border: 1px solid #1a1a1a;
        }
        .btn-explore:hover, .btn-explore:active {
          background: #1a1a1a;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        /* Custom Pagination Lines */
        .swiper-pagination {
          bottom: 40px !important; /* Adjusted position */
          display: flex;
          justify-content: center;
          gap: 12px;
          z-index: 50;
        }
        .swiper-pagination-bullet {
          width: 40px !important;
          height: 2px !important;
          border-radius: 0 !important;
          background: var(--theme-text, #1a1a1a) !important;
          opacity: 0.2;
          margin: 0 !important;
          transition: all 0.3s ease;
        }
        .swiper-pagination-bullet-active {
          opacity: 1;
          width: 60px !important;
          background: #000000 !important;
        }

        @media (max-width: 768px) {
          .product-image {
            transform: scale(1.38) translateY(-25px) !important;
            max-height: 64vh !important;
            width: auto !important;
          }
          .product-info {
            padding: 0 24px !important;
            bottom: 30px !important;
          }
          .btn-container {
            justify-content: flex-start !important;
            width: 100% !important;
          }
          .btn-configure {
            width: auto !important;
            max-width: 60% !important;
            padding: 12px 28px !important;
            align-self: flex-start !important;
            margin-left: 0 !important;
          }
        }


        .header-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 50;
          transition: filter 0.4s ease;
        }
        .header-wrapper.header-blurred {
          filter: blur(10px);
          pointer-events: none;
        }
        .slide-overlay {
          position: absolute;
          inset: 0;
          z-index: 15;
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(12px);
          opacity: 0;
          pointer-events: none;
          transition: all 0.4s ease;
        }
        .slide-overlay.active {
          opacity: 1;
          pointer-events: auto;
        }

        .btn-container {
          justify-content: center;
        }

        /* Desktop Redesign - SPLIT LAYOUT */
        @media (min-width: 1025px) {
          .btn-container {
            justify-content: flex-start;
          }
          .slide-content {
            flex-direction: row-reverse;
            align-items: center;
            justify-content: space-between;
            padding: 0 12%;
          }
          .product-image-container {
            width: 55%;
            height: 100%;
            position: relative;
            left: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .product-image {
            width: auto;
            height: 90%;
            max-height: 850px;
            transform: scale(1.55);
            filter: drop-shadow(0 40px 80px rgba(0,0,0,0.3));
          }
          .product-info {
            position: relative;
            bottom: auto;
            left: auto;
            right: auto;
            width: 40%;
            padding: 0;
            text-align: left;
            display: flex;
            flex-direction: column;
            gap: 20px;
            color: var(--theme-text, #1a1a1a);
          }
          .product-name {
            font-size: clamp(2.2rem, 3.8vw, 3.2rem);
            line-height: 1.05;
            margin-bottom: 5px;
            color: var(--theme-text, #1a1a1a);
          }
          .product-price {
            font-size: 1.5rem;
            margin-bottom: 5px;
            color: var(--theme-text, #1a1a1a);
            opacity: 0.8;
          }
          .product-desc-container {
            max-width: 480px;
            margin-bottom: 10px;
          }
          .product-desc {
            font-size: 1.15rem;
            line-height: 1.6;
            color: var(--theme-text, #1a1a1a);
            opacity: 0.9;
          }
          .btn-read-more {
            color: var(--theme-accent, #c4a35a);
            opacity: 0.8;
          }
          .btn-configure {
            width: fit-content;
            padding: 12px 36px;
            font-size: 0.78rem;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            background: var(--theme-text, #1a1a1a);
            color: var(--theme-bg, #fff);
            border: none;
            font-weight: 700;
          }
          .btn-configure:hover {
            opacity: 0.9;
            transform: translateY(-2px) scale(1.02);
          }
          
          /* Pagination adjustment */
          .swiper-pagination {
            bottom: 60px !important;
          }
          .swiper-pagination-bullet {
            background: var(--theme-text, #1a1a1a) !important;
            opacity: 0.3;
          }
          .swiper-pagination-bullet-active {
            opacity: 1;
            background: var(--theme-accent, #c4a35a) !important;
          }
        }

        @media (max-width: 1024px) {
          .product-image { transform: scale(1.0); }
          .product-info { bottom: 75px; padding: 0 50px; }
          .swiper-pagination { bottom: 35px !important; }
        }

        @media (max-width: 768px) {
          .product-image { transform: scale(0.95); }
          .product-info { bottom: 70px; padding: 0 20px; text-align: center; }
          .product-name { font-size: 1.6rem; text-align: center; }
          .product-price { font-size: 1rem; margin: 2px 0 10px; }
          .btn-container { justify-content: center !important; width: 100% !important; }
          .btn-configure { padding: 10px 24px !important; font-size: 0.75rem !important; align-self: center !important; margin: 0 auto !important; }
          .swiper-pagination { bottom: 30px !important; }
        }

        @media (max-width: 480px) {
          .product-info {
            bottom: 50px !important;
            padding: 0 20px !important;
          }
          .btn-container {
            display: flex !important;
            flex-direction: row !important;
            justify-content: center !important;
            align-items: center !important;
            width: 100% !important;
            padding: 0 !important;
            gap: 8px !important;
            margin-top: 15px !important;
          }
          .btn-configure, .btn-explore {
            width: auto !important;
            max-width: fit-content !important;
            text-align: center !important;
            justify-content: center !important;
            padding: 10px 24px !important;
            font-size: 0.72rem !important;
            box-sizing: border-box !important;
            margin: 0 auto !important;
          }
          .swiper-pagination {
            bottom: 15px !important;
          }
        }

        /* Category Filter Styles */
        .category-nav {
          position: absolute;
          top: 100px;
          left: 0;
          width: 100%;
          z-index: 60;
          display: flex;
          justify-content: center;
          gap: 40px;
          pointer-events: auto;
        }
        .category-item {
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--nav-text-color, #000000);
          cursor: pointer;
          opacity: 0.7;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: capitalize;
        }
        .category-item:hover {
          opacity: 1;
        }
        .category-item.active {
          opacity: 1;
          font-weight: 700;
          color: var(--nav-text-color, #000000);
        }
        .category-dot {
          color: var(--nav-text-color, #000000);
          font-size: 1.2rem;
          line-height: 0;
          margin-left: 2px;
          opacity: 1;
        }

        @media (max-width: 768px) {
          .category-nav { top: 70px; gap: 16px; z-index: 70; }
          .category-item { font-size: 0.78rem; }
        }

        /* ═══════════ SOLD CONFIGS MODAL ═══════════ */
        .info-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); z-index: 9999; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); padding: 24px;
        }
        .info-modal-overlay.show { opacity: 1; pointer-events: auto; }
        .info-modal-box {
          background: #111; border: 1px solid rgba(255,255,255,0.08); width: 100%; max-width: 520px; border-radius: 16px; padding: 32px; position: relative; transform: scale(0.95); transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 30px 60px rgba(0,0,0,0.5);
        }
        .info-modal-overlay.show .info-modal-box { transform: scale(1); }
        .info-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 16px; }
        .info-modal-title { font-size: 1.25rem; font-weight: 500; letter-spacing: 0.05em; color: #fff; margin: 0; font-family: 'Avenir', sans-serif; }
        .info-modal-close { background: none; border: none; color: #888; font-size: 1.2rem; cursor: pointer; transition: color 0.3s; }
        .info-modal-close:hover { color: #fff; }
        .info-modal-content { overflow-y: auto; flex: 1; padding-right: 8px; text-align: left; }
        .info-modal-content::-webkit-scrollbar { width: 4px; }
        .info-modal-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        
        .info-combo-item { display: flex; align-items: center; gap: 16px; padding: 14px; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.3s; border-radius: 8px; }
        .info-combo-item:hover { background: rgba(255,255,255,0.02); }
        .info-combo-img-wrap { width: 56px; height: 56px; background: rgba(255,255,255,0.02); border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 6px; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.05); }
        .info-combo-img-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .info-combo-details { display: flex; flex-direction: column; gap: 4px; }
        .info-combo-name { font-size: 0.9rem; font-weight: 500; color: #fff; }
        .info-combo-status { font-size: 0.75rem; color: #888; }
      `}</style>

      <div className={`header-wrapper ${expandedIds.size > 0 ? 'header-blurred' : ''}`}>
        <Header />
      </div>

      <main className="flex-1 relative overflow-hidden z-10">
        <nav className="category-nav" style={{ '--nav-text-color': activeNavTextColor }}>
              {categories.map(cat => (
                <div
                  key={cat}
                  className={`category-item ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCategory(cat);
                    setActiveIndex(0);
                  }}
                >
                  {cat}
                  {activeCategory === cat && <span className="category-dot">•</span>}
                </div>
              ))}
            </nav>
            <div className="swiper-container-main">
              <Swiper
                onSwiper={setSwiperInstance}
                onSlideChange={(s) => setActiveIndex(s.realIndex)}
                modules={[Pagination]}
                spaceBetween={0}
                slidesPerView={1}
                allowTouchMove={expandedIds.size === 0}
                pagination={{ clickable: true }}
                loop={true}
                className="mySwiper h-full w-full"
              >
            {products
              .filter(p => activeCategory === 'All' || p.category === activeCategory)
              .map((product) => {
                if (productOverrides) {
                  product.bgColor = productOverrides.preConfigureBg || product.bgColor;
                  product.textColor = productOverrides.preConfigureTextColor || product.textColor;
                  product.accentColor = productOverrides.preConfigureAccentColor || product.accentColor;
                }
                return (
                  <SwiperSlide key={product.id}>
                    <div
                      className={`slide-bg section-${product.theme}`}
                    style={{
                      backgroundColor: product.bgColor || undefined,
                      '--theme-text': product.textColor,
                      '--theme-accent': product.accentColor,
                      '--theme-bg': product.bgColor || '#fff'
                    }}
                  >
                    <div className="p-aura-shadow"></div>
                    <div className="p-mist-layer"></div>
                    <div className="p-accent-beam"></div>
                  </div>

                  <div className="slide-content" style={{
                    '--theme-text': product.textColor,
                    '--theme-accent': product.accentColor,
                    '--theme-bg': product.bgColor || '#fff'
                  }}>
                    <div className="product-image-container">
                      <img src={product.heroImage} alt={product.title} className="product-image" />
                    </div>
                    <div
                      className={`slide-overlay ${expandedIds.has(product.id) ? 'active' : ''}`}
                      onClick={() => setExpandedIds(new Set())}
                    ></div>
                    <div className="product-info">
                      <h2 className="product-name">
                        {product.title}
                      </h2>
                      <div className="product-desc-container">
                        <p className={`product-desc ${expandedIds.has(product.id) ? 'expanded' : ''}`}>
                          {product.shortDescription}
                        </p>
                        {product.shortDescription.length > 60 && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              const next = new Set(expandedIds);
                              if (next.has(product.id)) next.delete(product.id);
                              else next.add(product.id);
                              setExpandedIds(next);
                            }}
                            className="btn-read-more"
                          >
                            {expandedIds.has(product.id) ? 'Read Less' : 'Read More'}
                          </button>
                        )}
                      </div>
                      <div className="product-price-row flex items-center gap-3 mb-4">
                        <span className="product-price !m-0">{product.price}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            openInfoModal(product);
                          }}
                          className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-serif italic font-bold cursor-pointer bg-transparent text-inherit opacity-85 hover:opacity-100 transition-all"
                          title="View Details"
                        >
                          i
                        </button>
                      </div>
                      <div className="btn-container mt-3" style={{ width: '100%' }}>
                        <Link href={`/configure?watch=${product.id}`} className="btn-configure">
                          CONFIGURE
                        </Link>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
                );
              })}
          </Swiper>
        </div>
      </main>

      {/* ═══ SOLD CONFIGS INFO MODAL ═══ */}
      {activeModalData && (
        <div 
          onClick={closeInfoModal}
          className="info-modal-overlay show"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="info-modal-box"
          >
            <div className="info-modal-header">
              <h3 className="info-modal-title">Sold Configurations</h3>
              <button className="info-modal-close" onClick={closeInfoModal}>✕</button>
            </div>
            
            <div className="info-modal-content">
              {activeModalData.combinations && activeModalData.combinations.length > 0 ? (
                activeModalData.combinations.map((combo) => (
                  <div key={combo.id} className="info-combo-item">
                    <div className="info-combo-img-wrap">
                      <img src={combo.img} alt={`Combo ${combo.id}`} />
                    </div>
                    <div className="info-combo-details">
                      <span className="info-combo-name">{combo.name}</span>
                      <span className="info-combo-status">Sold on {combo.soldAt}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
                  No configurations have been registered yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PreConfigure;
