"use client";
import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackMetaPageView } from '@/lib/metaPixel';

/**
 * Tracks client-side App Router navigation PageViews for Meta Pixel on customer storefront routes.
 * Skips initial hydration (since layout.tsx inline snippet fires initial PageView) and skips /admin routes.
 */
export default function MetaPixelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    trackMetaPageView();
  }, [pathname, searchParams]);

  return null;
}
