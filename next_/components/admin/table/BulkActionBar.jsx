"use client";
import React from 'react';

export default function BulkActionBar({ selectedCount = 0, onClear, onBulkDelete, onBulkActivate, onBulkDeactivate }) {
  if (selectedCount === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 990,
        background: '#0f172a',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '999px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>
        <i className="fas fa-check-circle" style={{ color: '#10b981', marginRight: '8px' }}></i>
        {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
      </span>

      <div style={{ height: '16px', width: '1px', background: 'rgba(255,255,255,0.2)' }}></div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onBulkActivate && (
          <button onClick={onBulkActivate} style={btnStyle('#10b981')}>
            <i className="fas fa-check"></i> Activate
          </button>
        )}

        {onBulkDeactivate && (
          <button onClick={onBulkDeactivate} style={btnStyle('#64748b')}>
            <i className="fas fa-ban"></i> Deactivate
          </button>
        )}

        {onBulkDelete && (
          <button onClick={onBulkDelete} style={btnStyle('#ef4444')}>
            <i className="fas fa-trash-alt"></i> Delete
          </button>
        )}

        <button onClick={onClear} style={btnStyle('transparent')}>
          Clear
        </button>
      </div>
    </div>
  );
}

function btnStyle(bgColor) {
  return {
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    background: bgColor === 'transparent' ? 'rgba(255,255,255,0.1)' : bgColor,
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'transform 0.15s'
  };
}
