 "use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import "@/app/admin/css/custom.css";
import * as api from "@/services/adminApi";
import { useAdminData } from "@/context/AdminDataContext";
import PageHeader from "@/components/admin/ui/PageHeader";
import FormField from "@/components/admin/ui/FormField";
import Loader from "@/components/admin/ui/Loader";
import ErrorBanner from "@/components/admin/ui/ErrorBanner";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import { useToast } from "@/context/ToastContext";

const TAB_KEYS = ["general", "branding", "seo", "payment"];
const TAB_LABELS = {
  general: "General & Contact",
  branding: "Branding & Assets",
  seo: "SEO & Analytics",
  payment: "Payments & Shipping",
};
const TAB_ICONS = {
  general: "fas fa-store",
  branding: "fas fa-palette",
  seo: "fas fa-search",
  payment: "fas fa-credit-card",
};

const defaultFormState = {
  storeName: "FYLEX Premium Watches",
  storeEmail: "hello@fylex.com",
  storePhone: "9876543210",
  whatsappNumber: "9876543210",
  storeAddress: "Ahmedabad, Gujarat, India",
  currency: "INR",
  logo: "",
  favicon: "",
  tagline: "Designed Around Choice. Built On Experience.",
  metaTitle: "FYLEX Premium Watches | Handcrafted Luxury Timepieces",
  metaDescription: "Explore FYLEX luxury handcrafted watches. Configurable timepieces, custom straps, and premium packaging.",
  gaId: "",
  fbPixelId: "",
  seoIndexing: true,
  razorpayKey: "",
  razorpaySecret: "",
  codEnabled: true,
  codCharge: 0,
  codMaxAmount: 50000,
  shiprocketPickupPincode: "380001",
  freeShippingThreshold: 5000,
};

const SettingsPage = () => {
  const toast = useToast();
  const { data, loading, errors, refetch } = useAdminData();
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(defaultFormState);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // "logo" | "favicon"

  const remoteSettings = useMemo(() => {
    if (!data.settings) return {};
    if (Array.isArray(data.settings)) {
      const obj = {};
      data.settings.forEach((item) => {
        if (item.key) obj[item.key] = item.value;
      });
      return obj;
    }
    return data.settings;
  }, [data.settings]);

  useEffect(() => {
    if (remoteSettings && Object.keys(remoteSettings).length > 0) {
      setSettings((prev) => ({
        ...prev,
        storeName: remoteSettings.storeName || remoteSettings.store_name || prev.storeName,
        storeEmail: remoteSettings.storeEmail || remoteSettings.store_email || remoteSettings.contactEmail || prev.storeEmail,
        storePhone: remoteSettings.storePhone || remoteSettings.store_phone || remoteSettings.phone || prev.storePhone,
        whatsappNumber: remoteSettings.whatsappNumber || remoteSettings.whatsapp_number || remoteSettings.whatsapp || prev.whatsappNumber,
        storeAddress: remoteSettings.storeAddress || remoteSettings.store_address || remoteSettings.address || prev.storeAddress,
        currency: remoteSettings.currency || prev.currency,
        logo: remoteSettings.logo || prev.logo,
        favicon: remoteSettings.favicon || prev.favicon,
        tagline: remoteSettings.tagline || prev.tagline,
        metaTitle: remoteSettings.metaTitle || remoteSettings.meta_title || prev.metaTitle,
        metaDescription: remoteSettings.metaDescription || remoteSettings.meta_desc || remoteSettings.meta_description || prev.metaDescription,
        gaId: remoteSettings.gaId || remoteSettings.ga_id || prev.gaId,
        fbPixelId: remoteSettings.fbPixelId || remoteSettings.fb_pixel_id || prev.fbPixelId,
        seoIndexing: remoteSettings.seoIndexing !== undefined ? !!remoteSettings.seoIndexing : prev.seoIndexing,
        razorpayKey: remoteSettings.razorpayKey || remoteSettings.razorpay_key || prev.razorpayKey,
        razorpaySecret: remoteSettings.razorpaySecret || remoteSettings.razorpay_secret || prev.razorpaySecret,
        codEnabled: remoteSettings.codEnabled !== undefined ? !!remoteSettings.codEnabled : prev.codEnabled,
        codCharge: remoteSettings.codCharge !== undefined ? parseFloat(remoteSettings.codCharge) : prev.codCharge,
        codMaxAmount: remoteSettings.codMaxAmount !== undefined ? parseFloat(remoteSettings.codMaxAmount) : prev.codMaxAmount,
        shiprocketPickupPincode: remoteSettings.shiprocketPickupPincode || remoteSettings.shiprocket_pickup_pincode || prev.shiprocketPickupPincode,
        freeShippingThreshold: remoteSettings.freeShippingThreshold !== undefined ? parseFloat(remoteSettings.freeShippingThreshold) : prev.freeShippingThreshold,
      }));
    }
  }, [remoteSettings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Clean phone / whatsapp input to digits only up to 10
    if (name === "storePhone" || name === "whatsappNumber") {
      const cleaned = value.replace(/\D/g, "").slice(0, 10);
      setSettings((prev) => ({ ...prev, [name]: cleaned }));
      setIsDirty(true);
      setSaveError(null);
      return;
    }

    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (type === "number" ? parseFloat(value) || 0 : value),
    }));
    setIsDirty(true);
    setSaveError(null);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaveError(null);
    setSaving(true);

    try {
      const payload = {
        _group: activeTab,
        ...settings,
      };

      const res = await api.saveSettings(payload);
      if (res.error || res.success === false) {
        const msg = res.error || "Failed to save settings";
        setSaveError(msg);
        toast?.error?.(msg);
      } else {
        toast?.success?.("Global settings updated successfully!");
        setIsDirty(false);
        await refetch.settings();
      }
    } catch (err) {
      setSaveError(err.message);
      toast?.error?.(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMediaSelect = (selection) => {
    if (!selection || !selection.length) return;
    const item = selection[0];
    const url = getFileUrl(item.media || item.url || item.filePath || item);

    if (pickerTarget === "logo") {
      setSettings((prev) => ({ ...prev, logo: url }));
      setIsDirty(true);
      toast?.success?.("Logo updated from Media Library");
    } else if (pickerTarget === "favicon") {
      setSettings((prev) => ({ ...prev, favicon: url }));
      setIsDirty(true);
      toast?.success?.("Favicon updated from Media Library");
    }
    setPickerTarget(null);
  };

  if (loading.settings && !settings.storeName) {
    return <Loader message="Fetching system settings..." />;
  }

  if (errors.settings) {
    return <ErrorBanner message={errors.settings} onRetry={() => refetch.settings()} />;
  }

  const s = settings;

  return (
    <div className="animate-fade-in space-y-6" style={{ maxWidth: 1280, margin: "0 auto" }}>
      <PageHeader title="Global Settings" subtitle="Control your storefront appearance, contact identity, and backend behavior">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {isDirty && (
            <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, background: "#fffbeb", padding: "6px 12px", borderRadius: 8, border: "1px solid #fef3c7" }}>
              <i className="fas fa-exclamation-circle" />
              Unsaved Changes
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary"
            disabled={saving}
            style={{ height: 42, padding: "0 22px", borderRadius: 10, fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-save" />}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </PageHeader>

      <div className="settings-container">
        {/* Left Tabs Sidebar */}
        <div className="admin-card settings-tab-sidebar" style={{ borderRadius: 16, background: "#fff", border: "1px solid #e2e8f0" }}>
          <div style={{ padding: "8px 12px 14px", borderBottom: "1px solid #f1f5f9", marginBottom: 10 }}>
            <h4 style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Configuration
            </h4>
          </div>
          {TAB_KEYS.map((key) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: isActive ? "#6366f1" : "transparent",
                  color: isActive ? "#ffffff" : "#64748b",
                  fontWeight: isActive ? 700 : 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "left",
                  marginBottom: 4,
                  boxShadow: isActive ? "0 8px 14px -3px rgba(99, 102, 241, 0.35)" : "none",
                }}
              >
                <i className={TAB_ICONS[key]} style={{ width: 18, textAlign: "center", fontSize: 14 }} />
                <span>{TAB_LABELS[key]}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Form */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="admin-card" style={{ borderRadius: 16, overflow: "hidden", background: "#fff", border: "1px solid #e2e8f0" }}>
            <div className="admin-card-header" style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f5f3ff", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  <i className={TAB_ICONS[activeTab]} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#1e293b" }}>{TAB_LABELS[activeTab]}</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                    Manage {TAB_LABELS[activeTab].toLowerCase()} preferences
                  </p>
                </div>
              </div>
            </div>

            <div className="admin-card-body" style={{ padding: "24px 28px" }}>
              {saveError && <ErrorBanner message={saveError} compact style={{ marginBottom: 20 }} />}

              <form onSubmit={handleSave} className="space-y-6">
                {/* 1. General & Contact */}
                {activeTab === "general" && (
                  <div className="space-y-6 animate-fade-in">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                      <FormField label="Store Name" name="storeName" value={s.storeName} onChange={handleChange} placeholder="e.g. FYLEX Premium Watches" required />
                      <FormField label="Contact Email" name="storeEmail" type="email" value={s.storeEmail} onChange={handleChange} placeholder="hello@fylex.com" required />
                      <FormField label="Support Phone" name="storePhone" value={s.storePhone} onChange={handleChange} placeholder="e.g. 9876543210" maxLength={10} hint="Numbers only, 10 digits" />
                      <FormField label="WhatsApp Number" name="whatsappNumber" value={s.whatsappNumber} onChange={handleChange} placeholder="e.g. 9876543210" maxLength={10} hint="Used for customer WhatsApp click-to-chat" />
                      <FormField
                        label="Primary Currency"
                        name="currency"
                        type="select"
                        value={s.currency}
                        onChange={handleChange}
                        options={[
                          { value: "INR", label: "INR — Indian Rupee (₹)" },
                          { value: "USD", label: "USD — US Dollar ($)" },
                          { value: "EUR", label: "EUR — Euro (€)" },
                          { value: "GBP", label: "GBP — British Pound (£)" },
                        ]}
                      />
                    </div>
                    <FormField label="Business Address" name="storeAddress" type="textarea" value={s.storeAddress} onChange={handleChange} placeholder="Enter full business address..." rows={3} />
                  </div>
                )}

                {/* 2. Branding & Assets */}
                {activeTab === "branding" && (
                  <div className="space-y-6 animate-fade-in">
                    <FormField label="Brand Tagline" name="tagline" value={s.tagline} onChange={handleChange} placeholder="Designed Around Choice. Built On Experience." />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                      {/* Logo Picker */}
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Store Logo
                        </label>
                        <div
                          onClick={() => setPickerTarget("logo")}
                          style={{
                            height: 120,
                            borderRadius: 12,
                            border: "2px dashed #cbd5e1",
                            background: "#f8fafc",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            overflow: "hidden",
                            padding: 12,
                          }}
                        >
                          {s.logo ? (
                            <img src={s.logo} alt="Logo" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                          ) : (
                            <div style={{ textAlign: "center", color: "#94a3b8" }}>
                              <i className="fas fa-image" style={{ fontSize: 24, marginBottom: 4, display: "block" }} />
                              <span style={{ fontSize: 11, fontWeight: 700 }}>SELECT LOGO</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Favicon Picker */}
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Store Favicon
                        </label>
                        <div
                          onClick={() => setPickerTarget("favicon")}
                          style={{
                            height: 120,
                            borderRadius: 12,
                            border: "2px dashed #cbd5e1",
                            background: "#f8fafc",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            overflow: "hidden",
                            padding: 12,
                          }}
                        >
                          {s.favicon ? (
                            <img src={s.favicon} alt="Favicon" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                          ) : (
                            <div style={{ textAlign: "center", color: "#94a3b8" }}>
                              <i className="fas fa-bookmark" style={{ fontSize: 24, marginBottom: 4, display: "block" }} />
                              <span style={{ fontSize: 11, fontWeight: 700 }}>SELECT FAVICON</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SEO & Analytics */}
                {activeTab === "seo" && (
                  <div className="space-y-6 animate-fade-in">
                    <FormField label="Meta Title" name="metaTitle" value={s.metaTitle} onChange={handleChange} placeholder="FYLEX Premium Watches | Luxury Timepieces" hint="Recommended length: 50–60 characters" />
                    <FormField label="Meta Description" name="metaDescription" type="textarea" value={s.metaDescription} onChange={handleChange} placeholder="Discover luxury timepieces..." rows={3} hint="Recommended length: 120–160 characters" />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                      <FormField label="Google Analytics ID" name="gaId" value={s.gaId} onChange={handleChange} placeholder="G-XXXXXXXXXX" />
                      <FormField label="Facebook Pixel ID" name="fbPixelId" value={s.fbPixelId} onChange={handleChange} placeholder="123456789012345" />
                    </div>

                    <div style={{ padding: "16px 20px", background: "#f0f9ff", borderRadius: 12, border: "1px solid #bae6fd", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <i className="fas fa-robot" style={{ color: "#0284c7", fontSize: 20 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0369a1" }}>Search Engine Indexing</div>
                          <div style={{ fontSize: 11, color: "#0284c7" }}>Allow Google and search engines to index storefront pages.</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        name="seoIndexing"
                        checked={s.seoIndexing}
                        onChange={handleChange}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                    </div>
                  </div>
                )}

                {/* 4. Payments & Shipping */}
                {activeTab === "payment" && (
                  <div className="space-y-6 animate-fade-in">
                    {/* COD Box */}
                    <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <i className="fas fa-truck-loading" style={{ color: "#16a34a", fontSize: 18 }} />
                          <div>
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Cash on Delivery (COD)</h4>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>Enable doorstep payment for customers</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          name="codEnabled"
                          checked={s.codEnabled}
                          onChange={handleChange}
                          style={{ width: 18, height: 18, cursor: "pointer" }}
                        />
                      </div>

                      {s.codEnabled && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", paddingTop: 12, borderTop: "1px dashed #cbd5e1" }}>
                          <FormField label="COD Handling Fee (₹)" name="codCharge" type="number" value={s.codCharge} onChange={handleChange} placeholder="0" />
                          <FormField label="Maximum Order Limit (₹)" name="codMaxAmount" type="number" value={s.codMaxAmount} onChange={handleChange} placeholder="50000" />
                        </div>
                      )}
                    </div>

                    {/* Razorpay Box */}
                    <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
                      <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                        <i className="fas fa-credit-card" style={{ color: "#6366f1" }} /> Razorpay Credentials
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <FormField label="Razorpay Key ID" name="razorpayKey" value={s.razorpayKey} onChange={handleChange} placeholder="rzp_live_XXXXXXXX" />
                        <FormField label="Razorpay Key Secret" name="razorpaySecret" type="password" value={s.razorpaySecret} onChange={handleChange} placeholder="••••••••••••" />
                      </div>
                    </div>

                    {/* Shipping Box */}
                    <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
                      <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                        <i className="fas fa-truck" style={{ color: "#0ea5e9" }} /> Logistics &amp; Shipping
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <FormField label="Shiprocket Pickup Pincode" name="shiprocketPickupPincode" value={s.shiprocketPickupPincode} onChange={handleChange} placeholder="380001" hint="Warehouse pickup pincode for serviceability checks" />
                        <FormField label="Free Shipping Threshold (₹)" name="freeShippingThreshold" type="number" value={s.freeShippingThreshold} onChange={handleChange} placeholder="5000" hint="Orders above this amount qualify for free shipping" />
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      <MediaPickerModal
        isOpen={!!pickerTarget}
        onClose={() => setPickerTarget(null)}
        onSelect={handleMediaSelect}
        multiple={false}
      />
    </div>
  );
};

export default SettingsPage;

