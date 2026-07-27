"use client";
import React, { useState, useRef, useEffect } from 'react';

export default function ExportMenu({ onExportCSV, onPrint }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          color: '#334155',
          cursor: 'pointer'
        }}
      >
        <i className="fas fa-download" style={{ fontSize: '12px', color: '#6366f1' }}></i>
        Export
        <i className="fas fa-chevron-down" style={{ fontSize: '10px', marginLeft: '2px', opacity: 0.7 }}></i>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            padding: '6px',
            minWidth: '160px',
            zIndex: 100,
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <button
            onClick={() => { onExportCSV(); setOpen(false); }}
            style={itemStyle}
          >
            <i className="fas fa-file-csv" style={{ color: '#10b981', width: '16px' }}></i>
            Export CSV
          </button>
          <button
            onClick={() => { onPrint(); setOpen(false); }}
            style={itemStyle}
          >
            <i className="fas fa-print" style={{ color: '#6366f1', width: '16px' }}></i>
            Print Table
          </button>
        </div>
      )}
    </div>
  );
}

const itemStyle = {
  width: '100%',
  padding: '8px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '13px',
  fontWeight: 600,
  color: '#1e293b',
  background: 'transparent',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.15s'
};
