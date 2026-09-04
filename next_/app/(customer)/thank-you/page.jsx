"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import './thank-you.css';

const ThankYouPage = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div 
      className="thank-you-container"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#08080a',
        padding: '40px 20px',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className={`thank-you-card ${visible ? 'fade-in' : ''}`}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#111114',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '28px',
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.75)',
          boxSizing: 'border-box'
        }}
      >
        <div className="icon-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <img 
            src="/preload/fylex_logo.png" 
            alt="Fylex" 
            className="logo-icon" 
            style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.src = '/fylex_logo.png'; }} 
          />
        </div>

        <h1 
          className="title"
          style={{
            fontSize: '36px',
            fontWeight: 800,
            color: '#ffffff',
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}
        >
          Thank You
        </h1>
        
        <p 
          className="subtitle"
          style={{
            fontSize: '16px',
            color: '#34d399',
            fontWeight: 600,
            margin: '0 0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Your order has been placed successfully
        </p>

        <div 
          className="divider" 
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
            margin: '0 0 24px'
          }}
        />

        <p 
          className="message"
          style={{
            fontSize: '15px',
            lineHeight: 1.65,
            color: '#d4d4d8',
            margin: '0 0 36px',
            padding: '0 8px'
          }}
        >
          We've received your request and are currently processing your luxury timepiece.
          A confirmation message has been sent to your WhatsApp.
        </p>

        <div 
          className="actions"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%'
          }}
        >
          {/* Primary CTA: Customer Profile & Order History */}
          <Link 
            href="/profile" 
            className="thank-you-btn thank-you-btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '52px',
              padding: '0 24px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              background: '#ffffff',
              color: '#000000',
              border: '1px solid #ffffff',
              boxShadow: '0 4px 18px rgba(255, 255, 255, 0.22)',
              textDecoration: 'none',
              boxSizing: 'border-box'
            }}
          >
            View My Orders & Profile
          </Link>

          {/* Secondary CTA: Purchased Collection Cards */}
          <Link 
            href="/my-purchases" 
            className="thank-you-btn thank-you-btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '52px',
              padding: '0 24px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              textDecoration: 'none',
              boxSizing: 'border-box'
            }}
          >
            Your Collection
          </Link>

          {/* Tertiary CTA: Browse More Timepieces */}
          <Link 
            href="/discover" 
            className="thank-you-btn thank-you-btn-tertiary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '46px',
              padding: '0 24px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              background: 'transparent',
              color: '#a1a1aa',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              textDecoration: 'none',
              boxSizing: 'border-box'
            }}
          >
            Continue Exploring
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
