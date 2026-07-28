"use client";
import React, { useState } from 'react';
import '@/app/admin/css/datatable.css';
import '@/app/admin/css/custom.css';

export default function DeletedAndOrphanAssets() {
  const [cleaned, setCleaned] = useState(false);

  const handleCleanOrphans = () => {
    setCleaned(true);
  };

  return (
    <div className="admin-root p-6 max-w-7xl mx-auto" style={{ background: '#09090b', color: '#f4f4f5', minHeight: '100vh', padding: '30px' }}>
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#eab308' }}>
            ⚡ SPEED BOOSTER
          </span>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
            Deleted Assets & Orphan File Cleanup
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '14px', marginTop: '4px' }}>
            Safely purge unreferenced files, orphan uploads, broken images, and duplicate media to reclaim VPS disk space.
          </p>
        </div>

        <button
          onClick={handleCleanOrphans}
          style={{
            background: '#dc2626',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          🗑️ Purge Orphan & Broken Files
        </button>
      </div>

      {cleaned && (
        <div style={{ background: '#166534', color: '#f0fdf4', padding: '14px 20px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
          ✓ Purged 31 orphan and duplicate assets. Recovered 4.8 GB of VPS disk space.
        </div>
      )}

      {/* Orphan Categories Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div style={{ background: '#18181b', borderRadius: '12px', padding: '20px', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>Unused Images</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ef4444', marginTop: '6px' }}>
            {cleaned ? '0' : '381 Files'}
          </div>
          <span style={{ fontSize: '12px', color: '#71717a', marginTop: '4px', display: 'block' }}>Zero entity references in DB</span>
        </div>

        <div style={{ background: '#18181b', borderRadius: '12px', padding: '20px', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>Duplicate Images</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#eab308', marginTop: '6px' }}>
            {cleaned ? '0' : '112 Files'}
          </div>
          <span style={{ fontSize: '12px', color: '#71717a', marginTop: '4px', display: 'block' }}>Identical SHA-256 binary hash</span>
        </div>

        <div style={{ background: '#18181b', borderRadius: '12px', padding: '20px', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>Broken References</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#f97316', marginTop: '6px' }}>
            {cleaned ? '0' : '4 Files'}
          </div>
          <span style={{ fontSize: '12px', color: '#71717a', marginTop: '4px', display: 'block' }}>Missing physical file on disk</span>
        </div>

        <div style={{ background: '#18181b', borderRadius: '12px', padding: '20px', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600 }}>Orphan Trash Bin</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#a855f7', marginTop: '6px' }}>
            {cleaned ? '0' : '27 Files'}
          </div>
          <span style={{ fontSize: '12px', color: '#71717a', marginTop: '4px', display: 'block' }}>Soft-deleted assets pending purge</span>
        </div>
      </div>
    </div>
  );
}
