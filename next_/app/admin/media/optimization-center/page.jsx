"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import * as api from "@/services/adminApi";
import { getFileUrl } from "@/lib/utils";
import Swal from "sweetalert2";

function formatBytesReadable(bytes) {
  const num = Number(bytes || 0);
  if (!num || num <= 0) return "0 KB";
  if (num >= 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(num / 1024))} KB`;
}

export default function EnterpriseDAMOptimizationCenter() {
  const [stats, setStats] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("size_desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("video");
  const [videoPreset, setVideoPreset] = useState("web_fast");
  const [imageQuality] = useState(80);
  const [processingId, setProcessingId] = useState(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [workerSummary, setWorkerSummary] = useState({ activeCount: 0, isRunning: false, currentFilename: null, jobs: [] });
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [compareAsset, setCompareAsset] = useState(null);

  const loadAll = useCallback(async (order = sortBy, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsRes, listRes, jobRes] = await Promise.all([
        api.getOptimizationStats(),
        api.getOptimizationAssets(order),
        api.getOptimizationJobStatus(),
      ]);
      if (statsRes?.data) setStats(statsRes.data);
      setAssets(Array.isArray(listRes?.data) ? listRes.data : []);
      if (jobRes?.data) setWorkerSummary(jobRes.data);
    } catch (e) {
      console.error("Failed loading optimization center:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    loadAll(sortBy, false);
  }, [sortBy, loadAll]);

  // Live background poller: whenever any video job is queued/processing on the server, poll every 3s cleanly (zero 504s!)
  useEffect(() => {
    if (!workerSummary?.isRunning) return;
    const interval = setInterval(async () => {
      const jobRes = await api.getOptimizationJobStatus();
      if (jobRes?.data) {
        setWorkerSummary(jobRes.data);
        // Refresh table sizes smoothly whenever active count changes or finishes
        await loadAll(sortBy, true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [workerSummary?.isRunning, workerSummary?.activeCount, sortBy, loadAll]);

  const isVideoItem = (a) => {
    const name = String(a?.originalFilename || a?.fileName || a?.filePath || "").toLowerCase();
    return a?.fileType === "video" || a?.mimeType?.includes("video") || /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(name);
  };

  const isStillHeavy = (a) => {
    const activeBytes = a?.isOptimized ? Number(a?.optimizedSize || 0) : Number(a?.originalSize || 0);
    return isVideoItem(a) ? activeBytes > 5.5 * 1024 * 1024 : activeBytes > 500 * 1024;
  };

  const heavyVideos = useMemo(
    () => assets.filter((a) => isVideoItem(a) && (!a.isOptimized || isStillHeavy(a))),
    [assets],
  );

  const pendingImages = useMemo(
    () => assets.filter((a) => !isVideoItem(a) && !a.isOptimized),
    [assets],
  );

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const name = String(a.originalFilename || a.fileName || a.filePath || "").toLowerCase();
      const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || String(a.id).includes(searchTerm);
      const vid = isVideoItem(a);
      if (fileTypeFilter === "video" && !vid) return false;
      if (fileTypeFilter === "image" && vid) return false;
      if (fileTypeFilter === "heavy" && !isStillHeavy(a)) return false;
      return matchesSearch;
    });
  }, [assets, searchTerm, fileTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
  const pagedAssets = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredAssets.slice(start, start + pageSize);
  }, [filteredAssets, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, fileTypeFilter, sortBy]);

  const handleCompressSingle = async (asset) => {
    const vid = isVideoItem(asset);
    setProcessingId(asset.id);
    try {
      const res = await api.optimizeSingleAsset(asset.id, {
        format: "webp",
        quality: vid ? 78 : imageQuality,
        preset: vid ? videoPreset : "web_fast",
      });

      if (res?.error) {
        throw new Error(res.error);
      }

      await loadAll(sortBy, true);

      if (vid || res?.data?.queued || res?.queued) {
        setWorkerSummary((prev) => ({ ...prev, isRunning: true, activeCount: Math.max(1, prev.activeCount) }));
        Swal.fire({
          icon: "info",
          title: "Queued in Background FFmpeg Worker!",
          text: `${asset.originalFilename || asset.fileName} is now compressing in the background with zero timeout risk. Watch the live status bar above — sizes will turn green automatically as soon as it finishes!`,
          timer: 3200,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "Image Compressed to WebP!",
          text: res?.message || "Image optimized successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Compression Notice",
        text: e?.message || "Could not start compression.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleServeMode = async (asset) => {
    try {
      if (asset.serveMode === "auto") {
        await api.rejectOptimizationVariant(asset.id);
      } else {
        await api.acceptOptimizationVariant(asset.id);
      }
      await loadAll(sortBy, true);
    } catch (e) {
      Swal.fire({ icon: "error", title: "Update Failed", text: e?.message || "Failed to switch mode" });
    }
  };

  const runBatchList = async (targetList, label, isVideoBatch = false) => {
    if (!targetList || targetList.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Already Web-Ready!",
        text: `All ${label} are already compressed under target web thresholds.`,
      });
      return;
    }

    setIsBatchRunning(true);
    let queuedOrDone = 0;

    for (const item of targetList) {
      const vid = isVideoItem(item);
      try {
        const res = await api.optimizeSingleAsset(item.id, {
          format: "webp",
          quality: vid ? 78 : imageQuality,
          preset: vid ? videoPreset : "web_fast",
        });
        if (!res?.error) queuedOrDone++;
      } catch {}
    }

    setIsBatchRunning(false);
    await loadAll(sortBy, true);

    if (isVideoBatch) {
      setWorkerSummary((prev) => ({ ...prev, isRunning: true, activeCount: Math.max(1, prev.activeCount) }));
      Swal.fire({
        icon: "info",
        title: `Queued ${queuedOrDone} Video(s) in Background!`,
        text: "Videos are transcoding one-by-one on the server without blocking or timing out. Each row will automatically turn green (<3.5 MB) as it finishes!",
        timer: 3800,
        showConfirmButton: false,
      });
    } else {
      Swal.fire({
        icon: "success",
        title: "Image Compression Complete!",
        text: `Optimized ${queuedOrDone} ${label} to WebP.`,
      });
    }
  };

  return (
    <div style={{ padding: "8px 4px 40px", maxWidth: "1440px", margin: "0 auto", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
      {/* Live Background FFmpeg Worker Progress Banner (prevents 504 confusion & auto-updates!) */}
      {workerSummary?.isRunning && (
        <div
          style={{
            background: "linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)",
            color: "#ffffff",
            borderRadius: "14px",
            padding: "14px 20px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            boxShadow: "0 6px 20px rgba(49, 46, 129, 0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13.5px" }}>
            <i className="fas fa-circle-notch fa-spin" style={{ fontSize: "18px", color: "#38bdf8" }} />
            <div>
              <strong>Background FFmpeg Worker Running ({workerSummary.activeCount} video{workerSummary.activeCount > 1 ? "s" : ""} in queue)</strong>
              <div style={{ fontSize: "12px", color: "#c7d2fe", marginTop: "2px" }}>
                Currently shrinking: <strong>{workerSummary.currentFilename || "Video stream"}</strong> — Table updates automatically every 3 seconds (safe to switch tabs).
              </div>
            </div>
          </div>
          <span style={{ background: "rgba(56, 189, 248, 0.2)", border: "1px solid rgba(56, 189, 248, 0.45)", color: "#bae6fd", padding: "5px 12px", borderRadius: "999px", fontSize: "11.5px", fontWeight: 700 }}>
            Zero-Timeout Queue Active
          </span>
        </div>
      )}

      {/* Clean Header Banner */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "22px 26px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4f46e5" }}>
            SPEED BOOSTER &amp; MEDIA COMPRESSION
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "4px 0" }}>
            Website Media &amp; Video Speed Optimizer
          </h1>
          <p style={{ fontSize: "13px", color: "#475569", margin: 0 }}>
            Shrinks heavy 50–250 MB videos down to ~2–3.5 MB FastStart MP4s in the background and converts large images to crisp WebP.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            disabled={isBatchRunning || workerSummary?.isRunning}
            onClick={() => runBatchList(heavyVideos, "heavy videos", true)}
            style={{
              background: workerSummary?.isRunning ? "#312e81" : heavyVideos.length > 0 ? "#dc2626" : "#16a34a",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "13px",
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              cursor: isBatchRunning || workerSummary?.isRunning ? "default" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <i className={workerSummary?.isRunning ? "fas fa-spinner fa-spin" : "fas fa-video"} />
            {workerSummary?.isRunning
              ? `Compressing (${workerSummary.activeCount} Remaining)...`
              : heavyVideos.length > 0
              ? `Compress ${heavyVideos.length} Heavy Video${heavyVideos.length > 1 ? "s" : ""} (<3.5 MB)`
              : "All Videos Web-Fast ✓"}
          </button>

          <button
            type="button"
            disabled={isBatchRunning}
            onClick={() => runBatchList(pendingImages, "uncompressed images", false)}
            style={{
              background: "#4f46e5",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "13px",
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              cursor: isBatchRunning ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <i className="fas fa-bolt" />
            {pendingImages.length > 0 ? `Compress ${pendingImages.length} Pending Images` : "Images Optimized ✓"}
          </button>

          <button
            type="button"
            onClick={() => loadAll(sortBy, false)}
            style={{
              background: "#f8fafc",
              color: "#334155",
              fontWeight: 600,
              fontSize: "13px",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              cursor: "pointer",
            }}
          >
            <i className="fas fa-sync-alt" /> Refresh
          </button>
        </div>
      </div>

      {/* Clear 4-Card KPI Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "18px 20px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Speed Health Score</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
            {stats?.healthScore ?? (heavyVideos.length === 0 ? 98 : 88)}
            <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 600 }}> / 100</span>
          </div>
          <div style={{ fontSize: "12px", color: heavyVideos.length === 0 ? "#16a34a" : "#d97706", fontWeight: 600, marginTop: "4px" }}>
            {heavyVideos.length === 0 ? "✓ All videos under 5.5 MB" : `${heavyVideos.length} heavy video(s) queued/detected`}
          </div>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "18px 20px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Media Files</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>{assets.length}</div>
          <div style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600, marginTop: "4px" }}>
            {stats?.videosTotal ?? assets.filter(isVideoItem).length} Videos • {stats?.imagesTotal ?? assets.filter((a) => !isVideoItem(a)).length} Images
          </div>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "18px 20px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Bandwidth Saved</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#16a34a", marginTop: "6px" }}>{stats?.savedPercentage ?? "0%"}</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            {stats?.spaceSavedBytes ? formatBytesReadable(stats.spaceSavedBytes) + " saved" : "Originals backed up"}
          </div>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "18px 20px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Video Compression Target</div>
          <select
            value={videoPreset}
            onChange={(e) => setVideoPreset(e.target.value)}
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#0f172a",
              fontSize: "12.5px",
              fontWeight: 700,
            }}
          >
            <option value="web_fast">⚡ Web Fast 720p (~1.8–3.5 MB) — Recommended</option>
            <option value="1080p">🎬 Full HD 1080p (~3.5–6 MB)</option>
            <option value="480p">📱 Ultra-Light Mobile 480p (&lt;1.2 MB)</option>
          </select>
        </div>
      </div>

      {/* Filter & Search Bar + Clean High-Contrast Table */}
      <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { id: "video", label: `🎬 Videos (${assets.filter(isVideoItem).length})` },
              { id: "heavy", label: `⚠️ Needs Re-Compression (${assets.filter(isStillHeavy).length})` },
              { id: "image", label: `🖼️ Images (${assets.filter((a) => !isVideoItem(a)).length})` },
              { id: "all", label: `All Files (${assets.length})` },
            ].map((tab) => {
              const active = fileTypeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFileTypeFilter(tab.id)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 700,
                    border: active ? "1px solid #4f46e5" : "1px solid #cbd5e1",
                    background: active ? "#4f46e5" : "#ffffff",
                    color: active ? "#ffffff" : "#334155",
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search filename or #ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: "12.5px",
                width: "210px",
              }}
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: "12.5px",
                fontWeight: 600,
              }}
            >
              <option value="size_desc">Sort: Largest Original First</option>
              <option value="size_asc">Sort: Smallest First</option>
              <option value="created_desc">Sort: Newest Uploaded</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 20px", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>File Name &amp; Preview</th>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Original Upload</th>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Current Website Size</th>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Saved</th>
                <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Website Status</th>
                <th style={{ padding: "12px 20px", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                    Loading media assets...
                  </td>
                </tr>
              ) : pagedAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                    No media files match this filter.
                  </td>
                </tr>
              ) : (
                pagedAssets.map((item) => {
                  const vid = isVideoItem(item);
                  const heavy = isStillHeavy(item);
                  const jobStatus = item.jobStatus; // 'queued' | 'processing' | null
                  const isBusy = processingId === item.id || Boolean(jobStatus);
                  const displayName = item.originalFilename || item.fileName || `Asset #${item.id}`;
                  const mediaUrl = getFileUrl(item.bestVariant?.filePath || item.filePath);

                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", background: jobStatus ? "#eef2ff" : heavy ? "#fffafa" : "#ffffff" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {vid ? (
                            <div
                              onClick={() => setCompareAsset(item)}
                              title="Click to preview video"
                              style={{
                                width: 46,
                                height: 46,
                                borderRadius: "10px",
                                background: "#0f172a",
                                color: "#38bdf8",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                            >
                              <i className={jobStatus === "processing" ? "fas fa-spinner fa-spin" : "fas fa-play"} style={{ fontSize: "14px" }} />
                            </div>
                          ) : (
                            <img
                              src={mediaUrl}
                              alt={displayName}
                              loading="lazy"
                              onClick={() => setCompareAsset(item)}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/Rim.webp";
                              }}
                              style={{
                                width: 46,
                                height: 46,
                                borderRadius: "10px",
                                objectFit: "cover",
                                border: "1px solid #e2e8f0",
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "13.5px", color: "#0f172a", wordBreak: "break-word" }}>
                              {displayName}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                              ID #{item.id} • {vid ? "Video (MP4/MOV)" : "Image"}
                              {item.bestVariant?.width ? ` • ${item.bestVariant.width}×${item.bestVariant.height}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 700, color: "#64748b" }}>
                        {formatBytesReadable(item.originalSize)}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        {jobStatus ? (
                          <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#4f46e5" }}>
                            <i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }} />
                            {jobStatus === "processing" ? "Encoding (<3.5 MB)..." : "In Queue..."}
                          </span>
                        ) : item.isOptimized ? (
                          <div>
                            <span style={{ fontSize: "13.5px", fontWeight: 800, color: heavy ? "#dc2626" : "#16a34a" }}>
                              {formatBytesReadable(item.optimizedSize)}
                            </span>
                            {heavy && (
                              <span style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#dc2626", marginTop: "2px" }}>
                                ⚠️ Still heavy — click Re-Compress!
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#d97706" }}>Not compressed yet</span>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                        {item.savedRatio || "0%"}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        {jobStatus ? (
                          <span style={{ background: "#e0e7ff", color: "#3730a3", border: "1px solid #a5b4fc", padding: "4px 10px", borderRadius: "999px", fontSize: "11.5px", fontWeight: 700 }}>
                            ⚡ {jobStatus === "processing" ? "Transcoding Live" : "Queued"}
                          </span>
                        ) : item.isOptimized && item.serveMode === "auto" ? (
                          <span
                            style={{
                              background: heavy ? "#fef3c7" : "#dcfce7",
                              color: heavy ? "#92400e" : "#166534",
                              border: `1px solid ${heavy ? "#fcd34d" : "#86efac"}`,
                              padding: "4px 10px",
                              borderRadius: "999px",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <i className={heavy ? "fas fa-exclamation-circle" : "fas fa-check-circle"} />
                            {heavy ? "Serving Large Variant" : `Live (${vid ? "Fast MP4" : "WebP"})`}
                          </span>
                        ) : (
                          <span style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "4px 10px", borderRadius: "999px", fontSize: "11.5px", fontWeight: 700 }}>
                            Serving Original
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleCompressSingle(item)}
                            style={{
                              background: jobStatus ? "#e0e7ff" : heavy || !item.isOptimized ? "#4f46e5" : "#f1f5f9",
                              color: jobStatus ? "#3730a3" : heavy || !item.isOptimized ? "#ffffff" : "#0f172a",
                              border: jobStatus ? "1px solid #a5b4fc" : heavy || !item.isOptimized ? "none" : "1px solid #cbd5e1",
                              padding: "7px 12px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: isBusy ? "default" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <i className={isBusy ? "fas fa-spinner fa-spin" : "fas fa-bolt"} />
                            {jobStatus === "processing"
                              ? "Encoding..."
                              : jobStatus === "queued"
                              ? "Queued"
                              : processingId === item.id
                              ? "Starting..."
                              : !item.isOptimized
                              ? "Compress"
                              : heavy
                              ? "Re-Compress (<3.5 MB)"
                              : "Re-Compress"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setCompareAsset(item)}
                            style={{
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              padding: "7px 10px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                            title="Preview file"
                          >
                            <i className="fas fa-eye" />
                          </button>

                          {item.isOptimized && !jobStatus && (
                            <button
                              type="button"
                              onClick={() => handleToggleServeMode(item)}
                              style={{
                                background: "#ffffff",
                                color: "#475569",
                                border: "1px solid #cbd5e1",
                                padding: "7px 10px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              title={item.serveMode === "auto" ? "Switch to Original Master" : "Switch to Compressed Version"}
                            >
                              <i className={item.serveMode === "auto" ? "fas fa-undo" : "fas fa-check"} />
                            </button>
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

        {totalPages > 1 && (
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc",
              fontSize: "12.5px",
              color: "#475569",
            }}
          >
            <span>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredAssets.length)} of {filteredAssets.length} files
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer" }}
              >
                Previous
              </button>
              <span style={{ padding: "6px 10px", fontWeight: 700, color: "#0f172a" }}>
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: page >= totalPages ? "not-allowed" : "pointer" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {compareAsset && (
        <div
          onClick={() => setCompareAsset(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#ffffff", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "900px", maxHeight: "90vh", overflowY: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  {compareAsset.originalFilename || compareAsset.fileName}
                </h3>
                <p style={{ fontSize: "12.5px", color: "#64748b", margin: "2px 0 0" }}>
                  Original: <strong>{formatBytesReadable(compareAsset.originalSize)}</strong> → Current Website File:{" "}
                  <strong style={{ color: "#16a34a" }}>{formatBytesReadable(compareAsset.optimizedSize)}</strong> ({compareAsset.savedRatio} saved)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompareAsset(null)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: "8px", width: 36, height: 36, fontSize: "16px", cursor: "pointer", color: "#0f172a" }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "#0f172a", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "center", alignItems: "center" }}>
              {isVideoItem(compareAsset) ? (
                <video
                  src={getFileUrl(compareAsset.bestVariant?.filePath || compareAsset.filePath)}
                  controls
                  autoPlay
                  muted
                  playsInline
                  style={{ maxHeight: "62vh", maxWidth: "100%", borderRadius: "8px" }}
                />
              ) : (
                <img
                  src={getFileUrl(compareAsset.bestVariant?.filePath || compareAsset.filePath)}
                  alt={compareAsset.originalFilename || "Preview"}
                  style={{ maxHeight: "62vh", maxWidth: "100%", objectFit: "contain", borderRadius: "8px" }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
