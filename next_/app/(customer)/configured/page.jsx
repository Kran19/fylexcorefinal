"use client";
import React, { Suspense } from 'react';
import { DiscoverContent } from '../explore/page';

export default function ConfiguredPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#09090b' }}></div>}>
      <DiscoverContent isConfiguredMode={true} />
    </Suspense>
  );
}
