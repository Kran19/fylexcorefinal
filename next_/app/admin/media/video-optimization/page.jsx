"use client";
import React, { useState, useEffect, useCallback } from "react";
import * as api from "@/services/adminApi";
import { getFileUrl } from "@/lib/utils";
import Swal from "sweetalert2";

function formatMb(bytes) {
  const n = Number(bytes || 0);
  if (!n) return "0 MB";
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VideoOptimizationSuite() {
  const [preset, setPreset] = useState("web_fast");
  const [quality] = useState(78);
  const [videos, setVideos] = useState([]);
  const [worker, setWorker] = useState({ activeCount: 0, isRunning: false, currentFilename: null });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [batchBusy, setBatchBusy] = useState(false);

  const loadVideos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [res, jobRes] = await Promise.all([
        api.getOptimizationAssets("size_desc"),
        api.getOptimizationJobStatus(),
      ]);
      const all = Array.isArray(res?.data) ? res.data : [];
      const onlyVids = all.filter((a) => {
        const name = String(a.originalFilename || a.fileName || a.filePath || "").toLowerCase();
        return a.fileType === "video" || a.mimeType?.includes("video") || /\.(mp4|mov|webm|m4v|avi)$/i.test(name);
      });
      setVideos(onlyVids);
      if (jobRes?.data) setWorker(jobRes.data);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos(false);
  }, [loadVideos]);

  useEffect(() => {
    if (!worker?.isRunning) return;
    const t = setInterval(() => loadVideos(true), 3000);
    return () => clearInterval(t);
  }, [worker?.isRunning, worker?.activeCount, loadVideos]);

  const transcodeOne = async (video) => {
    setBusyId(video.id);
    try {
      const res = await api.optimizeSingleAsset(video.id, { format: "webp", quality, preset });
      if (res?.error) throw new Error(res.error);
      await loadVideos(true);
      setWorker((prev) => ({ ...prev, isRunning: true, activeCount: Math.max(1, prev.activeCount) }));
      Swal.fire({
        icon: "info",
        title: "Queued in Background Worker!",
        text: `${video.originalFilename || video.fileName} is now encoding on the server without timeout limits. Watch its size turn green automatically!`,
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire({ icon: "error", title: "Transcode Notice", text: e?.message || "Could not queue video." });
    } finally {
      setBusyId(null);
    }
  };

  const transcodeAllHeavy = async () => {
    const targets = videos.filter((v) => !v.isOptimized || Number(v.optimizedSize || 0) > 5.5 * 1024 * 1024);
    const list = targets.length > 0 ? targets : videos;
    if (list.length === 0) return;

    setBatchBusy(true);
    let ok = 0;
    for (const v of list) {
      const res = await api.optimizeSingleAsset(v.id, { format: "webp", quality, preset });
      if (!res?.error) ok++;
    }
    setBatchBusy(false);
    await loadVideos(true);
    setWorker((prev) => ({ ...prev, isRunning: true, activeCount: Math.max(1, prev.activeCount) }));
    Swal.fire({
      icon: "info",
      title: `Queued ${ok} Video(s)!`,
      text: "FFmpeg is compressing your videos sequentially in the background. Status updates automatically every 3 seconds.",
      timer: 3200,
      showConfirmButton: false,
    });
  };

  const totalOrigBytes = videos.reduce((s, v) => s + Number(v.originalSize || 0), 0);
  const totalOptBytes = videos.reduce((s, v) => s + Number(v.optimizedSize || v.originalSize || 0), 0);

  return (
    <div style={{ padding: "8px 4px 40px", maxWidth: "1360px", margin: "0 auto", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
      {worker?.isRunning && (
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
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "13.5px" }}>
            <i className="fas fa-circle-notch fa-spin" style={{ fontSize: "18px", color: "#38bdf8" }} />
            <span>
              <strong>FFmpeg Worker Active ({worker.activeCount} remaining):</strong> Encoding{" "}
              <strong>{worker.currentFilename || "video"}</strong> — auto-refreshing every 3s!
            </span>
          </div>
        </div>
      )}

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
        }}
      >
        <div>
          <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#4f46e5" }}>
            ⚡ LIVE FFMPEG VIDEO ENGINE
          </span>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "4px 0" }}>
            Storefront Video Transcoder &amp; FastStart Optimizer
          </h1>
          <p style={{ fontSize: "13px", color: "#475569", margin: 0 }}>
            Converts raw 4K/MOV/MP4 uploads (50–250 MB) into ~2–3.5 MB H.264 FastStart streams via a zero-timeout background queue.
          </p>
        </div>

        <button
          type="button"
          disabled={batchBusy || worker?.isRunning || videos.length === 0}
          onClick={transcodeAllHeavy}
          style={{
            background: worker?.isRunning ? "#312e81" : "#4f46e5",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "13px",
            padding: "11px 20px",
            borderRadius: "10px",
            border: "none",
            cursor: batchBusy || worker?.isRunning ? "default" : "pointer",
          }}
        >
          {worker?.isRunning ? `⚡ Encoding (${worker.activeCount} Left)...` : "🎬 Transcode All Heavy Videos Now"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "18px 20px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Uploaded Videos</span>
          <div style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>{videos.length} Videos</div>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "18px 20px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Raw Master Total</span>
          <div style={{ fontSize: "26px", fontWeight: 800, color: "#64748b", marginTop: "6px" }}>{formatMb(totalOrigBytes)}</div>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "18px 20px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Active Streaming Total</span>
          <div style={{ fontSize: "26px", fontWeight: 800, color: "#16a34a", marginTop: "6px" }}>{formatMb(totalOptBytes)}</div>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "18px 20px", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Encoding Preset</span>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            style={{ marginTop: "8px", width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontWeight: 700, color: "#0f172a" }}
          >
            <option value="web_fast">720p Web Fast (1.8 Mbps max • &lt;3.5 MB)</option>
            <option value="1080p">1080p Full HD (3.0 Mbps max • &lt;6 MB)</option>
            <option value="480p">480p Mobile Ultra-Light (&lt;1.2 MB)</option>
          </select>
        </div>
      </div>

      <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "12px 20px", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Video Asset</th>
              <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Original Size</th>
              <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Active Stream Size</th>
              <th style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Reduction</th>
              <th style={{ padding: "12px 20px", fontSize: "11px", fontWeight: 800, color: "#475569", textTransform: "uppercase", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading videos...</td>
              </tr>
            ) : videos.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No video assets uploaded yet.</td>
              </tr>
            ) : (
              videos.map((v) => {
                const heavy = Number(v.optimizedSize || v.originalSize || 0) > 5.5 * 1024 * 1024;
                const jobStatus = v.jobStatus;
                const isRunning = busyId === v.id || Boolean(jobStatus);
                return (
                  <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9", background: jobStatus ? "#eef2ff" : "#ffffff" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <video
                          src={getFileUrl(v.bestVariant?.filePath || v.filePath)}
                          muted
                          preload="metadata"
                          style={{ width: 72, height: 44, objectFit: "cover", borderRadius: "8px", background: "#0f172a" }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "13.5px", color: "#0f172a" }}>
                            {v.originalFilename || v.fileName || `Video #${v.id}`}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                            ID #{v.id} {v.bestVariant?.width ? `• ${v.bestVariant.width}×${v.bestVariant.height}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 700, color: "#64748b" }}>{formatMb(v.originalSize)}</td>
                    <td style={{ padding: "14px 16px", fontSize: "13.5px", fontWeight: 800, color: jobStatus ? "#4f46e5" : heavy ? "#dc2626" : "#16a34a" }}>
                      {jobStatus ? (jobStatus === "processing" ? "⚡ Encoding..." : "Queued") : v.isOptimized ? formatMb(v.optimizedSize) : "Uncompressed"}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{v.savedRatio}</td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <button
                        type="button"
                        disabled={isRunning || batchBusy}
                        onClick={() => transcodeOne(v)}
                        style={{
                          background: jobStatus ? "#e0e7ff" : heavy ? "#dc2626" : "#4f46e5",
                          color: jobStatus ? "#3730a3" : "#ffffff",
                          border: "none",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: isRunning ? "default" : "pointer",
                        }}
                      >
                        {jobStatus === "processing" ? "Encoding..." : jobStatus === "queued" ? "Queued" : busyId === v.id ? "Starting..." : heavy ? "⚡ Shrink (<3.5 MB)" : "Re-Transcode"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
