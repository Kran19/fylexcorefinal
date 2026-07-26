"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import settingsService from '@/services/settings.service';

const DesignSystemContext = createContext();

const defaultTheme = {
  // Global Brand Settings
  'brand-primary': '#1C2E4A',      // --fyl-deep-blue
  'brand-secondary': '#F2C94C',    // --fyl-gold
  'brand-accent': '#F28C38',       // --fyl-orange
  'brand-black': '#0A0A0A',        // --fyl-black
  'brand-white': '#F9F9F7',        // --fyl-white
  'brand-silver': '#D3D3D3',       // --fyl-silver
  'brand-teal': '#48C9B0',         // --fyl-teal
  'brand-charcoal': '#555555',     // --fyl-charcoal
  
  // New Global Settings mapped directly
  'bg-primary': '#F9F9F7',         
  'text-primary': '#111111',
  'text-secondary': '#555555',
  
  'btn-primary-bg': '#1a1a1a',
  'btn-primary-text': '#ffffff',
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
