"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import settingsService from '@/services/settings.service';

const DesignSystemContext = createContext();

const defaultTheme = {
  // Plain Dark Black & Contrast Settings
  'brand-primary': '#161413',      // Kokushoku Black
  'brand-secondary': '#161413',    // Dark Black
  'brand-accent': '#FFFFFF',       // High Contrast White
  'brand-black': '#000000',        // Pure Black
  'brand-white': '#FFFFFF',        // Pure White
  'brand-silver': '#999B98',       // Walrus Gray
  'brand-cream': '#FFF6ED',        // Fatback Light Cream
  'brand-charcoal': '#999B98',     // Walrus
  
  'bg-primary': '#161413',         
  'text-primary': '#FFF6ED',
  'text-secondary': '#999B98',
  
  'btn-primary-bg': '#161413',
  'btn-primary-text': '#FFF6ED',
  'btn-radius': '999px',
  
  'radius-global': '12px',
};

export function DesignSystemProvider({ children }) {
  const [theme, setTheme] = useState(defaultTheme);
  const [productOverrides, setProductOverrides] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // 1. Fetch live settings from API on load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsService.getSettings();
        if (response?.data) {
          const dsSettings = response.data.filter(s => s.group === 'design_system');
          if (dsSettings.length > 0) {
            const dbTheme = {};
            dsSettings.forEach(s => {
              dbTheme[s.key] = s.value;
            });
            setTheme(prev => ({ ...prev, ...dbTheme }));
          }
        }
      } catch (err) {
        console.error("Failed to load design system settings:", err);
      } finally {
        setIsReady(true);
      }
    };
    
    fetchSettings();
  }, []);

  // 2. Listen for 'postMessage' events from the Admin Panel for Live Preview
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'UPDATE_DESIGN_SYSTEM') {
        const { payload } = event.data;
        if (payload) {
          setTheme(prev => ({ ...prev, ...payload }));
        }
      }
      if (event.data?.type === 'PREVIEW_PRODUCT_THEME') {
        const { payload } = event.data;
        if (payload) {
          setProductOverrides(payload);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getContrast = (hex) => {
    if (!hex) return '#ffffff';
    hex = hex.replace('#', '').trim();
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return '#ffffff';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq < 128 ? '#ffffff' : '#1a1a1a';
  };

  const cssVariables = Object.entries(theme)
    .map(([key, value]) => {
      if (!value) return '';
      return `--ds-${key}: ${value};`;
    })
    .join('\n');

  const legacyVariables = `
    --fyl-deep-blue: var(--ds-brand-primary);
    --fyl-gold: var(--ds-brand-secondary);
    --fyl-orange: var(--ds-brand-accent);
    --fyl-black: var(--ds-brand-black);
    --fyl-white: var(--ds-brand-white);
    --fyl-silver: var(--ds-brand-silver);
    --fyl-teal: var(--ds-brand-teal);
    --fyl-charcoal: var(--ds-brand-charcoal);
  `;

  return (
    <DesignSystemContext.Provider value={{ theme, getContrast, isReady, productOverrides }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          :root {
            ${cssVariables}
            ${legacyVariables}
          }
        `
      }} />
      {children}
    </DesignSystemContext.Provider>
  );
}

export const useDesignSystem = () => useContext(DesignSystemContext);
