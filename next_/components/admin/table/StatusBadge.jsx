"use client";
import React from 'react';

const STATUS_MAP = {
  // Positive / Active states (Green)
  active: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: 'fa-circle' },
  published: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: 'fa-check-circle' },
  completed: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: 'fa-check-double' },
  delivered: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: 'fa-box' },
  paid: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: 'fa-credit-card' },
  verified: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: 'fa-user-check' },

  // Muted / Inactive states (Slate)
  inactive: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', icon: 'fa-circle' },
  draft: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', icon: 'fa-file-alt' },
  archived: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', icon: 'fa-archive' },
  disabled: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', icon: 'fa-ban' },

  // In-progress / Pending states (Indigo / Blue)
  pending: { bg: '#eef0ff', color: '#4f46e5', border: '#c7d2fe', icon: 'fa-clock' },
  processing: { bg: '#eef0ff', color: '#4f46e5', border: '#c7d2fe', icon: 'fa-sync-alt' },
  'in transit': { bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd', icon: 'fa-truck' },

  // Negative / Danger states (Rose Red)
  cancelled: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: 'fa-times-circle' },
  refunded: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: 'fa-undo' },
  failed: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: 'fa-exclamation-triangle' },

  // Warning states (Amber)
  warning: { bg: '#fffbeb', color: '#d97706', border: '#fde68a', icon: 'fa-exclamation-circle' },
  'low stock': { bg: '#fffbeb', color: '#d97706', border: '#fde68a', icon: 'fa-layer-group' },
};

export default function StatusBadge({ status, label }) {
  const key = (status || label || '').toString().toLowerCase().trim();
  const config = STATUS_MAP[key] || STATUS_MAP.inactive;
  const displayLabel = label || status || 'N/A';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        lineHeight: 1.2
      }}
    >
      <i className={`fas ${config.icon}`} style={{ fontSize: '8px' }}></i>
      {displayLabel}
    </span>
  );
}
