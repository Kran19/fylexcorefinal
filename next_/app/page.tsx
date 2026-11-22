import React from 'react';
import HomeClient, { HomeInitialData } from '@/components/HomeClient';

export const dynamic = 'force-dynamic';

// Lightweight 20-second in-memory SSR cache so repeat visits & PageSpeed runs respond in <15ms TTFB
let cachedHomePayload: HomeInitialData | null = null;
let cachedAtMs = 0;
const SSR_CACHE_TTL_MS = 20_000;

function normalizeFileUrl(path: any): string {
  if (!path) return '';
  if (typeof path === 'object') {
    const m = path.media || path;
    path = m?.url || m?.filePath || m?.path || m?.fileName || '';
  }
  if (typeof path !== 'string') return '';
  const clean = path.trim();
  if (!clean) return '';
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
    if (clean.includes('/uploads/')) {
      return '/api/' + clean.slice(clean.indexOf('/uploads/') + 1);
    }
    return clean;
  }
  if (clean.startsWith('/assets/') || clean.startsWith('/watch/')) return clean;
  const key = clean.replace(/^\/+/, '').replace(/^(api\/)?uploads\//, '');
  return `/api/uploads/${key}`;
}

async function fetchJsonFast(baseUrl: string, endpoint: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 900);
  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? json;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getHomeInitialData(): Promise<HomeInitialData | undefined> {
  const now = Date.now();
  if (cachedHomePayload && now - cachedAtMs < SSR_CACHE_TTL_MS) {
    return cachedHomePayload;
  }

  const candidateBases = [
    process.env.INTERNAL_API_URL,
    'http://backend:3001/api',
    'http://127.0.0.1:5000/api',
    'http://127.0.0.1:3001/api',
  ].filter(Boolean) as string[];

  let activeBase: string | null = null;
  let sectionsRaw: any = null;

  for (const base of candidateBases) {
    const probe = await fetchJsonFast(base, '/cms/home-sections');
    if (probe !== null) {
      activeBase = base;
      sectionsRaw = probe;
      break;
    }
  }

  if (!activeBase) {
    return undefined;
  }

  const [featuredRaw, bannersRaw, settingsRaw, communityRaw] = await Promise.all([
    fetchJsonFast(activeBase, '/products/featured'),
    fetchJsonFast(activeBase, '/cms/banners'),
    fetchJsonFast(activeBase, '/system/settings'),
    fetchJsonFast(activeBase, '/cms/community-images'),
  ]);

  const homeSections: Record<string, boolean> = {
    s1: true,
    s2: true,
    s3: true,
    s4: true,
    featured: true,
    gallery: true,
  };

  const sectionList = Array.isArray(sectionsRaw)
    ? sectionsRaw
    : Array.isArray(sectionsRaw?.data)
    ? sectionsRaw.data
    : [];

  if (sectionList.length > 0) {
    const mapped: Record<string, boolean> = {};
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
      mapped[s.type] = isVis;
      if (s.type === 'home_s1' || s.type === 's1' || s.type === 'Section 1') mapped.s1 = isVis;
      if (s.type === 'home_s2' || s.type === 's2' || s.type === 'Section 2') mapped.s2 = isVis;
      if (s.type === 'home_s3' || s.type === 's3' || s.type === 'Section 3') mapped.s3 = isVis;
      if (s.type === 'home_s4' || s.type === 's4' || s.type === 'Section 4') mapped.s4 = isVis;
    });
    Object.assign(homeSections, mapped);
  }

  const videoSettings: Record<string, any> = {};
  const settingsList = Array.isArray(settingsRaw)
    ? settingsRaw
    : Array.isArray(settingsRaw?.data)
    ? settingsRaw.data
    : [];
  settingsList.forEach((s: any) => {
    if (s?.key) videoSettings[s.key] = s.value;
  });

  const communityList = Array.isArray(communityRaw)
    ? communityRaw
    : Array.isArray(communityRaw?.data)
    ? communityRaw.data
    : [];

  const communityImages = communityList
    .map((img: any) => ({
      src: normalizeFileUrl(img.image || img.imageUrl || img.image_url || img.url),
      alt: img.title || 'The FYLEX World',
      rotation: Number(img.rotation) || 0,
    }))
    .filter((img: any) => Boolean(img.src));

  const payload: HomeInitialData = {
    hydratedFromServer: true,
    featuredProducts: Array.isArray(featuredRaw) ? featuredRaw : [],
    banners: Array.isArray(bannersRaw) ? bannersRaw : [],
    videoSettings,
    homeSections,
    communityImages,
  };

  cachedHomePayload = payload;
  cachedAtMs = now;
  return payload;
}

export default async function HomePage() {
  const initialData = await getHomeInitialData();
  return <HomeClient initialData={initialData} />;
}
