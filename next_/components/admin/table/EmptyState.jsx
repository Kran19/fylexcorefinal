"use client";
import React from 'react';

export default function EmptyState({
  title = "No records found",
  description = "We couldn't find any records matching your search or filters.",
  onResetFilters,
  onCreateNew,
  createLabel = "Create New"
}) {
  return (
    <div
      style={{
        padding: '60px 24px',
        textAlign: 'center',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#f1f5f9',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          fontSize: '24px',
          marginBottom: '16px'
        }}
      >
        <i className="fas fa-search"></i>
      </div>

      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '400px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
        {description}
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="btn-secondary"
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-undo mr-2"></i> Reset Filters
          </button>
        )}

        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="btn-primary"
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 700,
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-plus mr-2"></i> {createLabel}
          </button>
        )}
      </div>
    </div>
  );
}
