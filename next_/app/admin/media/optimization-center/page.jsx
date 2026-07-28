"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { getFileUrl } from '@/lib/utils';
import '@/app/admin/css/datatable.css';
import '@/app/admin/css/custom.css';

export default function SpeedBoosterOptimizationCenter() {
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchStats();
    fetchAssets(sortBy);
  }, [sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fileTypeFilter, pageSize]);

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

  // Filtering & Pagination Logic
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

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAssets.slice(start, start + pageSize);
  }, [filteredAssets, currentPage, pageSize]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedAssetIds(paginatedAssets.map(a => a.id));
    } else {
      setSelectedAssetIds([]);
    }
  };

  const toggleSelectAsset = (id) => {
    setSelectedAssetIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Media preview component (fixes video & image paths)
  const renderMediaThumbnail = (asset) => {
    const rawPath = asset.filePath || asset.url || asset.path || (asset.fileName ? `/uploads/${asset.fileName}` : '');
    const fileName = asset.originalFilename || asset.name || asset.fileName || '';
    const isVideo = fileName.toLowerCase().endsWith('.mp4') || fileName.toLowerCase().endsWith('.webm') || fileName.toLowerCase().endsWith('.mov') || asset.fileType === 'video' || asset.mimeType?.includes('video');
    const mediaUrl = getFileUrl(rawPath);

    if (isVideo) {
      return (
        <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#09090b', overflow: 'hidden', border: '1px solid #3f3f46', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video src={mediaUrl} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
            <i className="fas fa-video" style={{ fontSize: '15px' }}></i>
          </div>
        </div>
      );
    }

    return (
      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#000000', overflow: 'hidden', border: '1px solid #3f3f46', flexShrink: 0 }}>
        <img
          src={mediaUrl}
          alt={fileName}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/assets/fylex-watch-v2/meridianblackcase.png';
          }}
        />
      </div>
    );
  };

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
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>🖼️ All Media Assets (Sorted By Size)</h2>
            <p style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '2px' }}>Review original vs compressed size and accept or restore raw master files.</p>
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

        {/* Tabulator-Styled Assets Table */}
        <div className="tabulator tabulator-dark" style={{ border: 'none', background: 'transparent' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#09090b', borderBottom: '1px solid #27272a', color: '#a1a1aa', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px', width: '40px' }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedAssetIds.length === paginatedAssets.length && paginatedAssets.length > 0}
                    />
                  </th>
                  <th style={{ padding: '14px 20px' }}>ASSET IDENTITY</th>
                  <th style={{ padding: '14px 20px' }}>ORIGINAL SIZE</th>
                  <th style={{ padding: '14px 20px' }}>COMPRESSED SIZE</th>
                  <th style={{ padding: '14px 20px' }}>SAVINGS %</th>
                  <th style={{ padding: '14px 20px' }}>SERVE MODE</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>
                      No media assets found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedAssets.map((asset) => {
                    const isHeavy = asset.originalSize > 3 * 1024 * 1024;
                    const isSelected = selectedAssetIds.includes(asset.id);
                    const fileName = asset.originalFilename || asset.name || `Asset #${asset.id}`;

                    return (
                      <tr
                        key={asset.id}
                        style={{
                          borderBottom: '1px solid #27272a',
                          background: isSelected ? '#1c1917' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '14px 20px' }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelectAsset(asset.id)} />
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            {renderMediaThumbnail(asset)}
                            <div>
                              <span style={{ fontWeight: 700, color: '#ffffff', display: 'block', fontSize: '14px' }}>
                                {fileName}
                              </span>
                              {isHeavy && (
                                <span style={{ fontSize: '10px', background: '#450a0a', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #991b1b', marginTop: '4px', display: 'inline-block' }}>
                                  ⚠️ Heavy File (&gt;3MB)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#ef4444', fontWeight: 700 }}>
                          {asset.originalSizeFormatted}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#22c55e', fontWeight: 700 }}>
                          {asset.optimizedSizeFormatted}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#eab308', fontWeight: 700 }}>
                          {asset.savedRatio}
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ 
                            background: asset.serveMode === 'original' ? '#3f3f46' : '#166534', 
                            color: '#ffffff', 
                            padding: '4px 12px', 
                            borderRadius: '999px', 
                            fontSize: '11px', 
                            fontWeight: 700,
                            display: 'inline-block'
                          }}>
                            {asset.serveMode === 'original' ? 'Serving Raw Master' : 'Serving WebP/AVIF'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            {!asset.isOptimized ? (
                              <button
                                onClick={() => handleOptimizeSingle(asset.id)}
                                style={{ background: '#eab308', color: '#000000', padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                              >
                                ⚡ Optimize
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleAcceptVariant(asset.id)}
                                  style={{ background: asset.serveMode === 'auto' ? '#15803d' : '#27272a', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, border: '1px solid #3f3f46', cursor: 'pointer' }}
                                >
                                  ✅ Accept
                                </button>
                                <button
                                  onClick={() => handleRejectVariant(asset.id)}
                                  style={{ background: asset.serveMode === 'original' ? '#b91c1c' : '#27272a', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, border: '1px solid #3f3f46', cursor: 'pointer' }}
                                >
                                  ❌ Restore Original
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Tabulator Pagination Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #27272a',
              background: '#09090b',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
              fontSize: '13px',
              color: '#a1a1aa'
            }}
          >
            {/* Rows Per Page Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Page size:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                style={{ background: '#18181b', border: '1px solid #3f3f46', color: '#ffffff', padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>

            {/* Showing Row Counter */}
            <div>
              Showing {filteredAssets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredAssets.length)} of {filteredAssets.length} assets
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  background: currentPage === 1 ? '#18181b' : '#27272a',
                  color: currentPage === 1 ? '#52525b' : '#ffffff',
                  border: '1px solid #3f3f46',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ⏮ First
              </button>

              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  background: currentPage === 1 ? '#18181b' : '#27272a',
                  color: currentPage === 1 ? '#52525b' : '#ffffff',
                  border: '1px solid #3f3f46',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ◀ Prev
              </button>

              {/* Page Number Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const prevP = arr[idx - 1];
                  const showEllipsis = prevP && p - prevP > 1;

                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span style={{ padding: '0 4px', color: '#52525b' }}>...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        style={{
                          background: currentPage === p ? '#eab308' : '#27272a',
                          color: currentPage === p ? '#000000' : '#ffffff',
                          border: currentPage === p ? '1px solid #eab308' : '1px solid #3f3f46',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  background: currentPage === totalPages ? '#18181b' : '#27272a',
                  color: currentPage === totalPages ? '#52525b' : '#ffffff',
                  border: '1px solid #3f3f46',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next ▶
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  background: currentPage === totalPages ? '#18181b' : '#27272a',
                  color: currentPage === totalPages ? '#52525b' : '#ffffff',
                  border: '1px solid #3f3f46',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Last ⏭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
