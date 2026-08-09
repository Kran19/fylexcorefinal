'use client';

import React, { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import Link from 'next/link';
import { fetchProducts, fetchVariant } from '../../../lib/api';
import cmsService from '@/services/cms.service';
import { getFileUrl, resolveProductImage, getDisplayData, resolveProductBackground } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const container = useRef(null);
  const mainWatchRef = useRef(null);

  const { addToCart } = useCart();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWatchIndex, setActiveWatchIndex] = useState(0);
  const [videoSettings, setVideoSettings] = useState({});
  const [founderVariants, setFounderVariants] = useState([]);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  const handleAddToCart = async (e, variant) => {
    e.preventDefault();
    e.stopPropagation();
    const vId = variant?.id || variant?.productId;
    if (!vId) return;
    setAddingId(vId);
    try {
      await fetchVariant(vId);
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
      console.error('Failed to add Founder pick to cart:', err);
    } finally {
      setAddingId(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetchProducts();
        const rawData = res.data || (Array.isArray(res) ? res : []);
        
        const hexToRgb = (hex) => {
          if (!hex) return '196, 163, 90';
          const cleanHex = hex.replace('#', '');
          const r = parseInt(cleanHex.substring(0, 2), 16);
          const g = parseInt(cleanHex.substring(2, 4), 16);
          const b = parseInt(cleanHex.substring(4, 6), 16);
          return `${r}, ${g}, ${b}`;
        };

        const mapped = rawData.map(p => {
          const display = getDisplayData(p);
          return {
            ...p,
            ...display,
            accentRgb: hexToRgb(p.accentColor || '#c4a35a'),
            mistRgb: hexToRgb(p.mistColor || p.accentColor || '#c4a35a'),
          };
        });
        setProducts(mapped);
        
        const { data: settings } = await cmsService.getVideoSettings();
        if (settings && Array.isArray(settings)) {
          const settingMap = {};
          settings.forEach(s => {
            if (s.key) settingMap[s.key] = s.value;
          });
          setVideoSettings(settingMap);
          
          const watchIdsStr = settingMap.founder_watch_ids || settingMap.founder_watch_id;
          if (watchIdsStr) {
            const ids = watchIdsStr.split(',').map(id => id.trim()).filter(Boolean);
            const fetchPromises = ids.map(id => fetchVariant(id));
            const results = await Promise.all(fetchPromises);
            const activeVariants = results
              .filter(res => res && (res.success !== false) && (res.data || res.id))
              .map(res => res.data || res);
            setFounderVariants(activeVariants);
          }
        }
      } catch (err) {
        console.error('Failed to load about data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const displayProducts = products;

  // Lenis Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(raf);
    };
  }, []);

  useGSAP(() => {
    const reveal = (sel, xFrom) => {
      gsap.utils.toArray(sel).forEach((el) => {
        gsap.fromTo(el,
          { opacity: 0, x: xFrom || 0, y: xFrom ? 0 : 28 },
          { opacity: 1, x: 0, y: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' } }
        );
      });
    };
    reveal('.r0'); reveal('.rl', -32); reveal('.rr', 32);

    gsap.utils.toArray('.r-hero, .hd').forEach((el, i) => {
      gsap.fromTo(el,
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 1.8, ease: 'power4.out', delay: 0.2 + (i * 0.1), scrollTrigger: { trigger: el, start: 'top 85%' } }
      );
    });

    gsap.utils.toArray('.r-dial').forEach((el, i) => {
      gsap.fromTo(el, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 1.5, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 80%' },
        delay: i * 0.2
      });
    });

    gsap.to('.video-overlay', {
      y: '+=15',
      duration: 3,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });
  }, { scope: container });

  return (
    <div ref={container} className="shop-page-wrapper">
      <style>{`
        .shop-page-wrapper {
          background: #000000;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
        }
        .yt-bg-wrap { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .hvideo {
          position: absolute; top: 50%; left: 50%; width: 100vw; height: 56.25vw;
          min-height: 100vh; min-width: 177.77vh; transform: translate(-50%, -50%);
          opacity: 1; border: none; pointer-events: none;
          object-fit: cover;
        }
        .hov { position: absolute; inset: 0; background: linear-gradient(100deg, rgba(0,0,0,.6) 0%, rgba(0,0,0,.35) 40%, transparent 100%); }
        .video-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center;
          text-align: center; z-index: 10; color: #ffffff; padding: 0 24px;
        }
        .video-overlay h1, .video-overlay h2 {
          font-family: 'Avenir', 'Neue Haas Grotesk Display Pro', 'Inter', sans-serif; font-size: clamp(36px, 6vw, 80px); font-weight: 500; line-height: 1.1; margin-bottom: 24px; letter-spacing: -0.01em; text-shadow: 0 4px 16px rgba(0,0,0,0.6);
        }
        .video-overlay p {
          max-width: 600px; font-size: clamp(15px, 1.3vw, 18px); font-weight: 400; line-height: 1.8; letter-spacing: 0.02em; opacity: 0.95; text-shadow: 0 2px 10px rgba(0,0,0,0.8);
          color: #cccccc;
        }
        #dial { background: #000000; padding: 100px 8vw; overflow: hidden; color: #ffffff; }
        .dwrap { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        .dimg-col { position: relative; }
        .dimgf { position: relative; filter: drop-shadow(0 30px 60px rgba(0,0,0,.3)); }
        .dimgf::after { content: ''; position: absolute; inset: 20px; border: 1px solid rgba(255,255,255,.2); pointer-events: none; }
        .dimgf img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; border-radius: 4px; }
        .dcap { position: absolute; bottom: 0; left: 0; right: 0; padding: 28px 28px 32px; background: linear-gradient(to top, rgba(0,0,0,.8), transparent); border-bottom-left-radius: 4px; border-bottom-right-radius: 4px; }
        .dcap span { font-size: 11px; letter-spacing: .3em; text-transform: uppercase; color: rgba(255,255,255,.9); font-weight: 500;}
        .dtxt .hd { color: #ffffff; font-family: 'Avenir', 'Neue Haas Grotesk Display Pro', 'Inter', sans-serif; font-size: clamp(32px, 4.5vw, 56px); line-height: 1.1; letter-spacing: -0.01em; margin-bottom: 24px; font-weight: 500; }
        .dtxt .hd em { color: var(--fyl-gold); font-weight: 400; font-style: italic; }
        .dtxt .lbl { color: var(--fyl-gold); font-size: 12px; letter-spacing: 0.35em; text-transform: uppercase; margin-bottom: 12px; font-weight: 600; display: block; }
        .dtxt .rule { background: var(--fyl-gold); width: 40px; height: 2px; margin-bottom: 24px; }
        .bf { 
          display: inline-block; 
          padding: 12px 24px; 
          text-align: center; 
          font-size: 10px; 
          letter-spacing: .15em; 
          text-transform: uppercase; 
          font-family: 'Inter', sans-serif; 
          font-weight: 700; 
          background: #1a1a1a; 
          border: 1px solid #1a1a1a; 
          color: #fff; 
          cursor: pointer; 
          transition: all .4s cubic-bezier(0.23, 1, 0.32, 1); 
          border-radius: 999px; 
          text-decoration: none; 
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .bf:hover, .bf:active { 
          background: var(--fyl-gold) !important;
          color: #000000 !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-color: var(--fyl-gold) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(196, 163, 90, 0.4);
        }
        .shop-bt { color: #cccccc; line-height: 1.85; letter-spacing: 0.02em; font-size: 16px; font-weight: 400; }
        @media (max-width: 1024px) {
          #dial { padding: 80px 5vw; }
          .dwrap { gap: 40px; }
          #mv { padding: 80px 5vw; }
        }
        @media (max-width: 768px) {
          #dial { padding: 60px 5vw; }
          .dwrap { grid-template-columns: 1fr; gap: 40px; }
        }
      `}</style>
      {/* Hero Video Section */}
      <section id="hero-video" style={{ height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
        <div className="yt-bg-wrap">
          {videoSettings.shop_hero_video_is_iframe === 'true' ? (
            <iframe className="hvideo" src={videoSettings.shop_hero_video} frameBorder="0" allow="autoplay; fullscreen" allowFullScreen></iframe>
          ) : (
            <video className="hvideo" src={getFileUrl(videoSettings.shop_hero_video) || "/assets/Fylex.mp4"} autoPlay loop muted playsInline></video>
          )}
        </div>
        <div className="hov"></div>
        <div className="video-overlay">
          <h1 className="r-hero">{videoSettings.shop_hero_video_title || "FYLEX"}</h1>
          <p className="r-hero">{videoSettings.shop_hero_video_subtitle || "Wear It Your Way."}</p>
        </div>
      </section>

      {/* Middle Video Section */}
      <section id="dial-video" style={{ height: '120vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
        <div className="yt-bg-wrap">
          {videoSettings.shop_deepsea_video_is_iframe === 'true' ? (
            <iframe className="hvideo" src={videoSettings.shop_deepsea_video} frameBorder="0" allow="autoplay; fullscreen" allowFullScreen></iframe>
          ) : (
            <video className="hvideo" src={getFileUrl(videoSettings.shop_deepsea_video) || "/Watch-iframe-2.mp4"} autoPlay loop muted playsInline></video>
          )}
        </div>
        <div className="hov" style={{ background: 'rgba(0,0,0,0.35)' }}></div>
        <div className="video-overlay">
          <h2 className="r-dial" dangerouslySetInnerHTML={{ __html: "It's your <br /><em>time</em>" }}></h2>
          <p className="r-dial">wear your choice.</p>
        </div>
      </section>

      {/* Dynamic Interstitial Section */}
      <section id="dial">
        <div className="dwrap">
          <div className="dimg-col rl">
            <div className="dimgf">
              <img src={getFileUrl(videoSettings.shop_dial_image) || "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=900&q=85"} alt="Fylex Dial" loading="lazy" />
              <div className="dcap"><span>{videoSettings.shop_dial_caption || "The Atlas Legacy"}</span></div>
            </div>
          </div>
          <div className="dtxt">
            <h2 className="hd r0" dangerouslySetInnerHTML={{ __html: videoSettings.shop_dial_title || 'We didn\'t invent the watch.<br /><em>We perfected the way you buy it.</em>' }}></h2>
            <p className="shop-bt r0">{videoSettings.shop_dial_desc || "For years, luxury meant accepting a pre-designed vision. FYLEX exists to bridge the gap between masterful assembly and personal style."}</p>
          </div>
        </div>
      </section>



      {/* Founder Section */}
      <section 
        className="founder-section" 
        style={{
          backgroundColor: '#000',
          color: '#fff',
          padding: '80px 20px',
          textAlign: 'center',
          borderTop: '1px solid #222'
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: '2rem', 
            textTransform: 'uppercase', 
            letterSpacing: '4px', 
            marginBottom: '30px',
            fontWeight: '300'
          }}>
            From The Founder
          </h2>
          
          <div style={{
            fontSize: '1.2rem',
            lineHeight: '1.8',
            color: '#ccc',
            fontWeight: '300',
            fontStyle: 'italic',
            whiteSpace: 'pre-wrap',
            marginBottom: founderVariants.length > 0 ? '50px' : '0'
          }}>
            {videoSettings.founder_message || 'Welcome to our premium watch collection. Crafted with precision and passion.'}
          </div>
          
          {founderVariants.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center', marginTop: '40px' }}>
              {founderVariants.map(variant => {
                const vId = variant?.id || variant?.productId;
                const isAdding = addingId === vId;
                const isAdded = addedIds.has(vId);
                const targetWatchId = variant.productId || variant.product?.id || '';
                return (
                  <div 
                    key={variant.id}
                    style={{
                      display: 'inline-block',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      padding: '36px 24px',
                      color: '#fff',
                      transition: 'transform 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
                      width: '320px',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                      e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <h3 style={{
                      fontSize: '12px',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: '#999B98',
                      marginBottom: '16px',
                      fontWeight: '600'
                    }}>
                      The Founder's Pick
                    </h3>
                    <img 
                      src={resolveProductImage(variant.product || variant, variant) || getFileUrl(variant.image || variant.heroImage || (variant.variantImages?.[0]?.media?.fileName ? `/uploads/${variant.variantImages[0].media.fileName}` : '')) || '/assets/fylex-watch-v2/premium.png'} 
                      alt={variant.product?.name || variant.name || variant.sku || "Founder's Pick"}
                      style={{
                        width: '180px',
                        height: '180px',
                        objectFit: 'contain',
                        margin: '0 auto 16px',
                        filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))'
                      }}
                      onError={(e) => { e.target.src = '/assets/fylex-watch-v2/premium.png'; }}
                    />
                    <h4 style={{
                      fontFamily: 'Avenir, sans-serif',
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#ffffff',
                      marginBottom: '6px',
                      height: '36px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: '1.3'
                    }}>
                      {variant.product?.name || 'Watch'}
                    </h4>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '800',
                      color: '#ffffff',
                      marginBottom: '16px',
                      letterSpacing: '0.05em'
                    }}>
                      {variant.formattedPrice || (variant.price ? `₹${Number(variant.price).toLocaleString('en-IN')}` : (variant.product?.formattedPrice || (variant.product?.basePrice ? `₹${Number(variant.product.basePrice).toLocaleString('en-IN')}` : '₹5,999')))}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'center', width: '100%' }}>
                      <button 
                        onClick={(e) => handleAddToCart(e, variant)}
                        disabled={isAdding}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          background: isAdded ? '#008767' : '#ffffff',
                          border: isAdded ? '1px solid #008767' : '1px solid #ffffff',
                          color: isAdded ? '#ffffff' : '#000000',
                          fontWeight: '800',
                          letterSpacing: '0.12em',
                          cursor: 'pointer',
                          borderRadius: '999px',
                          fontSize: '11px',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {isAdding ? 'ADDING...' : isAdded ? 'ADDED ✓' : 'ADD TO CART'}
                      </button>
                      <Link 
                        href={`/explore?watch=${targetWatchId}&variant=${variant.id}`}
                        style={{
                          flex: 1,
                          padding: '12px 14px',
                          background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.4)',
                          color: '#ffffff',
                          fontWeight: '700',
                          letterSpacing: '0.12em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '999px',
                          fontSize: '11px',
                          textDecoration: 'none',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        DISCOVER
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
