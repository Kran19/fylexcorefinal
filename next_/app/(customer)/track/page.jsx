"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TrackRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      router.replace('/profile');
    }
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '2.5px solid rgba(255, 255, 255, 0.2)',
        borderTopColor: '#ffffff',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
