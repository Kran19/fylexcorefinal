"use client";
import React, { Suspense } from 'react';
import Script from 'next/script';
import Header from './Header';
import Footer from './Footer';
import SmoothScroll from './SmoothScroll';
import MetaPixelTracker from './MetaPixelTracker';
import { usePathname } from 'next/navigation';

export default function GlobalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isAdminPath = pathname.startsWith('/admin');
  const hideHeader = ['/pre-configure'].includes(pathname);
  const hideFooter = ['/customize', '/login', '/signup', '/cart', '/checkout', '/pre-configure', '/configure', '/customer/configure', '/customer/discover'].includes(pathname);
  const shouldPreloadMagicSdk = ['/cart', '/checkout', '/explore', '/configure', '/pre-configure'].some((p) => pathname.startsWith(p));

  if (isAdminPath) {
    return <>{children}</>;
  }

  return (
    <SmoothScroll>
      <Suspense fallback={null}>
        <MetaPixelTracker />
      </Suspense>
      {shouldPreloadMagicSdk && (
        <Script
          id="razorpay-magic-sdk"
          src="https://checkout.razorpay.com/v1/magic-checkout.js"
          strategy="lazyOnload"
        />
      )}
      {!hideHeader && <Header />}
      {children}
      {!hideFooter && <Footer />}
    </SmoothScroll>
  );
}
