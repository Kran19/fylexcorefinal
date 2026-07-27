"use client";
import React from 'react';

export default function LoadingTable({ rows = 6 }) {
  return (
    <div style={{ padding: '24px', background: '#ffffff', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              padding: '16px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              animation: 'pulse 1.5s infinite ease-in-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '60%' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e2e8f0' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '70%' }}>
                <div style={{ height: '14px', width: '60%', borderRadius: '4px', background: '#cbd5e1' }}></div>
                <div style={{ height: '10px', width: '35%', borderRadius: '4px', background: '#e2e8f0' }}></div>
              </div>
            </div>
            <div style={{ height: '24px', width: '80px', borderRadius: '999px', background: '#e2e8f0' }}></div>
            <div style={{ height: '32px', width: '70px', borderRadius: '8px', background: '#e2e8f0' }}></div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
