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

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const container = useRef(null);
  const canvasRef = useRef(null);
  const mainWatchRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWatchIndex, setActiveWatchIndex] = useState(0);
  const [videoSettings, setVideoSettings] = useState({});
  const [founderVariant, setFounderVariant] = useState(null);

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
        if (settings) {
          const videoMap = {};
          settings.forEach(s => {
            if (s.group === 'video' || s.group === 'shop_page') videoMap[s.key] = s.value;
          });
          setVideoSettings(videoMap);
          
          if (videoMap.founder_watch_id) {
            const variantRes = await fetchVariant(videoMap.founder_watch_id);
            if (variantRes.success && variantRes.data) {
                setFounderVariant(variantRes.data);
            }
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

      {/* Assembly Section */}
      <section id="mv" style={{ padding: '100px 5vw', background: '#000', color: '#fff' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '80px' }}>
          <div style={{ flex: '1 1 400px' }}>
            <div className="lbl" style={{ color: 'var(--fyl-gold)', fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600 }}>
              An Atelier Dedicated To You
            </div>
            <div className="rule" style={{ background: 'var(--fyl-gold)', width: '40px', height: '2px', marginBottom: '40px' }}></div>
            
            <div className="lbl" style={{ color: 'var(--fyl-gold)', fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600 }}>
              Assembly & Precision
            </div>
            <h2 className="hd" style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontFamily: 'Avenir, sans-serif', fontWeight: 500, marginBottom: '24px', lineHeight: 1.1 }}>
              Crafted To Your<br /><em>Demand</em>
            </h2>
            <p className="shop-bt" style={{ color: '#ccc', lineHeight: 1.8, fontSize: '16px', maxWidth: '500px' }}>
              Every component is meticulously sourced, but the final creation doesn't exist until you command it. From the casing to the dial, our watchmakers wait for your instructions.
            </p>
          </div>
          <div style={{ flex: '1 1 500px', position: 'relative' }}>
            <img src="/assets/fylex-watch-v2/hero.png" alt="The Assembly Room" style={{ width: '100%', borderRadius: '4px', filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.5))' }} />
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
            marginBottom: founderVariant ? '50px' : '0'
          }}>
            {videoSettings.founder_message || 'Welcome to our premium watch collection. Crafted with precision and passion.'}
          </div>
          
          {founderVariant && (
            <Link 
              href={`/discover?watch=${founderVariant.productId || founderVariant.product?.id || ''}`}
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '40px',
                textDecoration: 'none',
                color: '#fff',
                transition: 'transform 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
                cursor: 'pointer'
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
                fontSize: '14px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--fyl-gold)',
                marginBottom: '20px',
                fontWeight: '600'
              }}>
                The Founder's Pick
              </h3>
              <img 
                src={resolveProductImage(founderVariant.product, founderVariant) || getFileUrl(founderVariant.heroImage || founderVariant.image || founderVariant.product?.heroImage)} 
                alt={founderVariant.product?.name || founderVariant.sku}
                style={{
                  width: '250px',
                  height: '250px',
                  objectFit: 'contain',
                  margin: '0 auto 20px',
                  filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))'
                }}
                onError={(e) => { e.target.src = '/assets/Watch_1.png'; }}
              />
              <h4 style={{
                fontFamily: 'Avenir, sans-serif',
                fontSize: '24px',
                fontWeight: '500',
                marginBottom: '10px'
              }}>
                {founderVariant.product?.name || 'Watch'} - {founderVariant.sku}
              </h4>
              <div 
                className="bf"
                style={{
                  marginTop: '15px',
                  padding: '12px 24px',
                  background: 'transparent',
                  border: '1px solid var(--fyl-gold)',
                  color: 'var(--fyl-gold)',
                  letterSpacing: '0.2em'
                }}
              >
                DISCOVER TIMEPIECE
              </div>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
