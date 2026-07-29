"use client";
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import productsData from '../../../data/productsData';
import 'swiper/css/free-mode';
import Lenis from 'lenis';
import { X, RefreshCw, ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import Swal from 'sweetalert2';
import { fetchProducts } from '../../../lib/api';
import { getFileUrl, resolveProductImage, resolveProductBackground } from '../../../lib/utils';

gsap.registerPlugin(ScrollTrigger);

function ConfigureContent() {
  const searchParams = useSearchParams();
  const watchId = searchParams.get('watch');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [stepsData, setStepsData] = useState([]);
  const [variants, setVariants] = useState([]);
  const [media360, setMedia360] = useState([]);
  const [frameIndex, setFrameIndex] = useState(0);

  const [currentStep, setCurrentStep] = useState(0);
  const [activeOpt, setActiveOpt] = useState(0);
  const [activeThumb, setActiveThumb] = useState(0);
  const [previewSrc, setPreviewSrc] = useState('');
  const [appliedDial, setAppliedDial] = useState(null);
  const [dialOptions, setDialOptions] = useState([]);
  const [viewMode, setViewMode] = useState('variants');
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [userSelections, setUserSelections] = useState({});
  const [displayPrice, setDisplayPrice] = useState('');

  // Sync state to URL
  useEffect(() => {
    if (Object.keys(userSelections).length > 0) {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(userSelections).forEach(([key, val]) => {
        if (val) params.set(key, val);
      });
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [userSelections]);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const data = await fetchProducts();
        const rawData = data.data || (Array.isArray(data) ? data : []);
        const p = rawData.find(item => item.id.toString() === watchId) || rawData?.[0];

        if (!p) {
          setLoading(false);
          return;
        }

        const mappedProduct = {
          ...p,
          id: p.id.toString(),
          title: p.name,
          price: `₹${Number(p.price || 0).toLocaleString('en-IN')}`,
          heroImage: resolveProductImage(p),
          heroBgImage: resolveProductBackground(p),
          galleryImages: [],
          theme: p.theme || 'champagne',
          accentColor: p.accentColor || '#c4a35a',
          textColor: p.textColor || '#1a1a1a',
        };
        setProduct(mappedProduct);
        setPreviewSrc(mappedProduct.heroImage);
        setDisplayPrice(mappedProduct.price);

        const threeSixty = (p.productMedia || [])
          .filter(m => m.type === '360' || m.role === '360_view')
          .map(m => getFileUrl(m.media?.path || m.media?.url))
          .filter(Boolean);
        setMedia360(threeSixty);

        const attrMap = {};
        (p.variants || []).forEach(v => {
          (v.variantAttributes || []).forEach(va => {
            const attr = va.attributeValue?.attribute;
            if (!attr) return;
            if (!attrMap[attr.name]) {
              attrMap[attr.name] = { id: attr.id, title: `Choose your ${attr.name.toLowerCase()}`, options: [] };
            }
            if (!attrMap[attr.name].options.some(o => o.name === va.attributeValue.label)) {
              attrMap[attr.name].options.push({
                name: va.attributeValue.label,
                img: resolveProductImage(p, v),
                dialImg: va.attributeValue.label.toLowerCase().includes('dial') ? resolveProductImage(p, v) : null
              });
            }
          });
        });

        const dynamicSteps = Object.keys(attrMap).map((key, idx, arr) => ({
          ...attrMap[key],
          id: key.toLowerCase(),
          nextLbl: idx < arr.length - 1 ? Object.keys(attrMap)[idx + 1] : 'Discover'
        }));

        setStepsData(dynamicSteps);
        setVariants(p.variants || []);

        // Load selections from URL or defaults
        const initialSelections = {};
        dynamicSteps.forEach(step => {
          const urlVal = searchParams.get(step.id);
          initialSelections[step.id] = urlVal || step.options[0]?.name;
        });
        setUserSelections(initialSelections);

        // Auto-select variant image based on URL selections
        const match = (p.variants || []).find(v => {
          const vAttrs = v.variantAttributes || [];
          if (vAttrs.length === 0) return false;
          return vAttrs.every(va => {
            const attrName = va.attributeValue?.attribute?.name?.toLowerCase();
            return initialSelections[attrName] === va.attributeValue?.label;
          });
        });

        if (match) {
          const vPath = resolveProductImage(p, match);
          if (vPath) setPreviewSrc(vPath);

          const vBgPath = resolveProductBackground(p, match);
          setProduct(prev => ({ ...prev, heroBgImage: vBgPath }));

          const matchGallery = (match.variantImages || []).map(vi =>
            getFileUrl(vi.media?.path || vi.media?.url || vi.media?.fileName)
          ).filter(Boolean);
          setProduct(prev => ({ ...prev, galleryImages: matchGallery }));
        }

        const dialsStep = dynamicSteps.find(s => s.id === 'dial' || s.id === 'dials');
        if (dialsStep) setDialOptions(dialsStep.options);
      } catch (err) {
        console.error('Failed to load product for configurator:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [watchId]);

  const getCompatibleOptions = (step) => {
    if (!step || !step.options) return [];
    if (!variants || variants.length === 0) return step.options;

    const currentAttrId = step.id.toLowerCase();
    
    // Filter options: an option 'opt' for current attribute is compatible if there exists
    // at least one variant that has 'opt' AND matches all OTHER current userSelections.
    const filtered = step.options.filter(opt => {
      return variants.some(v => {
        const vAttrs = v.variantAttributes || [];
        const hasOpt = vAttrs.some(va =>
          va.attributeValue?.attribute?.name?.toLowerCase() === currentAttrId &&
          va.attributeValue?.label === opt.name
        );
        if (!hasOpt) return false;

        return Object.entries(userSelections).every(([selKey, selVal]) => {
          if (selKey === currentAttrId || !selVal) return true;
          return vAttrs.some(va =>
            va.attributeValue?.attribute?.name?.toLowerCase() === selKey &&
            va.attributeValue?.label === selVal
          );
        });
      });
    });

    return filtered.length > 0 ? filtered : step.options;
  };

  const previewImgRef = useRef(null);
  const configuratorRef = useRef(null);
  const storyRef = useRef(null);
  const parallaxInited = useRef(false);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    return () => {
      lenis.destroy();
      gsap.ticker.remove((time) => lenis.raf(time * 1000));
    };
  }, []);

  const isLastStep = currentStep >= 0 && currentStep === stepsData.length - 1;
  const isDialStep = currentStep >= 0 && currentStep < stepsData.length && stepsData[currentStep].id === 'dial';

  useEffect(() => {
    if (isLastStep) setTimeout(() => ScrollTrigger.refresh(), 120);
  }, [isLastStep]);

  useEffect(() => {
    if (isDialStep && !appliedDial) setAppliedDial(dialOptions[0]?.dialImg);
  }, [isDialStep, appliedDial, dialOptions]);

  if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#111' }}>Initializing Configurator...</div>;
  if (!product) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#111' }}>Product not found.</div>;

  const handleCategoryClick = (idx) => {
    setCurrentStep(idx);
    setViewMode('variants');
  };

  const resetToOverview = () => {
    setCurrentStep(-1);
    setViewMode('angles');
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      const prevStepIdx = currentStep - 1;
      setCurrentStep(prevStepIdx);

      const prevStepId = stepsData[prevStepIdx].id;
      const savedSelection = userSelections[prevStepId];
      const optIdx = stepsData[prevStepIdx].options.findIndex(o => o.name === savedSelection);
      setActiveOpt(optIdx >= 0 ? optIdx : 0);
      setActiveThumb(0);

      const match = findMatchingVariant(userSelections);
      if (match) {
        const vImg = match.variantImages?.find(vi => vi.type === 'MAIN')?.media || match.variantImages?.[0]?.media;
        const vPath = getFileUrl(vImg?.path || vImg?.url || (vImg?.fileName ? `/uploads/${vImg.fileName}` : null));
        updatePreviewImage(vPath || stepsData[prevStepIdx].options[optIdx >= 0 ? optIdx : 0].img);
        setDisplayPrice(`₹${Number(match.sellingPrice || 0).toLocaleString('en-IN')}`);

        const vBgPath = resolveProductBackground(product, match);
        const matchGallery = (match.variantImages || []).map(vi =>
          getFileUrl(vi.media?.path || vi.media?.url || (vi.media?.fileName ? `/uploads/${vi.media.fileName}` : null))
        ).filter(Boolean);
        setProduct(prev => ({ ...prev, galleryImages: matchGallery, heroBgImage: vBgPath }));
      } else {
        updatePreviewImage(stepsData[prevStepIdx].options[optIdx >= 0 ? optIdx : 0].img);
      }
    } else if (currentStep === 0) {
      resetToOverview();
    }
  };



  const updatePreviewImage = (src) => {
    if (!src || src === previewSrc) return;
    gsap.to(previewImgRef.current, {
      opacity: 0, duration: 0.2, onComplete: () => {
        setPreviewSrc(src);
        gsap.to(previewImgRef.current, { opacity: 1, duration: 0.3 });
      }
    });
  };  const normalizeAttrKey = (k) => {
    if (!k) return '';
    const clean = k.toLowerCase().trim();
    if (clean.includes('dial')) return 'dial';
    if (clean.includes('belt') || clean.includes('strap')) return 'belt';
    if (clean.includes('case') || clean.includes('bracelet') || clean.includes('model') || clean.includes('color')) return 'case';
    return clean;
  };

  const findMatchingVariant = (targetSelections) => {
    if (!variants || variants.length === 0) return null;

    const normalizedTarget = {};
    Object.entries(targetSelections).forEach(([k, v]) => {
      if (v) normalizedTarget[normalizeAttrKey(k)] = v.toLowerCase().trim();
    });

    // 1. Try exact match for all normalized attributes
    const exact = variants.find(v => {
      const vAttrs = v.variantAttributes || [];
      return Object.entries(normalizedTarget).every(([normKey, normVal]) => {
        return vAttrs.some(va => {
          const attrName = normalizeAttrKey(va.attributeValue?.attribute?.name);
          const label = (va.attributeValue?.label || '').toLowerCase().trim();
          return attrName === normKey && label === normVal;
        });
      });
    });
    if (exact) return exact;

    // 2. Carry-forward fallback: score variants by highest number of matching attributes
    let bestMatch = variants[0];
    let highestScore = -1;

    variants.forEach(v => {
      const vAttrs = v.variantAttributes || [];
      let score = 0;
      Object.entries(normalizedTarget).forEach(([normKey, normVal]) => {
        const matches = vAttrs.some(va => {
          const attrName = normalizeAttrKey(va.attributeValue?.attribute?.name);
          const label = (va.attributeValue?.label || '').toLowerCase().trim();
          return attrName === normKey && label === normVal;
        });
        if (matches) score += (normKey === 'case' ? 4 : normKey === 'dial' ? 2 : 1);
      });
      if (score > highestScore) {
        highestScore = score;
        bestMatch = v;
      }
    });

    return bestMatch;
  };

  const handleOptClick = (idx, src) => {
    setActiveOpt(idx);
    const stepId = stepsData[currentStep]?.id;
    const optName = stepsData[currentStep]?.options[idx]?.name;
    if (!stepId || !optName) return;

    // Carry-forward target selections
    const targetSelections = { ...userSelections, [stepId]: optName };
    const match = findMatchingVariant(targetSelections);

    if (match) {
      // Sync selections with resolved variant attributes
      const resolvedSelections = { ...targetSelections };
      (match.variantAttributes || []).forEach(va => {
        const attrName = va.attributeValue?.attribute?.name?.toLowerCase();
        if (attrName) resolvedSelections[attrName] = va.attributeValue?.label;
      });
      setUserSelections(resolvedSelections);

      const vImg = match.variantImages?.find(vi => vi.type === 'MAIN')?.media || match.variantImages?.[0]?.media;
      const vPath = getFileUrl(vImg?.path || vImg?.url || (vImg?.fileName ? `/uploads/${vImg.fileName}` : null));
      updatePreviewImage(vPath || src);
      setDisplayPrice(`₹${Number(match.sellingPrice || 0).toLocaleString('en-IN')}`);

      const vBgPath = resolveProductBackground(product, match);
      const matchGallery = (match.variantImages || []).map(vi =>
        getFileUrl(vi.media?.path || vi.media?.url || (vi.media?.fileName ? `/uploads/${vi.media.fileName}` : null))
      ).filter(Boolean);
      setProduct(prev => ({ ...prev, galleryImages: matchGallery, heroBgImage: vBgPath }));
    } else {
      setUserSelections(targetSelections);
      updatePreviewImage(src);
    }
    setActiveThumb(-1);
  };

  const handleNextStep = () => {
    if (currentStep < stepsData.length - 1) {
      const nextStepIdx = currentStep + 1;
      setCurrentStep(nextStepIdx);

      const nextStepId = stepsData[nextStepIdx].id;
      const savedSelection = userSelections[nextStepId];
      const optIdx = stepsData[nextStepIdx].options.findIndex(o => o.name === savedSelection);
      setActiveOpt(optIdx >= 0 ? optIdx : 0);
      setActiveThumb(0);

      const match = findMatchingVariant(userSelections);
      if (match) {
        const vImg = match.variantImages?.find(vi => vi.type === 'MAIN')?.media || match.variantImages?.[0]?.media;
        const vPath = getFileUrl(vImg?.path || vImg?.url || (vImg?.fileName ? `/uploads/${vImg.fileName}` : null));
        updatePreviewImage(vPath || stepsData[nextStepIdx].options[optIdx >= 0 ? optIdx : 0].img);
        setDisplayPrice(`₹${Number(match.sellingPrice || 0).toLocaleString('en-IN')}`);

        const vBgPath = resolveProductBackground(product, match);
        const matchGallery = (match.variantImages || []).map(vi =>
          getFileUrl(vi.media?.path || vi.media?.url || (vi.media?.fileName ? `/uploads/${vi.media.fileName}` : null))
        ).filter(Boolean);
        setProduct(prev => ({ ...prev, galleryImages: matchGallery, heroBgImage: vBgPath }));
      } else {
        updatePreviewImage(stepsData[nextStepIdx].options[optIdx >= 0 ? optIdx : 0].img);
      }
    } else {
      // Final completed step - Enforce Single Primary Image
      const match = findMatchingVariant(userSelections);
      if (match) {
        const primaryMedia = match.variantImages?.find(vi => vi.type === 'MAIN')?.media || match.variantImages?.[0]?.media;
        const primaryPath = getFileUrl(primaryMedia?.path || primaryMedia?.url || (primaryMedia?.fileName ? `/uploads/${primaryMedia.fileName}` : null));
        if (primaryPath) setPreviewSrc(primaryPath);
      }
      setShowCustomAlert(true);
    }
  };

  const handleThumbClick = (idx, src) => {
    setActiveThumb(idx);
    setActiveOpt(-1);
    updatePreviewImage(src);
  };

  const handle360Scroll = (e) => {
    if (!media360.length) return;
    const sens = 40;
    const delta = e.clientX;
    const newIndex = Math.floor(delta / sens) % media360.length;
    setFrameIndex(Math.abs(newIndex));
  };

  return (
    <div className="customize-root">
      <style>{`
        .customize-root { font-family: 'Inter', sans-serif; background: #f0f2f5; color: ${product.textColor}; overflow-x: hidden; min-height: 100vh; display: flex; flex-direction: column; }
        #configurator { flex: 1; width: 100%; background: ${product.bgColor || product.gradient || 'radial-gradient(circle at center, #FFFFFF 0%, #ebedf0 100%)'}; position: relative; overflow: hidden; display: flex; flex-direction: column; z-index: 5; }
        .top-actions { position: fixed; top: 100px; right: 30px; display: flex; align-items: center; gap: 15px; z-index: 999; }
        .close-btn { background: rgba(0,0,0,0.6); color: #fff; border: none; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(8px); transition: transform 0.2s; }
        .close-btn:hover { transform: scale(1.1); }
        .c-main { flex: 1; display: flex; align-items: center; justify-content: center; position: relative; min-height: 55vh; }
        .watch-preview { max-width: 80%; max-height: 52vh; object-fit: contain; filter: drop-shadow(0 20px 30px rgba(0,0,0,0.25)); transition: transform 0.3s; }
        .thumbnails { position: absolute; bottom: 30px; left: 30px; display: flex; gap: 12px; }
        .thumb { width: 50px; height: 50px; border-radius: 10px; border: 2px solid transparent; overflow: hidden; cursor: pointer; background: rgba(255,255,255,0.7); backdrop-filter: blur(6px); transition: all 0.2s; }
        .thumb.active { border-color: #008767; transform: scale(1.08); }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }
        @media (max-width: 768px) {
          .thumbnails { right: 15px; gap: 10px; }
          .thumb { width: 42px; height: 42px; }
          .top-actions { top: 25px; right: 20px; }
          .top-left-actions { top: 25px; left: 20px; }
          .c-main { padding-bottom: 240px; }
          .watch-preview { height: 50vh; }
          .c-selection-controls { padding: 20px 15px; }
          .options-row { gap: 20px; font-size: 14px; }
          .c-summary-footer { padding: 20px; flex-direction: column; align-items: flex-start; gap: 15px; }
          .f-add-cart-btn { align-self: flex-end; margin-top: -30px; }
        }
        .c-bottom-panel { position: fixed; bottom: 0; left: 0; width: 100%; z-index: 30; background: transparent; }
        .c-selection-controls { padding: 30px; display: flex; flex-direction: column; gap: 20px; }
        .step-title { font-size: 1.125rem; font-weight: 600; }
        .options-row { display: flex; gap: 30px; font-size: 16px; font-weight: 600; color: #8A8A8A; overflow-x: auto; scrollbar-width: none; }
        .opt { cursor: pointer; transition: color 0.3s; white-space: nowrap; color: #94a3b8; }
        .opt.active { color: #008767; font-weight: 700; }
        .nav-buttons-row { position: relative; display: flex; align-items: center; justify-content: center; min-height: 50px; margin-top: 15px; }
        .btn-circular-back { position: absolute; left: 0; width: 35px; height: 35px; border-radius: 50%; background: #1a1a1a; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; transition: transform 0.3s; }
        .btn-circular-back:hover { transform: scale(1.05); }
        .btn-pill-next { background: #1a1a1a; color: #fff; font-size: 10px; font-weight: 700; padding: 10px 24px; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 999px; border: 1px solid #1a1a1a; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        @media (hover: hover) {
          .btn-pill-next:hover { background: rgba(26, 26, 26, 0.8) !important; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-color: rgba(255, 255, 255, 0.1); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.2); }
        }
        .btn-pill-next:active { transform: scale(0.96); opacity: 0.9; }
        .c-summary-footer { background: #fff; padding: 30px 60px; display: flex; justify-content: flex-start; align-items: center; border-top: 1px solid rgba(0,0,0,0.05); }
        .f-info { text-align: left; width: 100%; display: flex; flex-direction: column; align-items: flex-start; }
        .f-title { font-size: 16px; font-weight: 700; color: #111; margin: 0; text-align: left; }
        .f-price { font-size: 16px; font-weight: 600; color: #111; text-align: left; }
        .alert-overlay { position: fixed; inset: 0; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); display: flex; align-items: center; justify-content: center; z-index: 9999; opacity: 0; visibility: hidden; transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); }
        .alert-overlay.show { opacity: 1; visibility: visible; }
        .alert-box { background: transparent; padding: 40px 20px; text-align: center; width: 100%; max-width: 900px; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow-y: auto; box-sizing: border-box; }
        .alert-top-close { position: absolute; top: 40px; right: 40px; cursor: pointer; color: #111111; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.08); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; z-index: 10; }
        .alert-top-close:hover { background: rgba(0,0,0,0.12); transform: rotate(90deg); }
        .alert-content-grid { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 100%; padding: 20px 0; }
        .alert-watch-title { font-family: 'Avenir', 'Outfit', 'Inter', sans-serif; font-size: clamp(2.4rem, 5vw, 3.6rem); font-weight: 700; color: #111111; margin: 0 0 10px 0; letter-spacing: -0.02em; line-height: 1.1; }
        .alert-selections-bar { display: flex; gap: 14px; justify-content: center; align-items: center; flex-wrap: wrap; color: #444444; font-size: 14px; font-weight: 500; margin-bottom: 35px; }
        .alert-key-label { color: #888888; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin-right: 4px; }
        .alert-val-label { color: #111111; font-weight: 600; text-transform: capitalize; }
        .alert-image-center { width: 100%; display: flex; justify-content: center; align-items: center; margin: 25px 0 45px 0; overflow: visible; }
        .alert-watch-preview { width: 100%; max-width: min(80vw, 540px); max-height: 46vh; object-fit: contain; filter: drop-shadow(0 30px 60px rgba(0,0,0,0.16)); transition: transform 0.6s ease; }
        .alert-footer-btn { margin-top: 45px; padding: 18px 56px; background: #111111; color: #ffffff; border-radius: 999px; cursor: pointer; font-weight: 800; font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; border: 1px solid #111111; transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); box-shadow: 0 12px 35px rgba(0,0,0,0.18); }
        @media (hover: hover) {
          .alert-footer-btn:hover { background: #000000 !important; color: #ffffff !important; transform: translateY(-3px) scale(1.02); box-shadow: 0 18px 45px rgba(0, 0, 0, 0.3); }
        }
        .alert-footer-btn:active { transform: scale(0.96); opacity: 0.9; }

        .f-add-cart-btn { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          cursor: pointer; 
          border: none; 
          background: rgba(255,255,255,0.2); 
          backdrop-filter: blur(8px);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1); 
        }
        .f-add-cart-btn:hover { transform: scale(1.1); background: rgba(255,255,255,0.4); }
        .f-add-cart-btn:active { transform: scale(0.96); }
      `}</style>

      <section id="configurator" ref={configuratorRef}>

        <div className="top-actions">
          <button onClick={() => router.push(`/products`)} className="close-btn"><X size={22} /></button>
        </div>

        <div className="c-main" onMouseMove={media360.length ? handle360Scroll : undefined}>
          {media360.length > 0 ? (
            <img src={media360[frameIndex]} alt="Watch 360" className="watch-preview" />
          ) : (
            <img src={previewSrc} alt="Watch preview" className="watch-preview" ref={previewImgRef} />
          )}
          {media360.length > 0 && <div style={{ position: 'absolute', bottom: 100, color: '#888', fontSize: 13 }}><RefreshCw size={14} /> Swipe for 360° View</div>}
        </div>

        <div className="c-bottom-panel">
          {currentStep >= 0 && currentStep < stepsData.length && (
            <div className="c-selection-controls">
              <div className="step-title">{stepsData[currentStep]?.title}</div>
              <div className="options-row">
                {getCompatibleOptions(stepsData[currentStep]).map((opt, i) => {
                  const stepKey = stepsData[currentStep]?.id;
                  const selectedVal = userSelections[stepKey];
                  const isSelected = selectedVal
                    ? selectedVal.toLowerCase() === opt.name.toLowerCase()
                    : i === 0;

                  return (
                    <span
                      key={i}
                      className={`opt ${isSelected ? 'active' : ''}`}
                      style={{
                        color: isSelected ? '#008767' : '#94a3b8',
                        fontWeight: isSelected ? '700' : '500',
                        cursor: 'pointer',
                        transition: 'color 0.3s ease',
                        whiteSpace: 'nowrap',
                        marginRight: '16px'
                      }}
                      onClick={() => handleOptClick(i, opt.img)}
                    >
                      {opt.name}
                    </span>
                  );
                })}
              </div>
              <div className="nav-buttons-row">
                {currentStep > 0 && <button className="btn-circular-back" onClick={handlePrevStep}><ChevronLeft size={22} /></button>}
                <button key={currentStep} className="btn-pill-next" onClick={handleNextStep}>
                  {stepsData[currentStep]?.nextLbl}
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          <div className="c-summary-footer">
            <div className="f-info">
              <h3 className="f-title">{product.title}</h3>
              <span className="f-price">{displayPrice}</span>
            </div>
          </div>
        </div>
      </section>

      <div className={`alert-overlay ${showCustomAlert ? 'show' : ''}`}>
        <div className="alert-box">
          <button className="alert-top-close" onClick={() => setShowCustomAlert(false)}><X size={22} /></button>
          <div className="alert-content-grid">
            <h2 className="alert-watch-title">{product.title}</h2>
            <div className="alert-selections-bar">
              {Object.entries(userSelections).map(([key, val], idx, arr) => {
                let formattedKey = key
                  .replace(/_/g, ' ')
                  .split(' ')
                  .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                  .join(' ');
                if (formattedKey.toLowerCase() === 'belt color' || formattedKey.toLowerCase() === 'belt') {
                  formattedKey = 'Strap';
                }
                return (
                  <React.Fragment key={key}>
                    <span>
                      <span className="alert-key-label">{formattedKey}:</span>{' '}
                      <span className="alert-val-label">{val}</span>
                    </span>
                    {idx < arr.length - 1 && <span style={{ opacity: 0.35, color: '#999' }}>•</span>}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="alert-image-center">
              <img src={previewSrc} alt={product.title} className="alert-watch-preview" />
            </div>
            <button className="alert-footer-btn" onClick={() => {
              const params = new URLSearchParams({ watch: watchId, ...userSelections });
              router.push(`/discover?${params.toString()}`);
            }}>Discover</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Configure() {
  return <Suspense fallback={<div>Loading...</div>}><ConfigureContent /></Suspense>;
}
