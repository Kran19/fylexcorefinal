// @ts-nocheck
"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { fetchFeaturedProducts } from '@/lib/api';
import cmsService from '@/services/cms.service';
import { getFileUrl, getDisplayData } from '@/lib/utils';
import { ProductSkeleton } from '@/components/ui/Skeleton';

const HomeFeaturedSwiper = dynamic(() => import('@/components/HomeFeaturedSwiper'), {
  ssr: false,
});

const injectLogo = (text: string) => {
  if (!text) return '';
  return text.replace(
    /(Fylexx|Fylex|FYLEXX|FYLEX)/gi,
    '<img src="/fylex_logo_name.webp" alt="$1" width="913" height="110" loading="lazy" decoding="async" style="height: 0.7em; width: auto; display: inline-block; vertical-align: middle; transform: translateY(-0.1em); filter: invert(1);" />'
  );
};

// Clean, reliable local & optimized fallback gallery (zero 403/CORS broken URLs)
const fallbackGallery = [
  { src: '/Rim.webp', alt: 'FYLEX Atelier' },
  { src: '/Watch_1.webp', alt: 'FYLEX Horology' },
  { src: 'https://images.unsplash.com/photo-1517502474097-f9b30659dadb?auto=format&fit=crop&q=75&w=480', alt: 'Atelier Craft' },
  { src: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&q=75&w=480', alt: 'Chronograph Detail' },
  { src: 'https://images.unsplash.com/photo-1585123334904-845d60e97b29?auto=format&fit=crop&q=75&w=480', alt: 'Precision Movement' },
  { src: '/Rim.webp', alt: 'FYLEX Dial' },
  { src: '/Watch_1.webp', alt: 'FYLEX Case' },
  { src: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=75&w=480', alt: 'Timepiece Profile' },
  { src: 'https://images.unsplash.com/photo-1517502474097-f9b30659dadb?auto=format&fit=crop&q=75&w=480', alt: 'Watchmaking' },
  { src: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&q=75&w=480', alt: 'FYLEX Signature' },
];

const DEFAULT_HOME_SECTIONS: Record<string, boolean> = {
  s1: true,
  s2: true,
  s3: true,
  s4: true,
  featured: true,
  gallery: true,
};

function buildGalleryColumns(items: any[]) {
  const cols = [];
  let idx = 0;
  let big = true;
  while (idx < items.length) {
    const size = big ? 3 : 2;
    const col = items.slice(idx, idx + size);
    if (col.length) cols.push(col);
    idx += size;
    big = !big;
  }
  return cols;
}

const GalleryCarousel = ({ items, active }: { items?: any[]; active: boolean }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const posRef = useRef<number>(0);
  const velRef = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const dragStartX = useRef<number>(0);
  const dragStartPos = useRef<number>(0);
  const lastDragX = useRef<number>(0);
  const lastDragTime = useRef<number>(0);
  const halfWidthRef = useRef<number>(0);
  const AUTO_SPEED = 0.6;

  useEffect(() => {
    if (!active) return;
    const measure = () => {
      if (trackRef.current) {
        halfWidthRef.current = trackRef.current.scrollWidth / 2;
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(measure));
    window.addEventListener('resize', measure, { passive: true });
    return () => window.removeEventListener('resize', measure);
  }, [active, items]);

  const tick = useCallback(() => {
    const half = halfWidthRef.current;

    if (!isDragging.current) {
      velRef.current *= 0.92;
      if (Math.abs(velRef.current) < 0.05) velRef.current = 0;
    }

    posRef.current -= AUTO_SPEED + Math.max(0, velRef.current);

    if (half > 0 && Math.abs(posRef.current) >= half) {
      posRef.current += half;
    }

    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${posRef.current}px, 0, 0)`;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!active) return;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [active, tick]);

  const onPointerDown = useCallback((e: any) => {
    isDragging.current = true;
    const clientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX ?? 0;
    dragStartX.current = clientX;
    dragStartPos.current = posRef.current;
    lastDragX.current = clientX;
    lastDragTime.current = performance.now();
    velRef.current = 0;
    if (e.pointerId != null) {
      (trackRef.current as any)?.setPointerCapture?.(e.pointerId);
    }
  }, []);

  const onPointerMove = useCallback((e: any) => {
    if (!isDragging.current) return;
    const clientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX ?? 0;
    const delta = clientX - dragStartX.current;
    const clampedDelta = Math.min(0, delta);
    posRef.current = dragStartPos.current + clampedDelta;

    const now = performance.now();
    const dt = now - lastDragTime.current;
    if (dt > 0) {
      const rawVel = ((lastDragX.current - clientX) / dt) * (1000 / 60);
      velRef.current = Math.max(0, rawVel);
    }
    lastDragX.current = clientX;
    lastDragTime.current = now;
  }, []);

  const onPointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const sourceItems = items && items.length > 0 ? items : fallbackGallery;
  let safeItems = [...sourceItems];

  while (safeItems.length < 20) {
    safeItems = [...safeItems, ...sourceItems];
  }

  while (safeItems.length % 5 !== 0 && safeItems.length % 5 !== 3) {
    safeItems.push(sourceItems[safeItems.length % sourceItems.length]);
  }

  const cols = buildGalleryColumns(safeItems);
  const allCols = [...cols, ...cols];

  return (
    <div
      className="fylex-gallery-viewport"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onTouchStart={(e: any) => onPointerDown({ clientX: e.touches[0].clientX })}
      onTouchMove={(e: any) => onPointerMove({ clientX: e.touches[0].clientX })}
      onTouchEnd={onPointerUp}
    >
      <div className="fylex-gallery-track" ref={trackRef}>
        {allCols.map((col, ci) => (
          <div className="fylex-gallery-col" key={ci}>
            {col.map((g, i) => (
              <div className="fylex-gallery-item" key={i}>
                <img
                  src={g.src}
                  alt={g.alt || 'FYLEX Atelier'}
                  width={240}
                  height={260}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  style={
                    g.rotation
                      ? {
                          transform: `rotate(${g.rotation}deg) ${g.rotation % 180 !== 0 ? 'scale(1.35)' : 'scale(1)'}`,
                          transition: 'transform 0.3s ease',
                        }
                      : undefined
                  }
                  onError={(e: any) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/Rim.webp';
                  }}
                />
                <div className="fylex-overlay" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export interface HomeInitialData {
  hydratedFromServer?: boolean;
  featuredProducts?: any[];
  banners?: any[];
  videoSettings?: Record<string, any>;
  homeSections?: Record<string, boolean>;
  communityImages?: any[];
}

export default function HomeClient({ initialData }: { initialData?: HomeInitialData }) {
  const hasSSR = Boolean(initialData?.hydratedFromServer);

  const [featuredProducts, setFeaturedProducts] = useState<any[]>(initialData?.featuredProducts || []);
  const [loadingFeatured, setLoadingFeatured] = useState(!hasSSR);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [videoSettings, setVideoSettings] = useState<Record<string, any>>(initialData?.videoSettings || {});
  const [homeSections, setHomeSections] = useState<Record<string, boolean>>(
    initialData?.homeSections && Object.keys(initialData.homeSections).length > 0
      ? initialData.homeSections
      : DEFAULT_HOME_SECTIONS
  );
  const [banners, setBanners] = useState<any[]>(initialData?.banners || []);
  const [communityImages, setCommunityImages] = useState<any[]>(initialData?.communityImages || []);

  // Progressive media states so hero LCP renders in <1.5s without multi-MB video blocking
  const [shouldMountHeroVideo, setShouldMountHeroVideo] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [shouldMountS4Video, setShouldMountS4Video] = useState(false);
  const [isFeaturedVisible, setIsFeaturedVisible] = useState(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);

  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const s4Ref = useRef<HTMLDivElement | null>(null);
  const featuredWrapRef = useRef<HTMLDivElement | null>(null);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Only fetch on the client when SSR initialData wasn't available (e.g. local dev without internal backend)
  useEffect(() => {
    if (hasSSR) return;
    let cancelled = false;

    const loadParallel = async () => {
      const [featRes, bannerRes, videoRes, sectionRes, commRes] = await Promise.allSettled([
        fetchFeaturedProducts(),
        cmsService.getBanners(),
        cmsService.getVideoSettings(),
        cmsService.getHomeSections(),
        cmsService.getCommunityImages(),
      ]);

      if (cancelled) return;

      if (featRes.status === 'fulfilled') {
        const data = featRes.value?.data || featRes.value || [];
        setFeaturedProducts(Array.isArray(data) ? data : []);
      }
      setLoadingFeatured(false);

      if (bannerRes.status === 'fulfilled') {
        const bData = bannerRes.value?.data ?? bannerRes.value;
        setBanners(Array.isArray(bData) ? bData : []);
      }

      if (videoRes.status === 'fulfilled') {
        const rawRes: any = videoRes.value;
        const settingsList = Array.isArray(rawRes?.data)
          ? rawRes.data
          : Array.isArray(rawRes?.data?.data)
          ? rawRes.data.data
          : Array.isArray(rawRes)
          ? rawRes
          : [];
        if (settingsList.length > 0) {
          const videoMap: Record<string, any> = {};
          settingsList.forEach((s: any) => {
            if (s.key) videoMap[s.key] = s.value;
          });
          setVideoSettings(videoMap);
        }
      }

      if (sectionRes.status === 'fulfilled') {
        const hSections = sectionRes.value?.data ?? sectionRes.value;
        const sectionList = Array.isArray(hSections)
          ? hSections
          : Array.isArray(hSections?.data)
          ? hSections.data
          : [];
        if (sectionList.length > 0) {
          const sectionMap: Record<string, boolean> = {};
          sectionList.forEach((s: any) => {
            const isVis =
              s.isActive === true ||
              s.isActive === 'true' ||
              s.isActive === 1 ||
              s.isActive === '1' ||
              s.status === true ||
              s.status === 'true' ||
              s.status === 1 ||
              s.status === '1';
            sectionMap[s.type] = isVis;
            if (s.type === 'home_s1' || s.type === 's1' || s.type === 'Section 1') sectionMap.s1 = isVis;
            if (s.type === 'home_s2' || s.type === 's2' || s.type === 'Section 2') sectionMap.s2 = isVis;
            if (s.type === 'home_s3' || s.type === 's3' || s.type === 'Section 3') sectionMap.s3 = isVis;
            if (s.type === 'home_s4' || s.type === 's4' || s.type === 'Section 4') sectionMap.s4 = isVis;
          });
          setHomeSections(sectionMap);
        }
      }

      if (commRes.status === 'fulfilled') {
        const rawC = commRes.value?.data ?? commRes.value;
        const cImages = Array.isArray(rawC) ? rawC : [];
        if (cImages.length > 0) {
          setCommunityImages(
            cImages.map((img: any) => ({
              src: getFileUrl(img.image || img.imageUrl || img.image_url || img.url),
              alt: img.title || 'The FYLEX World',
              rotation: Number(img.rotation) || 0,
            }))
          );
        }
      }
    };

    loadParallel();
    return () => {
      cancelled = true;
    };
  }, [hasSSR]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Attach Hero background video smoothly on first user interaction or post-load idle on fast connections
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let activated = false;

    const activate = () => {
      if (activated) return;
      activated = true;
      setShouldMountHeroVideo(true);
      cleanup();
    };

    const events = ['pointermove', 'touchstart', 'scroll', 'keydown', 'click'];
    const cleanup = () => {
      events.forEach((ev) => window.removeEventListener(ev, activate));
    };
    events.forEach((ev) => window.addEventListener(ev, activate, { passive: true, once: true }));

    // Respect Save-Data / slow cellular connections; on fast connections also auto-start after load settles
    const conn = (navigator as any).connection;
    const isConstrainedNetwork =
      Boolean(conn?.saveData) ||
      conn?.effectiveType === 'slow-2g' ||
      conn?.effectiveType === '2g' ||
      conn?.effectiveType === '3g';

    let timer: any = null;
    if (!isConstrainedNetwork && window.innerWidth > 768) {
      timer = setTimeout(activate, 1800);
    } else if (!isConstrainedNetwork) {
      timer = setTimeout(activate, 3800);
    }

    return () => {
      cleanup();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Lazy-mount below-the-fold Section 4 video, Featured Swiper, and Gallery Marquee via IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setShouldMountS4Video(true);
      setIsFeaturedVisible(true);
      setIsGalleryVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target === s4Ref.current) {
            setShouldMountS4Video(true);
            obs.unobserve(entry.target);
          } else if (entry.target === featuredWrapRef.current) {
            setIsFeaturedVisible(true);
            obs.unobserve(entry.target);
          } else if (entry.target === galleryRef.current) {
            setIsGalleryVisible(true);
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '500px 0px' }
    );

    if (s4Ref.current) obs.observe(s4Ref.current);
    if (featuredWrapRef.current) obs.observe(featuredWrapRef.current);
    if (galleryRef.current) obs.observe(galleryRef.current);

    return () => obs.disconnect();
  }, [homeSections]);

  // Dynamically load GSAP ScrollTrigger after first paint so initial JS hydration has near-zero TBT
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let ctx: any = null;
    let refreshTimer: any = null;
    let cancelled = false;

    const initScrollAnimations = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled || !containerRef.current) return;

      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const sections = gsap.utils.toArray('.section');
        sections.forEach((section: any) => {
          const card = section.querySelector('.card');
          if (card) {
            ScrollTrigger.create({
              trigger: section,
              start: 'top 75%',
              end: 'bottom 25%',
              onEnter: () => card.classList.add('in'),
              onEnterBack: () => card.classList.add('in'),
            });
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
              card.classList.add('in');
            }
          }
        });

        const wrap = document.querySelector('.dial-parallax-wrapper');
        const revealLayer = document.querySelector('.dial-layer-reveal');
        const sweepLine = document.querySelector('.dial-sweep-line');
        const card1 = document.querySelector('.dial-card-1');
        const card2 = document.querySelector('.dial-card-2');

        if (wrap && revealLayer) {
          gsap.set(revealLayer, { clipPath: 'inset(100% 0% 0% 0%)' });
          if (sweepLine) gsap.set(sweepLine, { top: '100%', opacity: 0 });
          if (card1) gsap.set(card1, { opacity: 1, y: 0 });
          if (card2) gsap.set(card2, { opacity: 0, y: 40 });

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: wrap,
              start: 'top top',
              end: '+=160%',
              pin: true,
              pinSpacing: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          tl.to(
            revealLayer,
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              ease: 'none',
              duration: 1,
            },
            0
          );

          if (sweepLine) {
            tl.to(
              sweepLine,
              {
                top: '0%',
                opacity: 1,
                ease: 'none',
                duration: 1,
              },
              0
            );
          }

          if (card1) {
            tl.to(
              card1,
              {
                opacity: 0,
                y: -40,
                ease: 'power1.inOut',
                duration: 0.35,
              },
              0.1
            );
          }

          if (card2) {
            tl.to(
              card2,
              {
                opacity: 1,
                y: 0,
                ease: 'power1.inOut',
                duration: 0.4,
              },
              0.5
            );
          }
        }
      }, containerRef);

      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
    };

    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(() => initScrollAnimations(), { timeout: 1000 });
      return () => {
        cancelled = true;
        (window as any).cancelIdleCallback?.(id);
        if (refreshTimer) clearTimeout(refreshTimer);
        ctx?.revert();
      };
    } else {
      const t = setTimeout(initScrollAnimations, 120);
      return () => {
        cancelled = true;
        clearTimeout(t);
        if (refreshTimer) clearTimeout(refreshTimer);
        ctx?.revert();
      };
    }
  }, [homeSections, banners]);

  const section2Banner = banners.find(
    (b: any) => b.type === 'home_s2' || b.position === 'home_s2' || b.position === 'Section 2'
  );
  const section3Banner = banners.find(
    (b: any) => b.type === 'home_s3' || b.position === 'home_s3' || b.position === 'Section 3'
  );

  const s2Bg =
    section2Banner?.image && typeof section2Banner.image === 'string' && section2Banner.image.trim() !== ''
      ? getFileUrl(section2Banner.image)
      : '/Rim.webp';

  const s3Bg =
    section3Banner?.image && typeof section3Banner.image === 'string' && section3Banner.image.trim() !== ''
      ? getFileUrl(section3Banner.image)
      : '/Watch_1.webp';

  const heroVideoSrc = getFileUrl(videoSettings.home_hero_video) || '/assets/Fylexxx.mp4';
  const legacyVideoSrc = getFileUrl(videoSettings.home_legacy_video) || '/assets/Fylexx.mp4';

  return (
    <div className="v1-home" ref={containerRef}>
      <style>{`
        .v1-home { background: #F9F9F7; position: relative; }

        .dial-parallax-wrapper {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: #000000;
          z-index: 2;
        }

        .dial-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100vh;
          overflow: hidden;
        }

        .dial-layer-base { z-index: 1; }
        .dial-layer-reveal {
          z-index: 2;
          clip-path: inset(100% 0% 0% 0%);
          will-change: clip-path;
        }

        .dial-watch-img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          pointer-events: none;
          -webkit-user-drag: none;
          user-select: none;
        }

        .dial-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.35) 100%);
          pointer-events: none;
        }

        .dial-sweep-line {
          display: none;
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.7) 20%, rgba(255, 255, 255, 0.95) 50%, rgba(212, 175, 55, 0.7) 80%, transparent 100%);
          box-shadow: 0 0 14px 2px rgba(212, 175, 55, 0.5), 0 0 28px 4px rgba(255, 255, 255, 0.25);
          pointer-events: none;
          z-index: 5;
        }

        .dial-card-container {
          position: absolute;
          top: clamp(140px, 22vh, 260px);
          left: 0;
          right: 0;
          bottom: auto;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 0;
          pointer-events: none;
          z-index: 10;
        }

        .dial-card-container .card {
          pointer-events: auto;
          opacity: 1 !important;
          transform: none !important;
          padding: 0 20px !important;
          margin: 0 !important;
        }

        .dial-card-container .label {
          font-size: clamp(1.15rem, 2.2vw, 1.45rem);
          font-weight: 600;
          letter-spacing: 0.4em;
          margin-bottom: 0 !important;
        }

        .dial-card-1 { opacity: 1; }
        .dial-card-2 { opacity: 0; }

        .section {
          height: 100vh; min-height: 500px; width: 100%;
          position: relative;
          display: flex; align-items: center; justify-content: center;
          padding-left: 0;
          overflow: hidden;
          background-size: cover; background-position: center; background-repeat: no-repeat;
        }
        .s1 {
          position: sticky;
          top: 0;
          z-index: 1;
          background: radial-gradient(circle at 50% 45%, #5c5c59 0%, #2f2f2d 55%, #161413 100%);
        }
        .s4 {
          position: sticky;
          top: 0;
          z-index: 4;
          background: radial-gradient(circle at 50% 50%, #2a2826 0%, #11100f 100%);
        }
        .s5, .featured-grid-wrap {
          position: relative; z-index: 5; background: #fff;
          border-top-left-radius: 32px; border-top-right-radius: 32px;
          box-shadow: 0 -30px 60px rgba(0,0,0,0.6);
        }

        .section::before { content: ''; position: absolute; inset: 0; z-index: 0; }
        .s1::before { background: linear-gradient(135deg, rgba(10,8,4,0), rgba(40,28,10,.40)); }
        .s1::after, .s4::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.4));
          z-index: 1;
        }

        /* ── Featured Grid Section ── */
        .featured-title {
          font-family: 'Avenir', 'Neue Haas Grotesk Display Pro', var(--font-inter), 'Inter', sans-serif;
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          font-weight: 400;
          color: #111;
          letter-spacing: 0.03em;
          margin: 0;
        }
        .featured-title em {
          font-style: italic;
          color: #a8841a;
        }
        .featured-subtitle {
          font-family: var(--font-inter), 'Inter', sans-serif;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #595959;
          margin-bottom: 8px;
        }
        .featured-grid-wrap {
          display: flex; flex-direction: column;
          padding: 60px 0 40px !important;
          margin: 0 auto !important;
          width: 100%;
          max-width: 1920px;
          height: auto !important;
          min-height: auto;
          border-radius: 0;
          position: relative;
          z-index: 5;
          overflow: visible;
          box-sizing: border-box;
          background: #fff;
        }
        .featured-grid-header {
          padding: 0 4% 2rem;
          text-align: center;
          width: 100%;
        }
        .featured-container {
          width: 100%;
          height: 600px;
          display: block;
          position: relative;
          overflow: hidden;
        }
        .featured-swiper { width: 100%; height: 100%; }
        .featured-item-v2 {
          position: relative; overflow: hidden;
          background: #f5f5f5;
          height: 580px;
          width: 100%;
        }
        .featured-img-v2 {
          position: absolute;
          top: 48%;
          left: 50%;
          transform: translate(-50%, -52%);
          width: auto;
          max-width: 70%;
          height: 68%;
          object-fit: contain;
          padding: 0;
          z-index: 1;
          mix-blend-mode: multiply;
          transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .featured-item-v2:hover .featured-img-v2 {
          transform: translate(-50%, -52%) scale(1.05);
        }

        .featured-content {
          position: absolute; bottom: 80px; left: 48px;
          z-index: 2; color: #fff;
          max-width: 80%;
        }
        .f-label {
          font-family: var(--font-inter), 'Inter', sans-serif; font-size: 0.85rem;
          font-weight: 500;
          opacity: 0.9;
        }
        .f-title {
          font-family: var(--font-inter), 'Inter', sans-serif; font-size: 1.6rem;
          font-weight: 600;
          line-height: 1.2;
        }
        .f-shop-btn {
          background: #1a1a1a; color: #fff !important;
          padding: 8px 16px; border-radius: 999px;
          font-size: 10px; font-weight: 700;
          text-decoration: none; border: 1px solid #1a1a1a; cursor: pointer;
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
          display: inline-block;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .f-shop-btn:hover, .f-shop-btn:active {
          background: #ffffff !important;
          color: #000000 !important;
          border-color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        .featured-swiper .swiper-pagination {
          position: absolute !important;
          bottom: 20px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: auto !important;
          z-index: 10;
          display: flex !important;
          justify-content: center;
          gap: 12px;
        }
        .featured-swiper .swiper-pagination-bullet {
          width: 40px;
          height: 4px;
          background: #d1d5db;
          border-radius: 2px;
          opacity: 1;
          margin: 0 !important;
          transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .featured-swiper .swiper-pagination-bullet-active {
          width: 100px;
          background: #1a1a1a;
        }

        @media (max-width: 768px) {
          .featured-grid-wrap {
            padding: 0 !important;
            margin: 0 !important;
            width: 100%; height: auto;
            min-height: 60vh;
            border-radius: 0;
          }
          .featured-grid-header { padding: 40px 24px 24px; text-align: center; }
          .featured-title { font-size: 2.2rem; }
          .featured-container { display: block; height: 410px !important; }
          .featured-item-v2 { height: 410px !important; border-radius: 0; position: relative !important; overflow: hidden !important; }
          .featured-img-v2 {
            position: absolute !important;
            top: 10px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: auto !important;
            max-width: 85% !important;
            height: 230px !important;
            object-fit: contain !important;
            padding: 0 !important;
            transition: none !important;
            pointer-events: none !important;
            -webkit-user-drag: none !important;
          }
          .featured-item-v2:hover .featured-img-v2,
          .featured-item-v2:active .featured-img-v2,
          .featured-item-v2:focus .featured-img-v2 {
            transform: translateX(-50%) !important;
          }
          .featured-content {
            position: absolute !important;
            bottom: 42px !important;
            left: 16px !important;
            right: 16px !important;
            max-width: calc(100% - 32px) !important;
            z-index: 5 !important;
          }
          .featured-swiper .swiper-pagination { bottom: 10px !important; z-index: 10 !important; }
          .f-label { font-size: 0.65rem !important; line-height: 1.2 !important; margin-bottom: 2px !important; opacity: 0.85 !important; }
          .f-title { font-size: 1.15rem !important; line-height: 1.1 !important; font-weight: 700 !important; margin-bottom: 2px !important; }
          .f-price { font-size: 0.8rem !important; font-weight: 600 !important; margin: 2px 0 6px !important; }
          .f-shop-btn {
            padding: 6px 18px !important;
            font-size: 0.62rem !important;
            letter-spacing: 0.12em !important;
            font-weight: 700 !important;
            border-radius: 999px !important;
            display: inline-block !important;
            border: 1px solid #1a1a1a !important;
            margin-top: 2px !important;
          }
        }

        .s1, .s4 { padding: 0 !important; overflow: hidden; position: relative; }

        .video-container {
          position: absolute; top: 50%; left: 50%;
          width: 100vw; height: 100vh;
          transform: translate(-50%, -50%);
          pointer-events: none; overflow: hidden;
        }
        .video-container video, .video-container .hero-poster-img {
          position: absolute; top: 50%; left: 50%;
          min-width: 100%; min-height: 100%;
          width: 100%; height: 100%;
          transform: translate(-50%, -50%);
          object-fit: cover;
        }

        .hero-center {
          position: absolute; inset: 0; z-index: 10;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 0 40px;
        }
        .hero-subtitle {
          font-family: 'Avenir', 'Neue Haas Grotesk Display Pro', var(--font-inter), 'Inter', sans-serif !important;
          font-size: clamp(1.1rem, 2.8vw, 1.9rem) !important;
          font-weight: 400 !important; color: #ededed !important;
          margin-bottom: 1.5rem !important; line-height: 1.2;
          letter-spacing: 0.22em !important;
          text-shadow: 0 2px 15px rgba(0,0,0,0.5);
        }
        .cta-button {
          background: #1a1a1a;
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          color: #fff; padding: 8px 16px;
          border-radius: 999px; font-size: 10px;
          font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.15em;
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); cursor: pointer;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          text-decoration: none;
          display: inline-block;
        }
        .cta-button:hover, .cta-button:active {
          background: #ffffff !important;
          color: #000000 !important;
          border-color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        .card {
          position: relative; z-index: 1; text-align: center;
          padding: clamp(32px, 6vw, 64px) 24px;
          max-width: min(640px, 92vw); width: 100%;
          opacity: 0; transform: translateX(-30px);
          transition: opacity 0.7s cubic-bezier(0.2,0,0.2,1),
                      transform 0.7s cubic-bezier(0.2,0,0.2,1);
          margin: 0 auto;
        }
        .card.in { opacity: 1; transform: translateX(0); }
        .card h1, .card h2 {
          font-family: 'Avenir', 'Neue Haas Grotesk Display Pro', var(--font-inter), 'Inter', sans-serif !important;
          font-size: clamp(2rem, 7vw, 5.2rem);
          font-weight: 300; line-height: 1.1;
          letter-spacing: .04em; color: var(--cream);
          margin-bottom: 22px;
        }
        .card h1 em, .card h2 em { font-style: italic; color: var(--gold-light); }
        .card p {
          font-size: clamp(0.65rem, 2vw, 0.78rem);
          font-weight: 300; letter-spacing: .12em;
          line-height: 1.9; color: rgba(245,240,232,.85);
          text-transform: uppercase;
        }

        .s5 { background-image: none !important; }

        .fylex-gallery-section {
          position: relative;
          z-index: 10;
          padding: 80px 0 60px;
          background: #F9F9F7;
          border-top: 1px solid rgba(0,0,0,0.06);
          border-radius: var(--curve, 24px) var(--curve, 24px) 0 0;
          overflow: hidden;
          width: 100%;
          clear: both;
          margin-top: 0;
        }
        .fylex-gallery-header {
          text-align: center;
          margin-bottom: 52px;
          padding: 0 40px;
          position: relative;
          z-index: 2;
        }
        .fylex-gallery-header h2 {
          font-family: 'Avenir', 'Neue Haas Grotesk Display Pro', var(--font-inter), 'Inter', sans-serif;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 400; color: #111111;
          letter-spacing: 0.03em; margin: 0 0 12px;
        }
        .fylex-gallery-header p {
          color: #595959; font-size: 0.75rem;
          text-transform: uppercase; letter-spacing: 0.15em;
        }
        .fylex-gallery-viewport {
          width: 100%; overflow: hidden;
          cursor: grab; user-select: none;
          -webkit-user-select: none;
          touch-action: pan-y;
          padding: 20px 0 32px;
          position: relative;
          z-index: 2;
        }
        .fylex-gallery-viewport:active { cursor: grabbing; }
        .fylex-gallery-track {
          display: flex; gap: 16px;
          width: max-content;
          will-change: transform;
        }
        .fylex-gallery-col {
          display: flex; flex-direction: column;
          gap: 16px; width: 240px;
          flex-shrink: 0; align-self: center;
        }
        .fylex-gallery-item {
          position: relative; border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 8px 24px rgba(0,0,0,0.05);
          transition: transform 0.4s cubic-bezier(0.165,0.84,0.44,1),
                      box-shadow 0.4s cubic-bezier(0.165,0.84,0.44,1);
          background: #1a1a1a;
          height: 260px;
          width: 100%;
        }
        .fylex-gallery-item img {
          width: 100%; height: 100%; object-fit: cover;
          display: block;
          transition: transform 0.7s cubic-bezier(0.165,0.84,0.44,1);
          pointer-events: none; -webkit-user-drag: none;
        }
        .fylex-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.28), transparent);
          opacity: 0; transition: opacity 0.35s;
        }
        .fylex-gallery-item:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 44px rgba(0,0,0,0.10);
        }
        .fylex-gallery-item:hover img { transform: scale(1.06); }
        .fylex-gallery-item:hover .fylex-overlay { opacity: 1; }

        @media (max-width: 768px) {
          .section, .s2, .s3, .s4 {
            background-attachment: scroll !important;
            background-size: cover !important;
            background-position: center !important;
          }
          .card {
            opacity: 1 !important;
            transform: none !important;
            padding: 40px 20px !important;
          }
          .card h1, .card h2 {
            font-size: clamp(1.8rem, 6vw, 2.8rem) !important;
          }
          .fylex-gallery-section { padding: 60px 0 40px; }
          .fylex-gallery-col { width: 160px; }
          .fylex-gallery-track { gap: 10px; }
        }
      `}</style>

      {/* ── Sticky Hero Sections Group (Sections 1-4) ── */}
      <div className="sticky-hero-group" style={{ position: 'relative', width: '100%' }}>
        {/* ── Hero Section 1 (Instant SSR Paint + Progressive Video Enhancement) ── */}
        {(homeSections.s1 || homeSections.home_s1 || homeSections['Section 1'] || homeSections.s1 === undefined) && (
          <div className="section s1" ref={(el) => { sectionsRef.current[0] = el; }}>
            <div className="video-container">
              <img
                src="/api/uploads/optimized/hero-poster.webp"
                alt=""
                aria-hidden="true"
                fetchPriority="high"
                decoding="sync"
                className="hero-poster-img"
                style={{ opacity: heroVideoReady ? 0 : 1, transition: 'opacity 0.5s ease' }}
                onError={(e: any) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {shouldMountHeroVideo && (
                <video
                  src={heroVideoSrc}
                  autoPlay
                  muted
                  defaultMuted
                  loop
                  playsInline
                  preload="metadata"
                  onPlaying={() => setHeroVideoReady(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                    opacity: heroVideoReady ? 1 : 0,
                    transition: 'opacity 0.6s ease',
                  }}
                />
              )}
            </div>
            <div className="hero-center">
              <div style={{ textAlign: 'center', margin: '0 0 10px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img
                  src="/fylex_logo_name.webp"
                  alt="FYLEX"
                  width={913}
                  height={110}
                  fetchPriority="high"
                  decoding="sync"
                  style={{
                    height: 'clamp(1.2rem, 3.2vw, 2.2rem)',
                    width: 'auto',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 15px rgba(0,0,0,0.6))',
                    display: 'block',
                  }}
                />
              </div>

              <h1
                className="hero-subtitle"
                style={{
                  color: '#ededed',
                  textAlign: 'center',
                  width: '100%',
                  margin: '0 0 24px 0',
                  textShadow: '0 2px 15px rgba(0,0,0,0.4)',
                  display: 'block',
                  textTransform: 'uppercase',
                }}
              >
                WEAR YOUR CHOICE
              </h1>
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <Link href="/pre-configure" className="cta-button">
                  Explore
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Pinned Parallax Watch Dial Morph Section (Section 2 -> Section 3) ── */}
        {(homeSections.s2 ||
          homeSections.home_s2 ||
          homeSections['Section 2'] ||
          homeSections.s2 === undefined ||
          homeSections.s3 ||
          homeSections.home_s3 ||
          homeSections['Section 3'] ||
          homeSections.s3 === undefined) && (
          <div className="dial-parallax-wrapper" ref={(el) => { sectionsRef.current[1] = el; }}>
            <div className="dial-layer dial-layer-base">
              <img
                src={s2Bg}
                alt="Watch Dial Base"
                className="dial-watch-img"
                width={1408}
                height={768}
                loading="lazy"
                decoding="async"
              />
              <div className="dial-overlay" />
            </div>

            <div className="dial-layer dial-layer-reveal">
              <img
                src={s3Bg}
                alt="Watch Dial Reveal"
                className="dial-watch-img"
                width={1408}
                height={768}
                loading="lazy"
                decoding="async"
              />
              <div className="dial-overlay" />
              <div className="dial-sweep-line" />
            </div>

            <div className="dial-card-container dial-card-1">
              <div className="card in" style={section2Banner?.textColor ? { color: section2Banner.textColor } : {}}>
                <div className="label" style={section2Banner?.textColor ? { color: section2Banner.textColor } : {}}>
                  {section2Banner?.subtitle || 'II · Movement'}
                </div>
                <h2
                  style={section2Banner?.textColor ? { color: section2Banner.textColor } : {}}
                  dangerouslySetInnerHTML={{ __html: section2Banner?.title || 'The <em>Heart</em> Within' }}
                />
                <div className="divider"></div>
                <p
                  style={section2Banner?.textColor ? { color: section2Banner.textColor } : {}}
                  dangerouslySetInnerHTML={{
                    __html:
                      section2Banner?.content ||
                      'Hundreds of hand-finished bridges and jewels.<br />A calibre beating 28,800 times each hour.',
                  }}
                />
              </div>
            </div>

            <div className="dial-card-container dial-card-2">
              <div className="card in" style={section3Banner?.textColor ? { color: section3Banner.textColor } : {}}>
                <div className="label" style={section3Banner?.textColor ? { color: section3Banner.textColor } : {}}>
                  {section3Banner?.subtitle || 'III · Design'}
                </div>
                <h2
                  style={section3Banner?.textColor ? { color: section3Banner.textColor } : {}}
                  dangerouslySetInnerHTML={{ __html: section3Banner?.title || 'Form Follows <em>Time</em>' }}
                />
                <div className="divider"></div>
                <p
                  style={section3Banner?.textColor ? { color: section3Banner.textColor } : {}}
                  dangerouslySetInnerHTML={{
                    __html:
                      section3Banner?.content ||
                      'Sapphire crystal, polished steel, supple leather.<br />Every element chosen for eternity, not fashion.',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Hero Section 4 (Lazy-mounted below-the-fold video) ── */}
        {(homeSections.s4 || homeSections.home_s4 || homeSections['Section 4'] || homeSections.s4 === undefined) && (
          <div
            className="section s4"
            ref={(el) => {
              sectionsRef.current[3] = el;
              s4Ref.current = el;
            }}
          >
            <div className="video-container">
              {shouldMountS4Video && (
                <video
                  src={legacyVideoSrc}
                  autoPlay
                  muted
                  defaultMuted
                  loop
                  playsInline
                  preload="metadata"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                />
              )}
            </div>
            <div className="card" style={{ zIndex: 10 }}>
              <h2
                dangerouslySetInnerHTML={{
                  __html: (videoSettings.home_legacy_video_title || 'Not Everyone Follows The Same Path.').replace(
                    /Same Path\./g,
                    '<em>Same Path.</em>'
                  ),
                }}
              />
              <p
                className="legacy-text"
                dangerouslySetInnerHTML={{
                  __html: videoSettings.home_legacy_video_subtitle || 'Different Ambitions. Different Routines. Different Stories.',
                }}
              />
              <div
                style={{
                  marginTop: '40px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  letterSpacing: '0.2em',
                  color: '#fff',
                  textTransform: 'uppercase',
                }}
              >
                IT&apos;S YOUR TIME.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Featured Timepieces Section ── */}
      {homeSections.featured && (
        <div
          className="featured-grid-wrap s5"
          ref={(el) => {
            sectionsRef.current[5] = el;
            featuredWrapRef.current = el;
          }}
        >
          <div className="featured-grid-header">
            <p className="featured-subtitle">Curated Collection</p>
            <h2 className="featured-title">
              <em>Featured</em> Timepieces
            </h2>
          </div>
          <div className="featured-container">
            {loadingFeatured ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', height: '100%', width: '100%' }}>
                <ProductSkeleton />
                {!isMobile && <ProductSkeleton />}
              </div>
            ) : featuredProducts.length > 0 ? (
              isFeaturedVisible ? (
                <HomeFeaturedSwiper featuredProducts={featuredProducts} isMobile={isMobile} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', height: '100%', width: '100%' }}>
                  {featuredProducts.slice(0, isMobile ? 1 : 2).map((p) => {
                    const display = getDisplayData(p);
                    return (
                      <div key={p.id} className="featured-item-v2" style={{ background: p.gradient || p.bgColor || '#f5f5f5' }}>
                        {display.image && (
                          <img
                            src={display.image}
                            alt={display.name}
                            className="featured-img-v2"
                            loading="lazy"
                            decoding="async"
                            width={500}
                            height={500}
                          />
                        )}
                        <div className="featured-content" style={{ color: p.textColor || '#111', zIndex: 2 }}>
                          <div className="f-label" style={{ color: p.accentColor || '#555' }}>{p.subtitle || p.tagline}</div>
                          <div className="f-title" style={{ color: 'inherit' }}>{display.name} <em>{p.titleAccent || ''}</em></div>
                          <div className="f-price flex items-baseline gap-2" style={{ margin: '4px 0 14px', fontSize: '1.1rem', fontWeight: 500 }}>
                            <span>{display.isConfigurable ? 'From ' : ''}{display.formattedPrice}</span>
                          </div>
                          <Link href={`/configure?watch=${p.id}`} className="f-shop-btn" aria-label={`Shop ${display.name}`}>
                            Shop
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '60px 20px', color: '#555', textAlign: 'center' }}>
                <p style={{ fontSize: '1.1rem', letterSpacing: '0.05em', fontWeight: 500, color: '#333' }}>No featured timepieces available.</p>
                <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '8px' }}>Add products from the Admin Panel to feature them here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Community Gallery Section (Lazy-mounted offscreen marquee) ── */}
      {homeSections.gallery && (
        <div ref={galleryRef}>
          <section className="fylex-gallery-section" id="gallery">
            <div className="fylex-gallery-header">
              <h2 dangerouslySetInnerHTML={{ __html: injectLogo('The FYLEX World.') }} />
            </div>
            {isGalleryVisible ? (
              <GalleryCarousel items={communityImages.length > 0 ? communityImages : fallbackGallery} active={isGalleryVisible} />
            ) : (
              <div style={{ height: 536, width: '100%' }} aria-hidden="true" />
            )}
          </section>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[2000] bg-black/95 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setLightboxImg(null)}
        >
          <button
            type="button"
            aria-label="Close image preview"
            className="absolute top-10 right-10 text-gold border border-gold-dim w-12 h-12 rounded-full flex items-center justify-center hover:bg-gold hover:text-dark transition-all"
            onClick={() => setLightboxImg(null)}
          >
            ✕
          </button>
          <img
            src={lightboxImg}
            alt="Lightbox"
            className="max-w-[90vw] max-h-[85vh] object-contain border border-gold-dim rounded"
          />
        </div>
      )}
    </div>
  );
}
