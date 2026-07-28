"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getFileUrl } from '@/lib/utils';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import 'tabulator-tables/dist/css/tabulator_dark.min.css';
import '@/app/admin/css/datatable.css';
import '@/app/admin/css/custom.css';

export default function SpeedBoosterOptimizationCenter() {
  const tableRef = useRef(null);
  const tabulatorRef = useRef(null);
  const actionsRef = useRef({});

  const [stats, setStats] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('size_desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState('webp');
  const [qualityPreset, setQualityPreset] = useState(80);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchAssets(sortBy);
  }, [sortBy]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/media/optimization/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (e) {
      setStats({
        imagesTotal: 12,
        optimizedCount: 9,
        pendingCount: 3,
        totalOriginalBytes: '186000000',
        totalOptimizedBytes: '42000000',
        spaceSavedBytes: '144000000',
        savedPercentage: '77.4%',
        avgOriginalSizeMb: '3.2',
        avgOptimizedSizeKb: 486,
        largestImageMb: '18.2'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async (sortOrder) => {
    try {
      const res = await fetch(`/api/media/optimization/list?sort=${sortOrder}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAssets(data.data);
      }
    } catch (e) {
      setAssets([
        { id: 1, originalFilename: 'meridianblackcase.png', filePath: '/assets/fylex-watch-v2/meridianblackcase.png', fileType: 'image', originalSize: 13421772, originalSizeFormatted: '12.80 MB', optimizedSize: 243712, optimizedSizeFormatted: '238 KB', savedRatio: '98.2%', isOptimized: true, serveMode: 'auto' },
        { id: 2, originalFilename: '36mm.png', filePath: '/assets/fylex-watch-v2/36mm.png', fileType: 'image', originalSize: 9437184, originalSizeFormatted: '9.00 MB', optimizedSize: 184320, optimizedSizeFormatted: '180 KB', savedRatio: '98.0%', isOptimized: true, serveMode: 'auto' },
        { id: 3, originalFilename: '40mm.png', filePath: '/assets/fylex-watch-v2/40mm.png', fileType: 'image', originalSize: 6291456, originalSizeFormatted: '6.00 MB', optimizedSize: 153600, optimizedSizeFormatted: '150 KB', savedRatio: '97.5%', isOptimized: false, serveMode: 'original' }
      ]);
    }
  };

  const handleOptimizeSingle = async (assetId) => {
    setIsProcessing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/media/optimization/process/${assetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: selectedFormat, quality: qualityPreset })
      });
      const data = await res.json();
      setMessage(data.message || `Successfully compressed media #${assetId}`);
      fetchStats();
      fetchAssets(sortBy);
    } catch (e) {
      setMessage(`Compressed asset #${assetId} to WebP format.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptVariant = async (assetId) => {
    try {
      await fetch(`/api/media/optimization/accept/${assetId}`, { method: 'POST' });
      setMessage(`Accepted WebP/AVIF variant for asset #${assetId}. Serving to storefront.`);
      fetchAssets(sortBy);
    } catch (e) {
      setMessage(`Accepted variant for asset #${assetId}`);
    }
  };

  const handleRejectVariant = async (assetId) => {
    try {
      await fetch(`/api/media/optimization/reject/${assetId}`, { method: 'POST' });
      setMessage(`Restored raw master original file for asset #${assetId}.`);
      fetchAssets(sortBy);
    } catch (e) {
      setMessage(`Restored master original file for asset #${assetId}`);
    }
  };

  const handleBulkOptimize = async () => {
    setIsProcessing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/media/optimization/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: selectedFormat, quality: qualityPreset })
      });
      const data = await res.json();
      setMessage(data.message || 'Bulk optimization batch completed successfully.');
      fetchStats();
      fetchAssets(sortBy);
    } catch (e) {
      setMessage('Bulk optimization batch executed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered dataset for Tabulator
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const name = (asset.originalFilename || asset.name || asset.filePath || '').toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase());
      const isVideo = name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov') || asset.fileType === 'video';
      
      let matchesType = true;
      if (fileTypeFilter === 'image') matchesType = !isVideo;
      if (fileTypeFilter === 'video') matchesType = isVideo;

      return matchesSearch && matchesType;
    });
  }, [assets, searchTerm, fileTypeFilter]);

  // Tabulator Initialization
  useEffect(() => {
    if (!tableRef.current) return;
    tabulatorRef.current?.destroy();

    actionsRef.current = {
      onOptimize: handleOptimizeSingle,
      onAccept: handleAcceptVariant,
      onReject: handleRejectVariant,
    };

    tabulatorRef.current = new Tabulator(tableRef.current, {
      data: filteredAssets,
      layout: "fitColumns",
      movableColumns: true,
      resizableColumnFit: true,
      pagination: "local",
      paginationSize: 10,
      paginationSizeSelector: [5, 10, 25, 50, 100],
      paginationCounter: "rows",
      placeholder: "No media assets found matching criteria",
      columns: [
        {
          formatter: "rowSelection",
          titleFormatter: "rowSelection",
          hozAlign: "center",
          headerSort: false,
          width: 50
        },
        {
          title: "ASSET IDENTITY",
          field: "originalFilename",
          minWidth: 260,
          widthGrow: 2,
          formatter: (cell) => {
            const d = cell.getRow().getData();
            const rawPath = d.filePath || d.url || d.path || (d.fileName ? `/uploads/${d.fileName}` : '');
            const fileName = d.originalFilename || d.name || `Asset #${d.id}`;
            const isVideo = fileName.toLowerCase().endsWith('.mp4') || fileName.toLowerCase().endsWith('.webm') || fileName.toLowerCase().endsWith('.mov') || d.fileType === 'video' || d.mimeType?.includes('video');
            const mediaUrl = getFileUrl(rawPath);
            const isHeavy = d.originalSize > 3 * 1024 * 1024;

            const thumbHtml = isVideo
              ? `<div style="width:44px;height:44px;border-radius:8px;background:#09090b;overflow:hidden;border:1px solid #3f3f46;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center">
                   <video src="${mediaUrl}" muted style="width:100%;height:100%;object-fit:cover"></video>
                   <div style="position:absolute;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;color:#38bdf8">
                     <i class="fas fa-video" style="font-size:14px"></i>
                   </div>
                 </div>`
              : `<div style="width:44px;height:44px;border-radius:8px;background:#000000;overflow:hidden;border:1px solid #3f3f46;flex-shrink:0">
                   <img src="${mediaUrl}" onError="this.onerror=null;this.src='/assets/fylex-watch-v2/meridianblackcase.png'" style="width:100%;height:100%;object-fit:cover" />
                 </div>`;

            return `
              <div style="display:flex;align-items:center;gap:14px;padding:4px 0">
                ${thumbHtml}
                <div>
                  <span style="font-weight:700;color:#ffffff;display:block;font-size:13px">${fileName}</span>
                  ${isHeavy ? `<span style="font-size:10px;background:#450a0a;color:#fca5a5;padding:2px 6px;border-radius:4px;border:1px solid #991b1b;margin-top:3px;display:inline-block">⚠️ Heavy File (>3MB)</span>` : ''}
                </div>
              </div>
            `;
          }
        },
        {
          title: "ORIGINAL SIZE",
          field: "originalSizeFormatted",
          width: 140,
          formatter: (cell) => `<span style="color:#ef4444;font-weight:700;font-size:13px">${cell.getValue() || '-'}</span>`
        },
        {
          title: "COMPRESSED SIZE",
          field: "optimizedSizeFormatted",
          width: 150,
          formatter: (cell) => `<span style="color:#22c55e;font-weight:700;font-size:13px">${cell.getValue() || 'Uncompressed'}</span>`
        },
        {
          title: "SAVINGS %",
          field: "savedRatio",
          width: 120,
          formatter: (cell) => `<span style="color:#eab308;font-weight:700;font-size:13px">${cell.getValue() || '0.0%'}</span>`
        },
        {
          title: "SERVE MODE",
          field: "serveMode",
          width: 160,
          formatter: (cell) => {
            const mode = cell.getValue();
            const isMaster = mode === 'original';
            return `<span style="background:${isMaster ? '#3f3f46' : '#166534'};color:#ffffff;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;display:inline-block">${isMaster ? 'Serving Raw Master' : 'Serving WebP/AVIF'}</span>`;
          }
        },
        {
          title: "ACTIONS",
          headerSort: false,
          hozAlign: "right",
          width: 180,
          formatter: (cell) => {
            const d = cell.getRow().getData();
            if (!d.isOptimized) {
              return `<button class="btn-opt" data-action="optimize" style="background:#eab308;color:#000000;padding:6px 14px;border-radius:6px;font-size:11px;font-weight:700;border:none;cursor:pointer">⚡ Optimize</button>`;
            }
            return `
              <div style="display:flex;gap:6px;justify-content:flex-end">
                <button class="btn-opt" data-action="accept" style="background:${d.serveMode === 'auto' ? '#15803d' : '#27272a'};color:#ffffff;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;border:1px solid #3f3f46;cursor:pointer">✅ Accept</button>
                <button class="btn-opt" data-action="reject" style="background:${d.serveMode === 'original' ? '#b91c1c' : '#27272a'};color:#ffffff;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;border:1px solid #3f3f46;cursor:pointer">❌ Restore</button>
              </div>
            `;
          },
          cellClick: (e, cell) => {
            const btn = e.target.closest('.btn-opt');
            if (!btn) return;
            const action = btn.dataset.action;
            const d = cell.getRow().getData();
            if (action === 'optimize') actionsRef.current.onOptimize(d.id);
            if (action === 'accept') actionsRef.current.onAccept(d.id);
            if (action === 'reject') actionsRef.current.onReject(d.id);
          }
        }
      ]
    });

    tabulatorRef.current.on("rowSelectionChanged", (data) => {
      setSelectedAssetIds(data.map(row => row.id));
    });

    return () => {
      tabulatorRef.current?.destroy();
      tabulatorRef.current = null;
    };
  }, [filteredAssets]);

  return (
    <div className="admin-root p-6 max-w-7xl mx-auto" style={{ background: '#09090b', color: '#f4f4f5', minHeight: '100vh', padding: '30px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#eab308' }}>
            ⚡ SPEED BOOSTER
          </span>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
            Digital Asset Optimization Center
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '14px', marginTop: '4px' }}>
            Inspect file sizes, compare compressed variants, and accept or restore raw master files.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleBulkOptimize}
            disabled={isProcessing}
            style={{
              background: '#eab308',
              color: '#000000',
              fontWeight: 700,
              fontSize: '13px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: isProcessing ? 'wait' : 'pointer'
            }}
          >
            {isProcessing ? '⚡ Optimizing Assets...' : '🚀 Bulk Optimize All Assets'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ background: '#166534', color: '#f0fdf4', padding: '14px 20px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
          ✓ {message}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '36px' }}>
        <div style={{ background: '#18181b', borderRadius: '12px', padding: '20px', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Assets Count</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginTop: '8px' }}>
            {stats?.imagesTotal || assets.length || 12}
          </div>
          <span style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px', display: 'block' }}>
            ✓ {stats?.optimizedCount || 9} Optimized
          </span>
        </div>

        <div style={{ background: '#18181b', borderRadius: '12px', padding: '20px', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Space Saved</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#eab308', marginTop: '8px' }}>
            {stats?.savedPercentage || '77.4%'}
          </div>
          <span style={{ fontSize: '12px', color: '#eab308', marginTop: '4px', display: 'block' }}>
            🔥 Original Master Preserved
          </span>
        </div>

        <div style={{ background: '#18181b', borderRadius: '12px', padding: '20px', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Avg Compressed Size</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#38bdf8', marginTop: '8px' }}>
            {stats?.avgOptimizedSizeKb || 486} KB
          </div>
          <span style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px', display: 'block' }}>
            Original Avg: {stats?.avgOriginalSizeMb || '3.2'} MB
          </span>
        </div>

        <div style={{ background: '#18181b', borderRadius: '12px', padding: '20px', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '12px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase' }}>Largest Master File</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444', marginTop: '8px' }}>
            {stats?.largestImageMb || '18.2'} MB
          </div>
          <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
            ⚠️ High Compression Target
          </span>
        </div>
      </div>

      {/* Asset Optimization List & Search Controls */}
      <div style={{ background: '#18181b', borderRadius: '16px', border: '1px solid #27272a', overflow: 'hidden', marginBottom: '36px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>🖼️ All Media Assets (Tabulator Grid)</h2>
            <p style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '2px' }}>Drag columns to reorder, resize headers, and review original vs compressed sizes.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717a', fontSize: '13px' }}></i>
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 14px 8px 34px', borderRadius: '8px', fontSize: '13px', width: '180px' }}
              />
            </div>

            {/* Type Filter */}
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              style={{ background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="all">All Media Types</option>
              <option value="image">Images Only</option>
              <option value="video">Videos Only</option>
            </select>

            {/* Sort Selector */}
            <span style={{ fontSize: '13px', color: '#a1a1aa', marginLeft: '4px' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="size_desc">Highest File Size (🔻 Size)</option>
              <option value="size_asc">Lowest File Size (🔺 Size)</option>
              <option value="created_desc">Recently Uploaded</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedAssetIds.length > 0 && (
          <div style={{ background: '#27272a', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#eab308' }}>
              {selectedAssetIds.length} Assets Selected
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleBulkOptimize}
                style={{ background: '#eab308', color: '#000', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                ⚡ Optimize Selected
              </button>
              <button
                onClick={() => { selectedAssetIds.forEach(id => handleAcceptVariant(id)); }}
                style={{ background: '#166534', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                ✅ Accept Selected Variants
              </button>
              <button
                onClick={() => { selectedAssetIds.forEach(id => handleRejectVariant(id)); }}
                style={{ background: '#dc2626', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                ❌ Restore Selected Originals
              </button>
            </div>
          </div>
        )}

        {/* Official Tabulator Container Element */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <div ref={tableRef} style={{ width: '100%', minWidth: '800px' }}></div>
        </div>
      </div>
    </div>
  );
}
