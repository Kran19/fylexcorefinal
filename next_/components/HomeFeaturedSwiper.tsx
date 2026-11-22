// @ts-nocheck
"use client";
import React from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { getDisplayData } from '@/lib/utils';

export default function HomeFeaturedSwiper({
  featuredProducts,
  isMobile,
}: {
  featuredProducts: any[];
  isMobile: boolean;
}) {
  return (
    <Swiper
      modules={[Autoplay, Pagination]}
      spaceBetween={0}
      slidesPerView={isMobile ? 1 : 2}
      autoplay={{ delay: 5000, disableOnInteraction: false }}
      pagination={{
        clickable: true,
        dynamicBullets: false,
      }}
      loop={featuredProducts.length >= (isMobile ? 1 : 2)}
      className="featured-swiper"
    >
      {featuredProducts.map((p) => {
        const display = getDisplayData(p);

        return (
          <SwiperSlide key={p.id}>
            <div className="featured-item-v2" style={{ background: p.gradient || p.bgColor || '#f5f5f5' }}>
              {display.image && (
                <img
                  src={display.image}
                  alt={display.name}
                  className="featured-img-v2"
                  loading="lazy"
                  decoding="async"
                  width={500}
                  height={500}
                />
              )}
              <div className="featured-content" style={{ color: p.textColor || '#111', zIndex: 2 }}>
                <div className="f-label" style={{ color: p.accentColor || '#555' }}>{p.subtitle || p.tagline}</div>
                <div className="f-title" style={{ color: 'inherit' }}>{display.name} <em>{p.titleAccent || ''}</em></div>
                <div className="f-price flex items-baseline gap-2" style={{ margin: '4px 0 14px', fontSize: '1.1rem', fontWeight: 500 }}>
                  <span>{display.isConfigurable ? 'From ' : ''}{display.formattedPrice}</span>
                  {display.isDiscounted && display.formattedComparePrice && (
                    <span className="line-through text-xs opacity-60 font-normal">
                      {display.formattedComparePrice}
                    </span>
                  )}
                  {display.isDiscounted && display.discountPercent > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-700 border border-amber-500/30">
                      {display.discountPercent}% OFF
                    </span>
                  )}
                </div>
                <Link href={`/configure?watch=${p.id}`} className="f-shop-btn" aria-label={`Shop ${display.name}`}>
                  Shop
                </Link>
              </div>
            </div>
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
}
