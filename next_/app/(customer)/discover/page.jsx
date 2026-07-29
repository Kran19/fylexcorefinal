"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/customer/Header';
import Footer from '@/components/customer/Footer';
import * as api from '@/services/adminApi';

const getFileUrl = (path) => {
  if (!path) return '/uploads/placeholder.png';
  if (path.startsWith('http')) return path;
  const clean = path.replace(/\\/g, '/');
  return clean.startsWith('/') ? `http://localhost:5000${clean}` : `http://localhost:5000/${clean}`;
};

function DiscoverPageContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const { data, success } = await api.getProducts({ page: 1, limit: 12 });
        if (success && data) {
          setProducts(data.products || data || []);
        }
      } catch (err) {
        console.error('Error loading discover products:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  return (
    <div style={{ background: '#09090b', color: '#ffffff', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <Header />

      <main style={{ paddingTop: '120px', paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#c4a35a' }}>
            FYLEX DISCOVER COLLECTION
          </span>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', marginTop: '8px' }}>
            Discover Timepiece Excellence
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '15px', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0' }}>
            Explore iconic models, custom handcrafted designs, and luxury watch specifications.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#a1a1aa', fontSize: '14px' }}>Loading Discover Collection...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '32px' }}>
            {products.map((prod) => {
              const mainImg = getFileUrl(prod.heroImage?.url || prod.heroImage?.filePath || prod.heroImage);
              return (
                <div key={prod.id} style={{ background: '#18181b', borderRadius: '20px', border: '1px solid #27272a', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', borderRadius: '14px' }}>
                      <img src={mainImg} alt={prod.title || prod.name} style={{ maxHeight: '190px', maxWidth: '90%', objectFit: 'contain' }} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>{prod.title || prod.name}</h3>
                    <p style={{ fontSize: '13px', color: '#a1a1aa', marginBottom: '16px', lineClamp: 2 }}>{prod.subtitle || prod.shortDesc || 'Luxury handcrafted timepiece.'}</p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <Link href={`/explore?watch=${prod.id}`} style={{ flex: 1, padding: '12px', borderRadius: '999px', background: '#27272a', color: '#ffffff', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', textDecoration: 'none', letterSpacing: '0.08em' }}>
                      Explore
                    </Link>
                    <Link href={`/configure?watch=${prod.id}`} style={{ flex: 1, padding: '12px', borderRadius: '999px', background: '#c4a35a', color: '#000000', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', textDecoration: 'none', letterSpacing: '0.08em' }}>
                      Configure
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div style={{ background: '#09090b', height: '100vh' }}></div>}>
      <DiscoverPageContent />
    </Suspense>
  );
}
