"use client";
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/context/OrderContext';
import { downloadInvoice } from '@/services/order.service';
import { getFileUrl } from '@/lib/utils';

export default function MyPurchases() {
  const { orders } = useOrder();
  const router = useRouter();

  // Helper to build redirect URL to explore page
  const buildRedirectUrl = (item) => {
    const productId = item.productId || item.product?.id || item.product_id;
    if (!productId) return '/explore';
    
    let url = `/explore?watch=${productId}`;
    const variant = item.productVariant || item.variant;
    
    if (variant && variant.id) {
      url += `&variant=${variant.id}`;
    }
    return url;
  };

  // Helper to build variant name from attributes
  const getVariantName = (item) => {
    const variant = item.productVariant || item.variant;
    if (variant?.variantAttributes && variant.variantAttributes.length > 0) {
      return variant.variantAttributes.map(va => va.attributeValue?.label).join(', ');
    }
    return item.subtitle || item.titleAccent || '';
  };

  // Flatten orders into individual item cards, expanding for quantity
  const allPurchasedUnits = orders.flatMap(order => 
    order.items.flatMap(item => 
      Array.from({ length: item.qty || 1 }, (_, i) => ({
        ...item,
        orderDate: order.date,
        orderId: order.orderId || order.id,
        orderNumber: order.orderNumber || order.id,
        trackingUrl: order.trackingUrl || order.shipments?.[0]?.trackingUrl || (order.shipments?.[0]?.trackingNumber ? `https://shiprocket.co/tracking/${order.shipments[0].trackingNumber}` : null),
        carrier: order.carrier || order.shipments?.[0]?.carrier || 'Shiprocket',
        trackingNumber: order.trackingNumber || order.shipments?.[0]?.trackingNumber || null,
        redirectUrl: buildRedirectUrl(item),
        variantDisplay: getVariantName(item)
      }))
    )
  );

  return (
    <div className="purchases-page">
      <style>{`
        .purchases-page {
          min-height: 100vh;
          padding: 160px 5% 80px;
          background: #000000;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
        }
        .purchases-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .purchases-header {
          margin-bottom: 30px;
          text-align: center;
        }
        .purchases-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 10px;
          letter-spacing: -0.02em;
        }
        .purchases-header p {
          color: #aaaaaa;
          font-size: 1.1rem;
        }

        .purchases-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }

        .purchase-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          position: relative;
          cursor: pointer;
          transition: transform 0.3s ease, border-color 0.3s ease, background 0.3s ease;
          overflow: hidden;
          text-decoration: none;
        }
        .purchase-card:hover {
          transform: translateY(-5px);
        }

        .purchase-img-wrap {
          width: 100%;
          height: 450px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: transparent;
        }
        .purchase-img-wrap img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .purchase-info {
          padding: 0 40px 40px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .purchase-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
        .purchase-order-id {
          font-size: 0.75rem;
          color: #aaaaaa;
          font-weight: 500;
        }
        .btn-support-container {
          margin-top: auto;
          display: flex;
          justify-content: center;
          padding-top: 15px;
        }
        .btn-support {
          background: #ffffff;
          color: #000000;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 9px;
          padding: 8px 16px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: all 0.3s ease;
        }
        .btn-support:hover {
          background: #e0e0e0;
        }

        .purchase-date {
          font-size: 0.8rem;
          font-weight: 700;
          color: #aaaaaa;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .purchase-name {
          font-size: 1.8rem;
          font-weight: 700;
          color: #ffffff;
          // margin: 0 0 8px;
          line-height: 1.2;
        }
        .v-accent {
          display: block;
          color: #aaaaaa;
          font-size: 1.1rem;
          font-weight: 400;
         
        }

        .purchases-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 40vh;
          text-align: center;
          padding: 40px 0;
        }
        .purchases-empty svg {
          display: none;
        }
        .purchases-empty h2 {
          font-size: 1.2rem;
          margin-bottom: 20px;
          font-weight: 500;
          color: #ffffff;
        }
        .purchases-empty p {
          display: none;
        }
        .empty-cta {
          display: inline-block;
          padding: 10px 20px;
          background: #ffffff;
          color: #000000;
          text-decoration: none;
          font-size: 10px;
          font-weight: 700;
          transition: background 0.3s;
          text-transform: uppercase;
          border-radius: 999px;
          letter-spacing: 0.1em;
        }
        .empty-cta:hover {
          background: #e0e0e0;
        }
        
        .get-help-btn {
          display: inline-block;
          margin-top: 15px;
          padding: 10px 20px;
          background: transparent;
          color: #ffffff;
          border: 1px solid #ffffff;
          text-decoration: none;
          font-size: 10px;
          font-weight: 700;
          transition: background 0.3s, color 0.3s;
          text-transform: uppercase;
          border-radius: 999px;
          letter-spacing: 0.1em;
        }
        .get-help-btn:hover {
          background: #ffffff;
          color: #000000;
        }

        @media (max-width: 1024px) {
          .purchases-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .purchase-img-wrap {
            height: 350px;
          }
        }

        @media (max-width: 600px) {
          .purchases-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .purchases-page {
            padding: 90px 3% 60px;
          }
          .purchase-info {
            padding: 0 15px 15px;
          }
          .purchase-img-wrap {
            height: 150px;
            padding: 20px;
          }
          .purchase-name {
            font-size: 1.1rem;
          }
          .v-accent {
            font-size: 0.9rem;
          }
          .purchase-date {
            font-size: 0.7rem;
          }
        }
      `}</style>

      <div className="purchases-container">
        <div className="purchases-header">
          <h1>Your Collection</h1>
          <p>Chronicles of your journey with Fylex.</p>
        </div>

        {allPurchasedUnits.length === 0 ? (
          <div className="purchases-empty">
            <h2>No purchases made yet.</h2>
            <Link href="/products" className="empty-cta">Browse Collection</Link>
            <Link href="#" className="get-help-btn">Get Help</Link>
          </div>
        ) : (
          <div className="purchases-grid">
            {allPurchasedUnits.map((unit, idx) => (
              <div 
                key={`${unit.orderId}-${unit.id}-${idx}`} 
                onClick={() => router.push(unit.redirectUrl)} 
                className="purchase-card"
              >
                <div className="purchase-img-wrap">
                  <img
                    src={getFileUrl(unit.image || unit.heroImage || unit.productVariant?.variantImages?.[0]?.media?.filePath) || '/Rim.webp'}
                    alt={unit.title}
                    onError={(e) => { e.currentTarget.src = '/Rim.webp'; }}
                  />
                </div>
                <div className="purchase-info">
                  <div className="purchase-meta">
                    <span className="purchase-date">{unit.orderDate}</span>
                    <span className="purchase-order-id">Order #{unit.orderId}</span>
                  </div>
                  <h3 className="purchase-name">
                    {unit.title}
                  </h3>
                  {unit.variantDisplay && <span className="v-accent">{unit.variantDisplay}</span>}

                  <div className="btn-support-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '15px' }}>
                    <button 
                      className="btn-support" 
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/profile?tab=track&order_id=${unit.orderNumber || unit.orderId}`);
                      }}
                    >
                      Track Order
                    </button>
                    {unit.trackingUrl && (
                      <a 
                        href={unit.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-support" 
                        style={{ 
                          background: 'rgba(56, 189, 248, 0.12)', 
                          color: '#38bdf8', 
                          border: '1px solid rgba(56, 189, 248, 0.35)', 
                          textDecoration: 'none', 
                          textAlign: 'center',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Live Shiprocket ↗</span>
                      </a>
                    )}
                    <button 
                      className="btn-support" 
                      style={{ background: 'transparent', color: '#fff', border: '1px solid #fff' }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const idToDownload = unit.orderId || unit.orderNumber || unit.id;
                        if (idToDownload) {
                          await downloadInvoice(idToDownload, true);
                        }
                      }}
                    >
                      Download Invoice
                    </button>
                    {unit.redirectUrl && unit.redirectUrl.includes('configure') && (
                      <button 
                        className="btn-support" 
                        style={{ background: 'transparent', color: '#fff', border: '1px solid #fff' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(unit.redirectUrl);
                        }}
                      >
                        Configure
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
