"use client";
import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * SmoothScroll component integrates Lenis for global smooth scrolling.
 * Disabled on the Home page ('/') and coarse-pointer touch devices to preserve native 60fps scroll & zero TBT.
 */
const SmoothScroll = ({ children }) => {
  const location = usePathname();
  const lenisRef = useRef(null);

  useEffect(() => {
    if (location === '/') return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    lenisRef.current = lenis;

    // Synchronize Lenis with ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // Add Lenis to GSAP ticker
    const gsapTicker = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(gsapTicker);

    // Lag smoothing for better performance
    gsap.ticker.lagSmoothing(0);
    
    return () => {
      lenis.destroy();
      gsap.ticker.remove(gsapTicker);
      lenisRef.current = null;
    };
  }, [location]);

  return <>{children}</>;
};

export default SmoothScroll;
