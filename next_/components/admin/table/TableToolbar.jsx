"use client";
import React, { useState, useEffect } from 'react';
import ExportMenu from './ExportMenu';

export default function TableToolbar({
  title,
  subtitle,
  totalRecords = 0,
  searchQuery = '',
  onSearchChange,
  density = 'default',
  onDensityChange,
  onExportCSV,
  onPrint,
  action
}) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearchChange && localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '20px 24px',
        background: '#ffffff',
        borderBottom: '1px solid #f1f5f9',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        flexWrap: 'wrap',
        gap: '16px'
      }}
    >
      {/* Left Title & Counter */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          <span
            style={{
              padding: '2px 10px',
              borderRadius: '999px',
              background: '#e0e7ff',
              color: '#4338ca',
              fontSize: '12px',
              fontWeight: 800
            }}
          >
            {totalRecords.toLocaleString()}
          </span>
        </div>
        {subtitle && <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>{subtitle}</p>}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Global Debounced Search Input */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <i
            className="fas fa-search"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '13px'
            }}
          ></i>
          <input
            type="text"
            placeholder="Search all columns..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              transition: 'border 0.2s',
              background: '#f8fafc'
            }}
          />
          {localSearch && (
            <button
              onClick={() => { setLocalSearch(''); onSearchChange && onSearchChange(''); }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-times-circle"></i>
            </button>
          )}
        </div>

        {/* Density Mode Switcher */}
        {onDensityChange && (
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}
            title="Density Mode"
          >
            <button
              onClick={() => onDensityChange('compact')}
              style={densityBtnStyle(density === 'compact')}
              title="Compact (40px)"
            >
              <i className="fas fa-bars" style={{ fontSize: '10px' }}></i>
            </button>
            <button
              onClick={() => onDensityChange('default')}
              style={densityBtnStyle(density === 'default')}
              title="Default (52px)"
            >
              <i className="fas fa-list" style={{ fontSize: '10px' }}></i>
            </button>
            <button
              onClick={() => onDensityChange('comfortable')}
              style={densityBtnStyle(density === 'comfortable')}
              title="Comfortable (64px)"
            >
              <i className="fas fa-th-list" style={{ fontSize: '10px' }}></i>
            </button>
          </div>
        )}

        {/* Export Menu */}
        {onExportCSV && <ExportMenu onExportCSV={onExportCSV} onPrint={onPrint} />}

        {/* Primary Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
            }}
          >
            {action.icon && <i className={action.icon}></i>}
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function densityBtnStyle(active) {
  return {
    padding: '5px 10px',
    borderRadius: '7px',
    border: 'none',
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#4f46e5' : '#64748b',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    cursor: 'pointer',
    fontWeight: 700,
    transition: 'all 0.15s'
  };
}
