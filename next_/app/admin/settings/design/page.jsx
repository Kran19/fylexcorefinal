 "use client";
import React, { useState, useEffect, useRef } from "react";
import settingsService from "@/services/settings.service";
import Loader from "@/components/admin/ui/Loader";
import ErrorBanner from "@/components/admin/ui/ErrorBanner";
import ConfirmModal from "@/components/admin/ui/ConfirmModal";
import { useToast } from "@/context/ToastContext";

const DEFAULT_THEME = {
  "brand-primary": "#161413",
  "brand-secondary": "#161413",
  "brand-accent": "#FFFFFF",
  "brand-black": "#000000",
  "brand-white": "#FFFFFF",
  "brand-silver": "#999B98",
  "brand-cream": "#FFF6ED",
  "brand-charcoal": "#999B98",
  "bg-primary": "#161413",
  "text-primary": "#FFF6ED",
  "text-secondary": "#999B98",
  "btn-primary-bg": "#161413",
  "btn-primary-text": "#FFF6ED",
  "btn-radius": "999px",
  "radius-global": "12px",
};

const DesignSettingsPage = () => {
  const toast = useToast();
  const [settings, setSettings] = useState(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Live Preview State
  const [previewUrl, setPreviewUrl] = useState("/");
  const iframeRef = useRef(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await settingsService.getSettings();
      if (response?.data) {
        const dsSettings = response.data.filter((s) => s.group === "design_system");
        if (dsSettings.length > 0) {
          const dbTheme = {};
          dsSettings.forEach((s) => {
            dbTheme[s.key] = s.value;
          });
          setSettings((prev) => ({ ...prev, ...dbTheme }));
        }
      }
    } catch (err) {
      setError("Failed to load design system settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Sync settings to iframe via postMessage whenever they change
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "UPDATE_DESIGN_SYSTEM",
          payload: settings,
        },
        "*"
      );
    }
  }, [settings, previewUrl]);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        _group: "design_system",
        ...settings,
      };
      await settingsService.updateSettings(payload);
      toast?.success?.("Design system settings saved and published globally!");
    } catch (err) {
      toast?.error?.("Failed to save design settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSettings(DEFAULT_THEME);
    setResetModalOpen(false);
    toast?.info?.("Reset settings to live factory defaults. Click 'Publish Global Theme' to save.");
  };

  if (loading) return <Loader message="Loading Design Control Center..." />;
  if (error) return <ErrorBanner message={error} onRetry={fetchSettings} />;

  const renderColorInput = (label, key) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="color"
          value={settings[key] || "#000000"}
          onChange={(e) => handleChange(key, e.target.value)}
          style={{ width: 40, height: 40, padding: 0, border: "1px solid #cbd5e1", borderRadius: 8, cursor: "pointer", background: "none" }}
        />
        <input
          type="text"
          value={settings[key] || ""}
          onChange={(e) => handleChange(key, e.target.value)}
          style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, outline: "none", fontFamily: "monospace" }}
        />
      </div>
    </div>
  );

  const renderTextInput = (label, key, placeholder) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <input
        type="text"
        value={settings[key] || ""}
        placeholder={placeholder}
        onChange={(e) => handleChange(key, e.target.value)}
        style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, outline: "none" }}
      />
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: "100%", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: 0 }}>Design Control Center</h1>
          <p style={{ color: "#64748b", margin: "2px 0 0", fontSize: 13 }}>Manage live storefront design tokens and color theme</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select
            value={previewUrl}
            onChange={(e) => setPreviewUrl(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", fontSize: 13, fontWeight: 600, background: "#fff" }}
          >
            <option value="/">🏠 Storefront Home</option>
            <option value="/products">⌚ Products Catalog</option>
            <option value="/pre-configure">⚙️ Pre-Configure Studio</option>
            <option value="/cart">🛒 Shopping Cart</option>
          </select>
          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            style={{ padding: "8px 16px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <i className="fas fa-undo" /> Reset to Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: "8px 22px", background: "#6366f1", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 10px rgba(99, 102, 241, 0.3)" }}
          >
            {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}
            {saving ? "Publishing..." : "Publish Global Theme"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, height: "calc(100% - 70px)" }}>
        {/* Controls Panel */}
        <div style={{ width: 340, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflowY: "auto", padding: 20, flexShrink: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", borderBottom: "1px solid #f1f5f9", paddingBottom: 10, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Master Brand Palette
          </h3>
          {renderColorInput("Primary Brand Color", "brand-primary")}
          {renderColorInput("Secondary Color", "brand-secondary")}
          {renderColorInput("Accent Color", "brand-accent")}
          {renderColorInput("Pure Black Token", "brand-black")}
          {renderColorInput("Pure White Token", "brand-white")}

          <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", borderBottom: "1px solid #f1f5f9", paddingBottom: 10, marginBottom: 16, marginTop: 24, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Storefront Global Surfaces
          </h3>
          {renderColorInput("Page Background", "bg-primary")}
          {renderColorInput("Primary Text Color", "text-primary")}
          {renderColorInput("Secondary Text Color", "text-secondary")}
          {renderTextInput("Global Border Radius", "radius-global", "e.g., 12px")}

          <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", borderBottom: "1px solid #f1f5f9", paddingBottom: 10, marginBottom: 16, marginTop: 24, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Buttons &amp; Interactive CTAs
          </h3>
          {renderColorInput("Button Background", "btn-primary-bg")}
          {renderColorInput("Button Text Color", "btn-primary-text")}
          {renderTextInput("Button Border Radius", "btn-radius", "e.g., 999px")}
        </div>

        {/* Live Preview Panel */}
        <div style={{ flex: 1, background: "#f8fafc", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ background: "#f1f5f9", padding: "10px 16px", fontSize: 12, fontWeight: 700, color: "#475569", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
            <span><i className="fas fa-desktop mr-2" /> Live Storefront Preview</span>
            <span style={{ fontFamily: "monospace", color: "#6366f1" }}>{previewUrl}</span>
          </div>
          <iframe
            ref={iframeRef}
            src={previewUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            onLoad={() => {
              if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage(
                  {
                    type: "UPDATE_DESIGN_SYSTEM",
                    payload: settings,
                  },
                  "*"
                );
              }
            }}
          />
        </div>
      </div>

      <ConfirmModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleReset}
        title="Reset Design Tokens to Live Defaults"
        message="Are you sure you want to reset all brand and surface color tokens back to the live factory theme defaults?"
        confirmLabel="Reset to Defaults"
        danger={false}
      />
    </div>
  );
};

export default DesignSettingsPage;

