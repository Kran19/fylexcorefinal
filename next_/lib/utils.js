"use client";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getFileUrl(path) {
  if (!path) return null;
  if (typeof path === 'object') {
    path = extractMediaPath(path);
  }
  if (!path || typeof path !== 'string') return null;

  let cleanPath = path.trim();
  if (!cleanPath) return null;

  // 1. Full absolute URLs (http, https, data)
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://') || cleanPath.startsWith('data:')) {
    return cleanPath;
  }

  // 2. Relative frontend static assets (/assets/...)
  if (cleanPath.startsWith('/assets/') || cleanPath.startsWith('assets/')) {
    return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  }

  // 3. Fallback for static watch PNG filenames (e.g. Olive-green-dial.png, white-gold.png)
  const basename = cleanPath.split('/').pop().split('\\').pop();
  if (basename.match(/^(36mm|40mm|Chocolate-dial|Diamond-paved|Diamondpavedial|Flutted|Olive-green-dial|brilliant-diamond-set|chocolate|everose-gold|goldwatch|left-side|metorite|metoritedial|olive-green|only-dial|premium|right-side|white-gold)\.png$/i)) {
    return `/assets/fylex-watch-v2/${basename}`;
  }

  // 4. Dynamic Backend API Uploads (NestJS server with /api prefix)
  let fileKey = cleanPath.replace(/^\/+/, '');
  if (fileKey.startsWith('api/uploads/')) {
    fileKey = fileKey.slice(12);
  } else if (fileKey.startsWith('uploads/')) {
    fileKey = fileKey.slice(8);
  }

  if (typeof window !== 'undefined') {
    // If running on standard HTTP/HTTPS ports (production server behind Nginx)
    if (!window.location.port || window.location.port === '80' || window.location.port === '443') {
      return `/api/uploads/${fileKey}`;
    }
    
    // Otherwise fallback for custom dev ports (e.g. localhost:3002)
    let rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
    try {
      const url = new URL(rawApiUrl);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        url.hostname = window.location.hostname;
      }
      rawApiUrl = url.toString().replace(/\/$/, '');
    } catch (e) {}
    const apiPrefix = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`;
    return `${apiPrefix}/uploads/${fileKey}`;
  }

  let rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
  const apiPrefix = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`;
  return `${apiPrefix}/uploads/${fileKey}`;
}

function extractMediaPath(item) {
  if (!item) return null;
  if (typeof item === 'string') return item;
  const m = item.media || item;
  if (typeof m === 'string') return m;

  // PRIORITY: If compressed variant exists and serveMode is auto/accepted, return compressed path!
  if (m.serveMode !== 'original') {
    if (m.bestVariant?.filePath) return m.bestVariant.filePath;
    if (m.primaryVariant?.filePath) return m.primaryVariant.filePath;
    if (m.variants && Array.isArray(m.variants) && m.variants.length > 0) {
      const best = m.variants.reduce((prev, curr) => (Number(curr.fileSize) < Number(prev.fileSize) ? curr : prev), m.variants[0]);
      if (best?.filePath) return best.filePath;
    }
  }

  return m.url || m.filePath || m.path || m.fileName || null;
}

/**
 * UNIFIED DISPLAY MODEL
 * One source of truth for price, image, and configuration across the entire app.
 * Use this in Homepage, Discover, Wishlist, Shop, and Admin.
 */
function formatSubtitle(targetVariant, product, fallbackVariant) {
    const v = targetVariant || fallbackVariant;
    
    // 1. Try variantAttributes labels
    if (v?.variantAttributes && Array.isArray(v.variantAttributes) && v.variantAttributes.length > 0) {
        const labels = v.variantAttributes
            .map(va => va.attributeValue?.label || va.attributeValue?.value || va.value)
            .filter(Boolean);
        if (labels.length > 0) {
            return labels.join(' • ');
        }
    }

    // 2. Try variant name (e.g., "Black blue, Black, Black")
    if (v?.name && v.name.trim() && !v.name.toUpperCase().startsWith('MERIDIAN-')) {
        return v.name.split(',').map(s => s.trim()).join(' • ');
    }

    // 3. Transform raw SKU string like "MERIDIAN-BLACK-BLUE-BLACK-BLACK" into meaningful information
    const rawSku = v?.sku || product?.sku;
    if (rawSku && typeof rawSku === 'string') {
        const parts = rawSku.split('-').filter(Boolean);
        if (parts.length > 1) {
            const formattedParts = parts.map(p => {
                return p.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            });
            // First part is model line name (e.g. MERIDIAN), remaining are variant specifications
            return formattedParts.join(' • ');
        }
    }

    return product?.subtitle || product?.tagline || 'Exquisite Handcrafted Timepiece';
}

export function getDisplayData(product, variant = null) {
    if (!product) return { name: '', price: 0, image: '', isConfigurable: false };

    const isConfig = product.productType === 'configurable' || product.isConfigurable;
    
    // DETERMINISTIC SELECTION: Use variant only if explicitly provided.
    // Fallback to first variant ONLY for price/meta if product-level defaults are missing.
    const targetVariant = variant;
    const fallbackVariant = isConfig ? product.variants?.[0] : null;

    const priceValue = isConfig 
        ? (targetVariant?.sellingPrice || targetVariant?.price || fallbackVariant?.sellingPrice || fallbackVariant?.price || product.sellingPrice || product.price)
        : (product.sellingPrice || product.price);

    return {
        id: product.id?.toString(),
        variantId: targetVariant?.id?.toString(),
        name: product.name || product.title,
        subtitle: formatSubtitle(targetVariant, product, fallbackVariant),
        isConfigurable: isConfig,
        variant: targetVariant || fallbackVariant,
        price: Number(priceValue || 0),
        formattedPrice: `₹${Number(priceValue || 0).toLocaleString('en-IN')}`,
        image: resolveProductImage(product, targetVariant),
        heroBgImage: resolveProductBackground(product, targetVariant),
        slug: product.slug,
        sku: targetVariant?.sku || fallbackVariant?.sku || product.sku
    };
}



export function resolveProductImage(product, variant = null) {
  if (!product) return '/assets/fylex-watch-v2/premium.png';

  let resolvedPath = null;
  
  // 1. PRIORITY: Explicitly selected variant MAIN / Primary image
  if (variant) {
    const vImages = variant.variantImages || [];
    if (vImages.length > 0) {
      const mainImg = vImages.find(img => img.type === 'MAIN' || img.isPrimary || img.type === 'PRIMARY') || vImages[0];
      resolvedPath = extractMediaPath(mainImg);
    }
  }

  // 1.5. PRIORITY: Starred / Primary Variant image (If variant is not explicitly passed)
  if (!resolvedPath && product.variants?.length > 0) {
    const primaryV = product.variants.find(v => v.isDefault || v.isPrimary);
    if (primaryV) {
      const vImages = primaryV.variantImages || [];
      if (vImages.length > 0) {
        const mainImg = vImages.find(img => img.type === 'MAIN' || img.isPrimary || img.type === 'PRIMARY') || vImages[0];
        resolvedPath = extractMediaPath(mainImg);
      }
    }
  }

  // 2. PRIORITY: Product-level Default MAIN Media (Source of Truth)
  if (!resolvedPath && product.productMedia?.length > 0) {
    const mainMedia = product.productMedia.find(m => m.type === 'MAIN' || m.isPrimary || m.type === 'PRIMARY') || product.productMedia[0];
    resolvedPath = extractMediaPath(mainMedia);
  }

  // 3. PRIORITY: First variant MAIN media (If productMedia is empty)
  if (!resolvedPath && product.variants?.length > 0) {
    for (const firstV of product.variants) {
      const vImages = firstV.variantImages || [];
      if (vImages.length > 0) {
        const mainImg = vImages.find(img => img.type === 'MAIN' || img.isPrimary || img.type === 'PRIMARY') || vImages[0];
        resolvedPath = extractMediaPath(mainImg);
        if (resolvedPath) break;
      }
    }
  }

  // 4. LEGACY FALLBACK: images array
  if (!resolvedPath && product.images?.length > 0) {
    const imgs = Array.isArray(product.images) ? product.images : (typeof product.images === 'string' ? JSON.parse(product.images) : []);
    if (imgs.length > 0) resolvedPath = extractMediaPath(imgs[0]);
  }

  // 5. LEGACY FALLBACK: heroImage field
  if (!resolvedPath && product.heroImage) {
    resolvedPath = extractMediaPath(product.heroImage);
  }

  return resolvedPath ? getFileUrl(resolvedPath) : '/assets/fylex-watch-v2/premium.png';
}

export function resolveProductBackground(product, variant = null) {
  if (!product) return null;

  let resolvedPath = null;

  // 1. PRIORITY: Variant Background
  if (variant) {
    const vImages = variant.variantImages || [];
    const bgImg = vImages.find(img => img.type === 'HERO_BG');
    if (bgImg) resolvedPath = extractMediaPath(bgImg);
  }

  // 2. PRIORITY: Product Background
  if (!resolvedPath && product.productMedia?.length > 0) {
    const bgMedia = product.productMedia.find(m => m.type === 'HERO_BG');
    if (bgMedia) resolvedPath = extractMediaPath(bgMedia);
  }

  // 3. PRIORITY: Product-level Hero Background
  if (!resolvedPath && product.discoverHeroBgImage) {
    resolvedPath = extractMediaPath(product.discoverHeroBgImage);
  }

  return resolvedPath ? getFileUrl(resolvedPath) : null;
}

export function serializeConfig(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && key !== 'watch' && key !== 'mode') {
      searchParams.append(key, value);
    }
  });
  return searchParams.toString();
}

/**
 * Calculates optimal text color (#ffffff vs #1a1a1a) based on background color luminance.
 */
export function getContrastTextColor(bgColor, fallbackTextColor = null) {
  if (!bgColor || typeof bgColor !== 'string') return fallbackTextColor || '#ffffff';
  let hex = bgColor.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) return fallbackTextColor || '#ffffff';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  if (yiq < 128) return '#ffffff';
  return (fallbackTextColor && fallbackTextColor !== '#1a1a1a' && fallbackTextColor !== '#000000') ? fallbackTextColor : '#1a1a1a';
}

/**
 * Returns page-specific theme colors for discover, products, or preConfigure.
 */
export function getPageTheme(product, pageName = 'discover', overrides = null) {
  if (!product) {
    return { bg: 'var(--ds-bg-primary)', textColor: 'var(--ds-text-primary)', accentColor: 'var(--ds-brand-secondary)', gradient: null };
  }

  // Support for the new PageTheme Architecture
  let pageThemeData = {};
  if (product.pageThemes && Array.isArray(product.pageThemes)) {
    const pt = product.pageThemes.find(t => t.pageName === pageName);
    if (pt && pt.themeJson) {
      try {
        pageThemeData = typeof pt.themeJson === 'string' ? JSON.parse(pt.themeJson) : pt.themeJson;
      } catch (e) {}
    }
  }

  // Legacy fallback via product.theme
  let legacyThemeConfig = {};
  if (product.themeConfig) {
    legacyThemeConfig = typeof product.themeConfig === 'string' ? JSON.parse(product.themeConfig) : product.themeConfig;
  } else if (product.theme && product.theme.startsWith('{')) {
    try { legacyThemeConfig = JSON.parse(product.theme); } catch (e) {}
  }

  const prefix = pageName;
  const customBg = (overrides && overrides[`${prefix}Bg`]) || pageThemeData.bgColor || legacyThemeConfig[`${prefix}Bg`] || product[`${prefix}Bg`];
  const customText = (overrides && overrides[`${prefix}TextColor`]) || pageThemeData.textColor || legacyThemeConfig[`${prefix}TextColor`] || product[`${prefix}TextColor`];
  const customAccent = (overrides && overrides[`${prefix}AccentColor`]) || pageThemeData.accentColor || legacyThemeConfig[`${prefix}AccentColor`] || product[`${prefix}AccentColor`];
  const customGradient = (overrides && overrides[`${prefix}Gradient`]) || pageThemeData.gradient || legacyThemeConfig[`${prefix}Gradient`] || product[`${prefix}Gradient`];

  const bg = customBg || product.bgColor || 'var(--ds-bg-primary)';
  
  let textColor = customText;
  if (!textColor) {
    if (customBg) {
      textColor = getContrastTextColor(customBg);
    } else {
      textColor = product.textColor || 'var(--ds-text-primary)';
    }
  }

  const accentColor = customAccent || product.accentColor || 'var(--ds-brand-secondary)';
  const gradient = customGradient || (pageName === 'discover' ? product.gradient : null);

  return { bg, textColor, accentColor, gradient };
}


