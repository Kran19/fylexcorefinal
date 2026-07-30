"use client";
import React, { useState, useEffect } from "react";
import * as api from "@/services/adminApi";
import Swal from "sweetalert2";
import "@/app/admin/css/datatable.css";
import "@/app/admin/css/custom.css";

export default function PurgeStorageCleanupCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    fetchPreview();
  }, []);

  const fetchPreview = async () => {
    try {
      const res = await api.getPurgePreview();
      if (res?.data || res?.success) {
        setData(res.data || res);
      }
    } catch (e) {
      console.error("Failed to fetch purge preview:", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePurge = async (targetType, label) => {
    const confirm = await Swal.fire({
      title: `Purge ${label}?`,
      text: "This action will permanently delete raw original files from disk and reclaim storage space. Active WebP storefront files remain 100% safe.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, Purge ${label}`,
      cancelButtonText: "Cancel",
      background: "#18181b",
      color: "#ffffff",
      confirmButtonColor: "#dc2626"
    });

    if (!confirm.isConfirmed) return;

    setPurging(true);
    try {
      const res = await api.executePurgeMedia({ targetType });
      Swal.fire({
        icon: "success",
        title: "Purge Complete!",
        text: res?.message || `Successfully purged files and reclaimed storage space.`,
        background: "#18181b",
        color: "#ffffff"
      });
      fetchPreview();
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Purge Failed",
        text: e.message || "Failed to purge media files.",
        background: "#18181b",
        color: "#ffffff"
      });
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="admin-root" style={{ background: "#09090b", color: "#f4f4f5", minHeight: "100vh", padding: "24px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#ef4444" }}>
          🔥 DAM STORAGE PURGE &amp; CLEANUP
        </span>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", marginTop: "4px" }}>
          Unused Media &amp; Storage Purge Center
        </h1>
        <p style={{ color: "#a1a1aa", fontSize: "14px", marginTop: "4px" }}>
          Safely purge unneeded raw master originals (where WebP is accepted), unlinked orphans, and SHA-256 duplicates to reclaim VPS disk space.
        </p>
      </div>

      {/* Main Recoverable Banner */}
      <div style={{ background: "linear-gradient(135deg, #450a0a 0%, #18181b 100%)", borderRadius: "16px", padding: "28px", border: "1px solid #991b1b", marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
        <div>
          <span style={{ fontSize: "12px", color: "#fca5a5", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>TOTAL RECOVERABLE DISK SPACE</span>
          <div style={{ fontSize: "42px", fontWeight: 900, color: "#ffffff", marginTop: "4px" }}>
            {data?.totalRecoverableFormatted || "0.00 GB"}
          </div>
          <span style={{ fontSize: "12px", color: "#f87171", marginTop: "2px", display: "block", fontWeight: 600 }}>
            ⚡ Purging frees up physical space on your Linux VPS disk
          </span>
        </div>

        <button
          onClick={() => handlePurge('all', 'All Unused Files & Originals')}
          disabled={purging || loading}
          style={{
            background: "#dc2626",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "14px",
            padding: "14px 28px",
            borderRadius: "10px",
            border: "none",
            cursor: purging ? "wait" : "pointer",
            boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <i className="fas fa-trash-alt" /> {purging ? "Purging..." : "🔥 Purge All Unused & Reclaim Space"}
        </button>
      </div>

      {/* Breakdown Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        {/* Card 1: Master Originals */}
        <div style={{ background: "#18181b", borderRadius: "16px", padding: "24px", border: "1px solid #27272a", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#f59e0b", textTransform: "uppercase" }}>Master Originals</span>
              <span style={{ fontSize: "11px", background: "#451a03", color: "#fde047", padding: "4px 8px", borderRadius: 6, fontWeight: 700 }}>
                WebP Active
              </span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff" }}>
              {data?.masterOriginals?.formatted || "0 MB"}
            </div>
            <p style={{ color: "#a1a1aa", fontSize: "12px", marginTop: "8px" }}>
              Raw PNG/JPEG original files where WebP variant is already accepted and serving live on storefront.
            </p>
            <div style={{ fontSize: "12px", color: "#71717a", marginTop: "8px" }}>
              File Count: <strong style={{ color: "#fff" }}>{data?.masterOriginals?.count || 0} Files</strong>
            </div>
          </div>

          <button
            onClick={() => handlePurge('master_originals', 'Master Raw Originals')}
            disabled={purging || (data?.masterOriginals?.count === 0)}
            style={{ marginTop: "20px", background: "#27272a", color: "#fca5a5", border: "1px solid #7f1d1d", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: 800, cursor: "pointer", width: "100%" }}
          >
            🔥 Purge Master Originals
          </button>
        </div>

        {/* Card 2: Unlinked Orphans */}
        <div style={{ background: "#18181b", borderRadius: "16px", padding: "24px", border: "1px solid #27272a", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#ef4444", textTransform: "uppercase" }}>Unlinked Orphans</span>
              <span style={{ fontSize: "11px", background: "#450a0a", color: "#fca5a5", padding: "4px 8px", borderRadius: 6, fontWeight: 700 }}>
                0 References
              </span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff" }}>
              {data?.orphans?.formatted || "0 MB"}
            </div>
            <p style={{ color: "#a1a1aa", fontSize: "12px", marginTop: "8px" }}>
              Assets with 0 product, variant, category, belt, box, or CMS banner references in the database.
            </p>
            <div style={{ fontSize: "12px", color: "#71717a", marginTop: "8px" }}>
              File Count: <strong style={{ color: "#fff" }}>{data?.orphans?.count || 0} Files</strong>
            </div>
          </div>

          <button
            onClick={() => handlePurge('orphans', 'Unlinked Orphan Assets')}
            disabled={purging || (data?.orphans?.count === 0)}
            style={{ marginTop: "20px", background: "#27272a", color: "#fca5a5", border: "1px solid #7f1d1d", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: 800, cursor: "pointer", width: "100%" }}
          >
            🔥 Purge Orphan Files
          </button>
        </div>

        {/* Card 3: Duplicates */}
        <div style={{ background: "#18181b", borderRadius: "16px", padding: "24px", border: "1px solid #27272a", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase" }}>SHA-256 Duplicates</span>
              <span style={{ fontSize: "11px", background: "#0c4a6e", color: "#7dd3fc", padding: "4px 8px", borderRadius: 6, fontWeight: 700 }}>
                Identical Hash
              </span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff" }}>
              {data?.duplicates?.formatted || "0 MB"}
            </div>
            <p style={{ color: "#a1a1aa", fontSize: "12px", marginTop: "8px" }}>
              Duplicate copy files sharing identical byte signatures across different folders.
            </p>
            <div style={{ fontSize: "12px", color: "#71717a", marginTop: "8px" }}>
              File Count: <strong style={{ color: "#fff" }}>{data?.duplicates?.count || 0} Files</strong>
            </div>
          </div>

          <button
            onClick={() => handlePurge('duplicates', 'Duplicate Files')}
            disabled={purging || (data?.duplicates?.count === 0)}
            style={{ marginTop: "20px", background: "#27272a", color: "#7dd3fc", border: "1px solid #0369a1", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: 800, cursor: "pointer", width: "100%" }}
          >
            🔥 Purge Duplicate Copies
          </button>
        </div>
      </div>
    </div>
  );
}
