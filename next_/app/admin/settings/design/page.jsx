"use client";
import React, { useState, useEffect, useRef } from 'react';
import settingsService from '@/services/settings.service';
import Loader from '@/components/admin/ui/Loader';
import ErrorBanner from '@/components/admin/ui/ErrorBanner';

const DesignSettingsPage = () => {
  const [settings, setSettings] = useState({
    'brand-primary': '#1C2E4A',
    'brand-secondary': '#F2C94C',
    'brand-accent': '#F28C38',
    'brand-black': '#0A0A0A',
    'brand-white': '#F9F9F7',
    'bg-primary': '#F9F9F7',
    'text-primary': '#111111',
    'text-secondary': '#555555',
    'btn-primary-bg': '#1a1a1a',
    'btn-primary-text': '#ffffff',
    'btn-radius': '999px',
    'radius-global': '12px',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Live Preview State
  const [previewUrl, setPreviewUrl] = useState('/discover?watch=6'); // Default preview
  const iframeRef = useRef(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await settingsService.getSettings();
      if (response?.data) {
        const dsSettings = response.data.filter(s => s.group === 'design_system');
        if (dsSettings.length > 0) {
          const dbTheme = {};
          dsSettings.forEach(s => {
            dbTheme[s.key] = s.value;
          });
          setSettings(prev => ({ ...prev, ...dbTheme }));
        }
      }
    } catch (err) {
      setError("Failed to load design settings");
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
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_DESIGN_SYSTEM',
        payload: settings
      }, '*'); // In production restrict to window.location.origin
    }
  }, [settings, previewUrl]);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        _group: 'design_system',
        ...settings
      };
      await settingsService.updateSettings(payload);
      setMessage({ type: 'success', text: 'Design settings saved globally!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader message="Loading Design Control Center..." />;
  if (error) return <ErrorBanner message={error} onRetry={fetchSettings} />;

  const renderColorInput = (label, key) => (
    <div style={{ marginBottom: 15 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>{label}</label>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input 
          type="color" 
          value={settings[key] || '#000000'}
          onChange={(e) => handleChange(key, e.target.value)}
          style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }}
        />
        <input
          type="text"
          value={settings[key] || ''}
          onChange={(e) => handleChange(key, e.target.value)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--admin-border)', fontSize: 14, outline: 'none' }}
        />
      </div>
    </div>
  );

  const renderTextInput = (label, key, placeholder) => (
    <div style={{ marginBottom: 15 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--admin-text-secondary)', marginBottom: 8, textTransform: 'uppercase' }}>{label}</label>
      <input
        type="text"
        value={settings[key] || ''}
        placeholder={placeholder}
        onChange={(e) => handleChange(key, e.target.value)}
        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--admin-border)', fontSize: 14, outline: 'none' }}
      />
    </div>
  );

  return (
    <div style={{ padding: '32px', maxWidth: '100%', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--admin-text)' }}>Design Control Center</h1>
          <p style={{ color: 'var(--admin-text-secondary)', marginTop: 4 }}>Manage global brand settings with live preview</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select 
            value={previewUrl}
            onChange={(e) => setPreviewUrl(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--admin-border)', outline: 'none' }}
          >
            <option value="/products">Products Page</option>
            <option value="/pre-configure">Pre-Configure Page</option>
            <option value="/configure?watch=6">Configure Page</option>
            <option value="/discover?watch=6">Discover Page</option>
          </select>
          <button 
            onClick={handleSave} 
            disabled={saving}
            style={{ padding: '8px 24px', background: 'var(--admin-primary)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
          >
            {saving ? 'Publishing...' : 'Publish Global Theme'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ padding: 16, marginBottom: 24, borderRadius: 8, background: message.type === 'success' ? '#def7ec' : '#fde8e8', color: message.type === 'success' ? '#03543f' : '#9b1c1c' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, height: 'calc(100% - 100px)' }}>
        
        {/* Controls Panel */}
        <div style={{ width: '350px', background: 'white', borderRadius: 16, border: '1px solid var(--admin-border)', overflowY: 'auto', padding: 24 }}>
          
          <h3 style={{ fontSize: 16, fontWeight: 700, borderBottom: '1px solid var(--admin-border)', paddingBottom: 12, marginBottom: 20 }}>Master Palette</h3>
          {renderColorInput('Primary Brand Color', 'brand-primary')}
          {renderColorInput('Secondary Color', 'brand-secondary')}
          {renderColorInput('Accent Color', 'brand-accent')}
          
          <h3 style={{ fontSize: 16, fontWeight: 700, borderBottom: '1px solid var(--admin-border)', paddingBottom: 12, marginBottom: 20, marginTop: 30 }}>Global Settings</h3>
          {renderColorInput('Page Background', 'bg-primary')}
          {renderColorInput('Primary Text', 'text-primary')}
          {renderColorInput('Secondary Text', 'text-secondary')}
          {renderTextInput('Global Border Radius', 'radius-global', 'e.g., 12px')}

          <h3 style={{ fontSize: 16, fontWeight: 700, borderBottom: '1px solid var(--admin-border)', paddingBottom: 12, marginBottom: 20, marginTop: 30 }}>Buttons & CTAs</h3>
          {renderColorInput('Button Background', 'btn-primary-bg')}
          {renderColorInput('Button Text Color', 'btn-primary-text')}
          {renderTextInput('Button Radius', 'btn-radius', 'e.g., 999px')}
          
        </div>

        {/* Live Preview Panel */}
        <div style={{ flex: 1, background: '#f8fafc', borderRadius: 16, border: '1px solid var(--admin-border)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ background: '#e2e8f0', padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
            <span>Live Preview</span>
            <span>{previewUrl}</span>
          </div>
          <iframe 
            ref={iframeRef}
            src={previewUrl}
            style={{ width: '100%', height: 'calc(100% - 34px)', border: 'none' }}
            onLoad={() => {
              // Ensure settings are passed immediately after iframe loads
              if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage({
                  type: 'UPDATE_DESIGN_SYSTEM',
                  payload: settings
                }, '*');
              }
            }}
          />
        </div>
        
      </div>
    </div>
  );
};

export default DesignSettingsPage;
