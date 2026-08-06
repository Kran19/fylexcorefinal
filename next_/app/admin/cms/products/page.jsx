"use client";
import React, { useState, useEffect } from 'react';
import settingsService from '@/services/settings.service';
import { uploadMedia } from '@/services/adminApi';
import PageHeader from '@/components/admin/ui/PageHeader';
import Loader from '@/components/admin/ui/Loader';
import { useToast } from '@/context/ToastContext';
import { getFileUrl } from '@/lib/utils';
import MediaPickerModal from '@/components/admin/MediaPickerModal';

const DEFAULT_SETTINGS = {
    products_hero_video: '',
    products_hero_video_is_iframe: 'false',
    products_hero_eyebrow: 'COLLECTION',
    products_hero_title: 'TIMEPIECES',
    products_hero_subtitle: 'Explore our masterfully assembled luxury watch collection.'
};

const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid var(--admin-border)', borderRadius: 10, outline: 'none', background: '#f8fafc', fontSize: 13, fontFamily: 'monospace' };
const inputStyleNormal = { ...inputStyle, fontFamily: 'inherit' };
const labelStyle = { fontSize: 13, fontWeight: 700, color: 'var(--admin-text)', marginBottom: 8, display: 'block' };
const sectionHeaderStyle = { padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const sectionTitleStyle = { fontSize: 18, fontWeight: 800, color: 'var(--admin-text)', margin: 0 };
const badgeStyle = { padding: '4px 10px', background: 'var(--admin-primary-light)', color: 'var(--admin-primary)', fontSize: 11, fontWeight: 800, borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' };
const cardBodyStyle = { padding: 32, display: 'flex', flexDirection: 'column', gap: 24 };

export default function ProductsCMSManager() {
    const toast = useToast();
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pickerTarget, setPickerTarget] = useState(null); // 'products_hero_video'

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const response = await settingsService.getSettings();
                const fetchedSettings = {};
                if (response?.data) {
                    response.data.forEach(s => {
                        if (Object.keys(DEFAULT_SETTINGS).includes(s.key)) {
                            fetchedSettings[s.key] = s.value;
                        }
                    });
                }
                setSettings(prev => ({ ...prev, ...fetchedSettings }));
            } catch (err) {
                console.error("Failed to load products CMS settings", err);
                toast?.error?.("Failed to load current products settings");
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleMediaSelect = (selection) => {
        if (!selection || !selection.length) return;
        const item = selection[0];
        const url = item.url || (item.fileName ? `/uploads/${item.fileName}` : '');
        if (pickerTarget) {
            handleChange(pickerTarget, url);
            toast?.success('Asset selected from Media Library');
        }
        setPickerTarget(null);
    };

    const handleFileUpload = async (key, e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);
            toast?.info?.("Uploading video...");
            const { data, error } = await uploadMedia(formData);
            if (error) throw new Error(error);
            const fileItem = data?.data ? (Array.isArray(data.data) ? data.data[0] : data.data) : (Array.isArray(data) ? data[0] : data);
            const fileName = fileItem?.fileName || fileItem?.name;
            const filePath = fileName ? `/uploads/${fileName}` : (fileItem?.url || fileItem?.filePath || '');
            if (!filePath) throw new Error("Could not parse uploaded file path");
            handleChange(key, filePath);
            toast?.success?.("Video uploaded successfully!");
        } catch (err) {
            toast?.error?.(err.message || 'Failed to upload video');
        } finally {
            e.target.value = '';
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await settingsService.updateSettings(settings);
            toast?.success?.("Products Page CMS settings saved successfully!");
        } catch (err) {
            console.error("Failed to save settings", err);
            toast?.error?.("Failed to save products page settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader message="Loading Products Page layout settings..." />;

    return (
        <div className="space-y-6 animate-fade-in" style={{ paddingBottom: 60 }}>
            <PageHeader 
                title="Products Page Layout Manager" 
                subtitle="Configure the exact hero video, headings, and video media displayed on your public /products page."
            />

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                
                {/* 1. Hero Video Section */}
                <div className="admin-card" style={{ borderRadius: 16, padding: 0, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                    <div style={sectionHeaderStyle}>
                        <h3 style={sectionTitleStyle}>1. Hero Video & Media</h3>
                        <span style={badgeStyle}>Top Banner (/products)</span>
                    </div>
                    <div style={cardBodyStyle}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            <div>
                                <label style={labelStyle}>Eyebrow Text</label>
                                <input type="text" value={settings.products_hero_eyebrow} onChange={e => handleChange('products_hero_eyebrow', e.target.value)} style={inputStyleNormal} />
                            </div>
                            <div>
                                <label style={labelStyle}>Main Title</label>
                                <input type="text" value={settings.products_hero_title} onChange={e => handleChange('products_hero_title', e.target.value)} style={inputStyleNormal} />
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Subtitle Description</label>
                            <input type="text" value={settings.products_hero_subtitle} onChange={e => handleChange('products_hero_subtitle', e.target.value)} style={inputStyleNormal} />
                        </div>

                        <div style={{ padding: 20, border: '1px solid var(--admin-border)', borderRadius: 12, background: '#fafbff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <label style={{...labelStyle, marginBottom: 0}}>Products Page Hero Video</label>
                                <select value={settings.products_hero_video_is_iframe} onChange={e => handleChange('products_hero_video_is_iframe', e.target.value)} style={{ padding: '6px 12px', border: '1px solid var(--admin-border)', borderRadius: 6, fontSize: 12, fontWeight: 700, outline: 'none' }}>
                                    <option value="false">Local MP4 Upload</option>
                                    <option value="true">YouTube/Vimeo Embed URL</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                <input type="text" value={settings.products_hero_video} onChange={e => handleChange('products_hero_video', e.target.value)} placeholder="Video path (e.g. /uploads/video.mp4 or /assets/Fylex.mp4)" style={{...inputStyleNormal, flex: 1, background: '#fff'}} />
                                {settings.products_hero_video_is_iframe === 'false' && (
                                    <>
                                        <button type="button" onClick={() => setPickerTarget('products_hero_video')} style={{ padding: '0 20px', background: '#0e1726', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <i className="fas fa-folder-open"></i> Media Library
                                        </button>
                                        <label style={{ padding: '10px 16px', background: 'var(--admin-primary)', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                                            <i className="fas fa-upload"></i> Upload MP4
                                            <input type="file" accept="video/mp4,video/*" onChange={(e) => handleFileUpload('products_hero_video', e)} style={{ display: 'none' }} />
                                        </label>
                                    </>
                                )}
                            </div>

                            {settings.products_hero_video && (
                                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--admin-border)', maxHeight: 220, background: '#000' }}>
                                    <video src={getFileUrl(settings.products_hero_video)} controls autoPlay muted loop style={{ width: '100%', maxHeight: 220, objectFit: 'contain' }} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ position: 'sticky', bottom: 20, display: 'flex', justifyContent: 'flex-end', zIndex: 10 }}>
                    <button 
                        type="submit" 
                        disabled={saving}
                        style={{
                            padding: '14px 36px',
                            background: 'var(--admin-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            fontSize: 14,
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 10px 25px rgba(0, 135, 103, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            transition: 'all 0.2s'
                        }}
                    >
                        {saving ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i> Saving...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save"></i> Save Products Page Layout
                            </>
                        )}
                    </button>
                </div>
            </form>

            {pickerTarget && (
                <MediaPickerModal 
                    isOpen={true} 
                    onClose={() => setPickerTarget(null)} 
                    onSelect={handleMediaSelect}
                    title="Select Hero Video Asset"
                    typeFilter="video"
                />
            )}
        </div>
    );
}
