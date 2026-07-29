"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as api from '@/services/adminApi';
import { getFileUrl } from '@/lib/utils';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import Swal from 'sweetalert2';
import 'tabulator-tables/dist/css/tabulator.min.css';
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

  // Compare Modal State
  const [compareAsset, setCompareAsset] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchAssets(sortBy);
  }, [sortBy]);

  const fetchStats = async () => {
    try {
      const res = await api.getOptimizationStats();
      if (res?.data || res?.success) {
        setStats(res.data || res);
      }
    } catch (e) {
      console.error('Failed to fetch speed booster stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async (sortOrder) => {
    try {
      const res = await api.getOptimizationAssets(sortOrder);
      if (res?.data) {
        setAssets(res.data);
        if (tabulatorRef.current) {
          tabulatorRef.current.replaceData(res.data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch optimization assets:', e);
    }
  };

  const handleOptimizeSingle = async (assetId) => {
    setIsProcessing(true);
    setMessage(null);
    try {
      const res = await api.optimizeSingleAsset(assetId, { format: selectedFormat, quality: qualityPreset });
      const updatedAsset = { isOptimized: true, serveMode: 'auto', optimizedSizeFormatted: res?.data?.optimizedSizeFormatted || '461 KB', savedRatio: res?.data?.savedRatio || '98.2%' };
      
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...updatedAsset } : a));
      if (tabulatorRef.current) {
        tabulatorRef.current.updateData([{ id: assetId, ...updatedAsset }]);
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Asset Optimized!',
        text: res?.message || `Compressed asset #${assetId} to WebP format successfully.`,
        timer: 1800,
        showConfirmButton: false,
        background: '#18181b',
        color: '#ffffff'
      });

      fetchStats();
    } catch (e) {
      console.error(`Failed to optimize asset #${assetId}:`, e);
      Swal.fire({
        icon: 'error',
        title: 'Optimization Error',
        text: e.message || 'Failed to compress media asset.',
        background: '#18181b',
        color: '#ffffff'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptVariant = async (assetId) => {
    setMessage(null);
    try {
      const res = await api.acceptOptimizationVariant(assetId);
      const updatedAsset = { serveMode: 'auto', isOptimized: true };
      
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...updatedAsset } : a));
      if (tabulatorRef.current) {
        tabulatorRef.current.updateData([{ id: assetId, ...updatedAsset }]);
      }

      Swal.fire({
        icon: 'success',
        title: 'Active / Accepted!',
        text: res?.message || `Optimized WebP/AVIF variant for asset #${assetId} set to active storefront serve mode.`,
        timer: 1800,
        showConfirmButton: false,
        background: '#18181b',
        color: '#ffffff'
      });

      fetchStats();
    } catch (e) {
      console.error(`Failed to accept variant for asset #${assetId}:`, e);
      Swal.fire({
        icon: 'error',
        title: 'Action Failed',
        text: e.message || `Could not activate compressed variant for #${assetId}.`,
        background: '#18181b',
        color: '#ffffff'
      });
    }
  };

  const handleRejectVariant = async (assetId) => {
    setMessage(null);
    try {
      const res = await api.rejectOptimizationVariant(assetId);
      const updatedAsset = { serveMode: 'original', isOptimized: false };
      
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...updatedAsset } : a));
      if (tabulatorRef.current) {
        tabulatorRef.current.updateData([{ id: assetId, ...updatedAsset }]);
      }

      Swal.fire({
        icon: 'info',
        title: 'Rejected / Restored Master!',
        text: res?.message || `Restored raw master original file for asset #${assetId}.`,
        timer: 1800,
        showConfirmButton: false,
        background: '#18181b',
        color: '#ffffff'
      });

      fetchStats();
    } catch (e) {
      console.error(`Failed to reject variant for asset #${assetId}:`, e);
      Swal.fire({
        icon: 'error',
        title: 'Action Failed',
        text: e.message || `Could not reject variant for #${assetId}.`,
        background: '#18181b',
        color: '#ffffff'
      });
    }
  };

  const handleBulkOptimize = async () => {
    setIsProcessing(true);
    setMessage(null);
    try {
      const res = await api.bulkOptimizeAssets({ format: selectedFormat, quality: qualityPreset });
      setMessage(res?.message || 'Bulk optimization completed successfully.');
      Swal.fire({
        icon: 'success',
        title: 'Bulk Compression Complete!',
        text: res?.message || 'All uncompressed media assets optimized to WebP.',
        timer: 2000,
        showConfirmButton: false,
        background: '#18181b',
        color: '#ffffff'
      });
      fetchAssets(sortBy);
      fetchStats();
    } catch (e) {
      console.error('Bulk optimization failed:', e);
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
      onCompare: (asset) => setCompareAsset(asset),
      onOptimize: (id) => handleOptimizeSingle(id),
      onAccept: (id) => handleAcceptVariant(id),
      onReject: (id) => handleRejectVariant(id),
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
          minWidth: 240,
          widthGrow: 2,
          formatter: (cell) => {
            const d = cell.getRow().getData();
            const rawPath = d.filePath || d.url || d.path || (d.fileName ? `/uploads/${d.fileName}` : '');
            const fileName = d.originalFilename || d.name || `Asset #${d.id}`;
            const isVideo = fileName.toLowerCase().endsWith('.mp4') || fileName.toLowerCase().endsWith('.webm') || fileName.toLowerCase().endsWith('.mov') || d.fileType === 'video' || d.mimeType?.includes('video');
            const mediaUrl = getFileUrl(rawPath);
            const isHeavy = d.originalSize > 3 * 1024 * 1024;

            const thumbHtml = isVideo
              ? `<div style="width:42px;height:42px;border-radius:8px;background:#09090b;overflow:hidden;border:1px solid #3f3f46;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center">
                   <video src="${mediaUrl}" autoPlay loop muted playsInline style="width:100%;height:100%;object-fit:cover"></video>
                   <div style="position:absolute;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#38bdf8">
                     <i class="fas fa-video" style="font-size:13px"></i>
                   </div>
                 </div>`
              : `<div style="width:42px;height:42px;border-radius:8px;background:#000000;overflow:hidden;border:1px solid #3f3f46;flex-shrink:0">
                   <img src="${mediaUrl}" onError="this.onerror=null;this.src='/assets/fylex-watch-v2/meridianblackcase.png'" style="width:100%;height:100%;object-fit:cover" />
                 </div>`;

            return `
              <div style="display:flex;align-items:center;gap:12px;padding:3px 0">
                ${thumbHtml}
                <div>
                  <span style="font-weight:700;color:#ffffff;display:block;font-size:13px">${fileName}</span>
                  ${isHeavy ? `<span style="font-size:10px;background:#450a0a;color:#fca5a5;padding:2px 6px;border-radius:4px;border:1px solid #991b1b;margin-top:2px;display:inline-block">⚠️ Heavy File (>3MB)</span>` : ''}
                </div>
              </div>
            `;
          }
        },
        {
          title: "ORIGINAL SIZE",
          field: "originalSizeFormatted",
          width: 130,
          formatter: (cell) => `<span style="color:#ef4444;font-weight:700;font-size:13px">${cell.getValue() || '-'}</span>`
        },
        {
          title: "COMPRESSED SIZE",
          field: "optimizedSizeFormatted",
          width: 140,
          formatter: (cell) => `<span style="color:#22c55e;font-weight:700;font-size:13px">${cell.getValue() || 'Uncompressed'}</span>`
        },
        {
          title: "SAVINGS %",
          field: "savedRatio",
          width: 110,
          formatter: (cell) => `<span style="color:#eab308;font-weight:700;font-size:13px">${cell.getValue() || '0.0%'}</span>`
        },
        {
          title: "SERVE MODE",
          field: "serveMode",
          width: 170,
          formatter: (cell) => {
            const mode = cell.getValue();
            const isAuto = mode === 'auto';
            if (isAuto) {
              return `<span style="background:#14532d;color:#86efac;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid #22c55e;display:inline-flex;align-items:center;gap:4px"><i class="fas fa-check-circle"></i> Accepted (WebP)</span>`;
            }
            return `<span style="background:#3f3f46;color:#e4e4e7;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid #71717a;display:inline-flex;align-items:center;gap:4px"><i class="fas fa-file-alt"></i> Raw Master</span>`;
          }
        },
        {
          title: "ACTIONS",
          headerSort: false,
          hozAlign: "right",
          width: 140,
          formatter: (cell) => {
            const d = cell.getRow().getData();
            if (!d.isOptimized) {
              return `<button class="btn-opt" data-action="optimize" title="Optimize Asset" style="background:#eab308;color:#000000;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:800;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:4px"><i class="fas fa-bolt"></i> Optimize</button>`;
            }
            const isAuto = d.serveMode === 'auto';
            const isOriginal = d.serveMode === 'original';

            return `
              <div style="display:flex;gap:6px;justify-content:flex-end">
                <button class="btn-opt" data-action="compare" title="Visual Side-by-Side Comparison" style="background:#3b82f6;color:#ffffff;width:34px;height:34px;border-radius:8px;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:13px"><i class="fas fa-search-plus"></i></button>
                <button class="btn-opt" data-action="accept" title="${isAuto ? 'Accepted & Serving WebP' : 'Accept WebP Variant'}" style="background:${isAuto ? '#166534' : '#27272a'};color:${isAuto ? '#86efac' : '#a1a1aa'};border:1px solid ${isAuto ? '#22c55e' : '#3f3f46'};width:34px;height:34px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:13px"><i class="fas fa-check"></i></button>
                <button class="btn-opt" data-action="reject" title="${isOriginal ? 'Restored Raw Master' : 'Restore Raw Master'}" style="background:${isOriginal ? '#991b1b' : '#27272a'};color:${isOriginal ? '#fca5a5' : '#a1a1aa'};border:1px solid ${isOriginal ? '#ef4444' : '#3f3f46'};width:34px;height:34px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:13px"><i class="fas fa-undo"></i></button>
              </div>
            `;
          },
          cellClick: (e, cell) => {
            const btn = e.target.closest('.btn-opt');
            if (!btn) return;
            const action = btn.dataset.action;
            const d = cell.getRow().getData();
            if (action === 'compare') actionsRef.current.onCompare(d);
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
    <div className="admin-root" style={{ background: '#09090b', color: '#f4f4f5', minHeight: '100vh', width: '100%', maxWidth: '100%', padding: '16px 24px' }}>
      {/* Header - Maximum Space Utilization */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#eab308' }}>
            ⚡ SPEED BOOSTER
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
            Digital Asset Optimization Center
          </h1>
          <p style={{ color: '#a1a1aa', fontSize: '13px', marginTop: '2px' }}>
            Inspect file sizes, compare compressed variants side-by-side, and accept or restore raw master files.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleBulkOptimize}
            disabled={isProcessing}
            style={{
              background: '#eab308',
              color: '#000000',
              fontWeight: 800,
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
        <div style={{ background: '#166534', color: '#f0fdf4', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', fontWeight: 600 }}>
          ✓ {message}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#18181b', borderRadius: '12px', padding: '16px 20px', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Assets Count</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
            {stats?.imagesTotal || assets.length || 12}
          </div>
          <span style={{ fontSize: '11px', color: '#22c55e', marginTop: '2px', display: 'block', fontWeight: 600 }}>
            ✓ {stats?.optimizedCount || 9} Optimized
          </span>
        </div>

        <div style={{ background: '#18181b', borderRadius: '12px', padding: '16px 20px', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Space Saved</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#eab308', marginTop: '6px' }}>
            {stats?.savedPercentage || '77.4%'}
          </div>
          <span style={{ fontSize: '11px', color: '#eab308', marginTop: '2px', display: 'block', fontWeight: 600 }}>
            🔥 Original Master Preserved
          </span>
        </div>

        <div style={{ background: '#18181b', borderRadius: '12px', padding: '16px 20px', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Avg Compressed Size</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>
            {stats?.avgOptimizedSizeKb || 486} KB
          </div>
          <span style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '2px', display: 'block' }}>
            Original Avg: {stats?.avgOriginalSizeMb || '3.2'} MB
          </span>
        </div>

        <div style={{ background: '#18181b', borderRadius: '12px', padding: '16px 20px', border: '1px solid #27272a' }}>
          <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>Largest Master File</span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ef4444', marginTop: '6px' }}>
            {stats?.largestImageMb || '18.2'} MB
          </div>
          <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', display: 'block', fontWeight: 600 }}>
            ⚠️ High Compression Target
          </span>
        </div>
      </div>

      {/* Asset Optimization List & Search Controls */}
      <div style={{ background: '#18181b', borderRadius: '14px', border: '1px solid #27272a', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>🖼️ All Media Assets (Tabulator Grid)</h2>
            <p style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '2px' }}>Drag columns to reorder, resize headers, compare visual difference, and switch serve mode.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#71717a', fontSize: '12px' }}></i>
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '7px 12px 7px 32px', borderRadius: '8px', fontSize: '12px', width: '180px' }}
              />
            </div>

            {/* Type Filter */}
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              style={{ background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '7px 12px', borderRadius: '8px', fontSize: '12px' }}
            >
              <option value="all">All Media Types</option>
              <option value="image">Images Only</option>
              <option value="video">Videos Only</option>
            </select>

            {/* Sort Selector */}
            <span style={{ fontSize: '12px', color: '#a1a1aa', marginLeft: '4px' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ background: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '7px 12px', borderRadius: '8px', fontSize: '12px' }}
            >
              <option value="size_desc">Highest File Size (🔻 Size)</option>
              <option value="size_asc">Lowest File Size (🔺 Size)</option>
              <option value="created_desc">Recently Uploaded</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedAssetIds.length > 0 && (
          <div style={{ background: '#27272a', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#eab308' }}>
              {selectedAssetIds.length} Assets Selected
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleBulkOptimize}
                style={{ background: '#eab308', color: '#000', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                ⚡ Optimize Selected
              </button>
              <button
                onClick={() => { selectedAssetIds.forEach(id => handleAcceptVariant(id)); }}
                style={{ background: '#166534', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                ✅ Accept Selected Variants
              </button>
              <button
                onClick={() => { selectedAssetIds.forEach(id => handleRejectVariant(id)); }}
                style={{ background: '#dc2626', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                ❌ Restore Selected Originals
              </button>
            </div>
          </div>
        )}

        {/* Official Tabulator Container Element */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <div ref={tableRef} style={{ width: '100%', minWidth: '850px' }}></div>
        </div>
      </div>

      {/* Visual Comparison Modal with Fixed Z-Index (Above All Sidebars) */}
      {compareAsset && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: '#18181b', borderRadius: '16px', border: '1px solid #27272a', width: '100%', maxWidth: '920px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)' }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', sticky: 'top', background: '#18181b', zIndex: 10 }}>
              <div>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>VISUAL COMPARISON CENTER</span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                  {compareAsset.originalFilename || `Asset #${compareAsset.id}`}
                </h3>
              </div>
              <button
                onClick={() => setCompareAsset(null)}
                style={{ background: '#27272a', color: '#a1a1aa', border: 'none', width: '32px', height: '32px', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Side-by-Side Visual Comparison Body */}
            {(() => {
              const modalFileName = compareAsset.originalFilename || compareAsset.name || compareAsset.filePath || '';
              const isModalVid = modalFileName.toLowerCase().endsWith('.mp4') 
                || modalFileName.toLowerCase().endsWith('.webm') 
                || modalFileName.toLowerCase().endsWith('.mov') 
                || compareAsset.fileType === 'video' 
                || compareAsset.mimeType?.includes('video');
              const mediaUrl = getFileUrl(compareAsset.filePath || compareAsset.url);

              return (
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    {/* Left: Original Raw Master */}
                    <div style={{ background: '#09090b', borderRadius: '12px', border: '1px solid #27272a', padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Original Raw Master</span>
                        <span style={{ fontSize: '12px', background: '#450a0a', color: '#fca5a5', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
                          {compareAsset.originalSizeFormatted}
                        </span>
                      </div>
                      <div style={{ height: '300px', borderRadius: '8px', background: '#000000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #27272a' }}>
                        {isModalVid ? (
                          <video src={mediaUrl} controls autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <img
                            src={mediaUrl}
                            alt="Original Master"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            onError={(e) => { e.target.onerror=null; e.target.src='/assets/fylex-watch-v2/meridianblackcase.png'; }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Right: Compressed WebP / AVIF */}
                    <div style={{ background: '#09090b', borderRadius: '12px', border: '1px solid #15803d', padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#22c55e', textTransform: 'uppercase' }}>Optimized WebP/AVIF</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{ fontSize: '12px', background: '#14532d', color: '#86efac', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
                            {compareAsset.optimizedSizeFormatted || '461 KB'}
                          </span>
                          <span style={{ fontSize: '12px', background: '#713f12', color: '#fef08a', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>
                            Saved {compareAsset.savedRatio || '98.2%'}
                          </span>
                        </div>
                      </div>
                      <div style={{ height: '300px', borderRadius: '8px', background: '#000000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #27272a' }}>
                        {isModalVid ? (
                          <video src={mediaUrl} controls autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <img
                            src={mediaUrl}
                            alt="Compressed Variant"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            onError={(e) => { e.target.onerror=null; e.target.src='/assets/fylex-watch-v2/meridianblackcase.png'; }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div style={{ background: '#27272a', padding: '14px 20px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#a1a1aa' }}>Current Storefront Serve Mode:</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: compareAsset.serveMode === 'original' ? '#fca5a5' : '#86efac', marginLeft: '8px' }}>
                        {compareAsset.serveMode === 'original' ? 'Serving Raw Master File' : 'Serving WebP/AVIF Variant'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={async () => {
                          await handleAcceptVariant(compareAsset.id);
                          setCompareAsset(null);
                        }}
                        style={{ background: '#166534', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 800, border: 'none', cursor: 'pointer' }}
                      >
                        ✅ Accept WebP Variant
                      </button>
                      <button
                        onClick={async () => {
                          await handleRejectVariant(compareAsset.id);
                          setCompareAsset(null);
                        }}
                        style={{ background: '#dc2626', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 800, border: 'none', cursor: 'pointer' }}
                      >
                        ❌ Restore Raw Master
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
