"use client";
import React, { useState, useEffect, useRef } from 'react';
import settingsService from '@/services/settings.service';
import { uploadMedia } from '@/services/adminApi';
import PageHeader from '@/components/admin/ui/PageHeader';
import Loader from '@/components/admin/ui/Loader';
import { useToast } from '@/context/ToastContext';
import { useAdminData } from '@/context/AdminDataContext';
import { getFileUrl } from '@/lib/utils';
import MediaPickerModal from '@/components/admin/MediaPickerModal';

const DEFAULT_SETTINGS = {
    shop_hero_video: '',
    shop_hero_video_is_iframe: 'false',
    shop_hero_video_title: 'FYLEX',
    shop_hero_video_subtitle: 'Wear It Your Way.',
    shop_deepsea_video: '',
    shop_deepsea_video_is_iframe: 'false',
    shop_dial_image: '',
    shop_dial_caption: 'The Atlas Legacy',
    shop_dial_title: 'We didn\'t invent the watch.<br /><em>We perfected the way you buy it.</em>',
    shop_dial_desc: 'For years, luxury meant accepting a pre-designed vision. FYLEX exists to bridge the gap between masterful assembly and personal style.',
    founder_message: 'Welcome to our premium watch collection. Crafted with precision and passion.',
    founder_watch_ids: ''
};

const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid var(--admin-border)', borderRadius: 10, outline: 'none', background: '#f8fafc', fontSize: 13, fontFamily: 'monospace' };
const inputStyleNormal = { ...inputStyle, fontFamily: 'inherit' };
const labelStyle = { fontSize: 13, fontWeight: 700, color: 'var(--admin-text)', marginBottom: 8, display: 'block' };
const sectionHeaderStyle = { padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const sectionTitleStyle = { fontSize: 18, fontWeight: 800, color: 'var(--admin-text)', margin: 0 };
const badgeStyle = { padding: '4px 10px', background: 'var(--admin-primary-light)', color: 'var(--admin-primary)', fontSize: 11, fontWeight: 800, borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' };
const cardBodyStyle = { padding: 32, display: 'flex', flexDirection: 'column', gap: 24 };

export default function AboutPageManager() {
    const toast = useToast();
    const { data: adminData, loading: adminLoading } = useAdminData();
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pickerTarget, setPickerTarget] = useState(null); // 'shop_hero_video' | 'shop_deepsea_video' | 'shop_dial_image'

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
                console.error("Failed to load settings", err);
                toast?.error?.("Failed to load current settings");
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleFileUpload = async (key, e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);
            toast?.info?.("Uploading file...");
            const { data, error } = await uploadMedia(formData);
            if (error) throw new Error(error);
            const fileItem = data?.data ? (Array.isArray(data.data) ? data.data[0] : data.data) : (Array.isArray(data) ? data[0] : data);
            const fileName = fileItem?.fileName || fileItem?.name;
            const filePath = fileName ? `/uploads/${fileName}` : (fileItem?.url || fileItem?.filePath || '');
            if (!filePath) throw new Error("Could not parse uploaded file path");
            handleChange(key, filePath);
            toast?.success?.("File uploaded successfully!");
        } catch (err) {
            toast?.error?.(err.message || 'Failed to upload file');
        } finally {
            e.target.value = '';
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await settingsService.updateSettings(settings);
            toast?.success?.("About Page settings saved successfully!");
        } catch (err) {
            console.error("Failed to save settings", err);
            toast?.error?.("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader message="Loading About Page layout settings..." />;

    return (
        <div className="space-y-6 animate-fade-in" style={{ paddingBottom: 60 }}>
            <PageHeader 
                title="About Page (Heritage) Layout" 
                subtitle="Configure the exact videos, text, and founder picks displayed on your public /about page."
            />

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                
                {/* 1. Hero Section */}
                <div className="admin-card" style={{ borderRadius: 16, padding: 0, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                    <div style={sectionHeaderStyle}>
                        <h3 style={sectionTitleStyle}>1. Hero Section</h3>
                        <span style={badgeStyle}>Top Banner</span>
                    </div>
                    <div style={cardBodyStyle}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            <div>
                                <label style={labelStyle}>Hero Title</label>
                                <input type="text" value={settings.shop_hero_video_title} onChange={e => handleChange('shop_hero_video_title', e.target.value)} style={inputStyleNormal} />
                            </div>
                            <div>
                                <label style={labelStyle}>Hero Subtitle</label>
                                <input type="text" value={settings.shop_hero_video_subtitle} onChange={e => handleChange('shop_hero_video_subtitle', e.target.value)} style={inputStyleNormal} />
                            </div>
                        </div>
                        <div style={{ padding: 20, border: '1px solid var(--admin-border)', borderRadius: 12, background: '#fafbff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <label style={{...labelStyle, marginBottom: 0}}>Hero Background Video</label>
                                <select value={settings.shop_hero_video_is_iframe} onChange={e => handleChange('shop_hero_video_is_iframe', e.target.value)} style={{ padding: '6px 12px', border: '1px solid var(--admin-border)', borderRadius: 6, fontSize: 12, fontWeight: 700, outline: 'none' }}>
                                    <option value="false">Local MP4 Upload</option>
                                    <option value="true">YouTube/Vimeo Embed URL</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <input type="text" value={settings.shop_hero_video} onChange={e => handleChange('shop_hero_video', e.target.value)} placeholder="Video URL or path..." style={{...inputStyleNormal, flex: 1, background: '#fff'}} />
                                {settings.shop_hero_video_is_iframe === 'false' && (
                                    <button type="button" onClick={() => setPickerTarget('shop_hero_video')} style={{ padding: '0 20px', background: '#0e1726', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <i className="fas fa-folder-open"></i> Media Library
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Middle Deepsea Video */}
                <div className="admin-card" style={{ borderRadius: 16, padding: 0, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                    <div style={sectionHeaderStyle}>
                        <h3 style={sectionTitleStyle}>2. Middle Deepsea Video</h3>
                        <span style={badgeStyle}>Mid-page Parallax</span>
                    </div>
                    <div style={cardBodyStyle}>
                        <div style={{ padding: 20, border: '1px solid var(--admin-border)', borderRadius: 12, background: '#fafbff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <label style={{...labelStyle, marginBottom: 0}}>Deepsea Background Video</label>
                                <select value={settings.shop_deepsea_video_is_iframe} onChange={e => handleChange('shop_deepsea_video_is_iframe', e.target.value)} style={{ padding: '6px 12px', border: '1px solid var(--admin-border)', borderRadius: 6, fontSize: 12, fontWeight: 700, outline: 'none' }}>
                                    <option value="false">Local MP4 Upload</option>
                                    <option value="true">YouTube/Vimeo Embed URL</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <input type="text" value={settings.shop_deepsea_video} onChange={e => handleChange('shop_deepsea_video', e.target.value)} placeholder="Video URL or path..." style={{...inputStyleNormal, flex: 1, background: '#fff'}} />
                                {settings.shop_deepsea_video_is_iframe === 'false' && (
                                    <button type="button" onClick={() => setPickerTarget('shop_deepsea_video')} style={{ padding: '0 20px', background: '#0e1726', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <i className="fas fa-folder-open"></i> Media Library
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Interstitial */}
                <div className="admin-card" style={{ borderRadius: 16, padding: 0, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                    <div style={sectionHeaderStyle}>
                        <h3 style={sectionTitleStyle}>3. Interstitial Text & Image</h3>
                        <span style={badgeStyle}>Below Canvas Animation</span>
                    </div>
                    <div style={cardBodyStyle}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                            
                            <div style={{ padding: 20, border: '1px solid var(--admin-border)', borderRadius: 12 }}>
                                <label style={labelStyle}>Left Image</label>
                                {settings.shop_dial_image && (
                                    <img src={getFileUrl(settings.shop_dial_image)} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} alt="Preview" />
                                )}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                                    <input type="text" value={settings.shop_dial_image} onChange={e => handleChange('shop_dial_image', e.target.value)} style={{...inputStyleNormal, flex: 1, background: '#fff'}} placeholder="Image URL..." />
                                    <button type="button" onClick={() => setPickerTarget('shop_dial_image')} style={{ padding: '0 16px', background: '#0e1726', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <i className="fas fa-folder-open"></i> Media Library
                                    </button>
                                </div>
                                <label style={{...labelStyle, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-muted)'}}>Image Caption</label>
                                <input type="text" value={settings.shop_dial_caption} onChange={e => handleChange('shop_dial_caption', e.target.value)} style={inputStyleNormal} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                <div>
                                    <label style={labelStyle}>Main Title (HTML supported)</label>
                                    <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 8 }}>Use <code>&lt;br /&gt;</code> for line breaks and <code>&lt;em&gt;</code> for italics.</p>
                                    <textarea value={settings.shop_dial_title} onChange={e => handleChange('shop_dial_title', e.target.value)} style={{...inputStyle, minHeight: 100}} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Description Paragraph</label>
                                    <textarea value={settings.shop_dial_desc} onChange={e => handleChange('shop_dial_desc', e.target.value)} style={{...inputStyleNormal, minHeight: 120}} />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* 4. Founder Section */}
                <div className="admin-card" style={{ borderRadius: 16, padding: 0, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                    <div style={sectionHeaderStyle}>
                        <h3 style={sectionTitleStyle}>4. From The Founder</h3>
                        <span style={badgeStyle}>Bottom Footer Section</span>
                    </div>
                    <div style={cardBodyStyle}>
                        <div>
                            <label style={labelStyle}>Founder's Message</label>
                            <textarea value={settings.founder_message} onChange={e => handleChange('founder_message', e.target.value)} style={{...inputStyleNormal, minHeight: 100, marginBottom: 24}} />
                        </div>
                        <div>
                            <label style={labelStyle}>Founder's Pick Variants</label>
                            <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginBottom: 12 }}>Select the specific watch variants to feature at the bottom of the About page.</p>
                            
                            {adminLoading?.products ? (
                                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)' }}>Loading products...</div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, maxHeight: 300, overflowY: 'auto', padding: 12, border: '1px solid var(--admin-border)', borderRadius: 12, background: '#fafbff' }}>
                                    {adminData?.products?.map(product => 
                                        product.variants?.map(variant => {
                                            const isSelected = settings.founder_watch_ids?.split(',').map(id => id.trim()).includes(variant.id.toString());
                                            const variantName = variant.name || variant.attributes?.find(a => a.attribute?.name === 'Color')?.value || 'Standard';
                                            return (
                                                <div 
                                                    key={variant.id}
                                                    onClick={() => {
                                                        const currentIds = settings.founder_watch_ids ? settings.founder_watch_ids.split(',').map(id => id.trim()).filter(id => id) : [];
                                                        let newIds;
                                                        if (isSelected) {
                                                            newIds = currentIds.filter(id => id !== variant.id.toString());
                                                        } else {
                                                            newIds = [...currentIds, variant.id.toString()];
                                                        }
                                                        handleChange('founder_watch_ids', newIds.join(', '));
                                                    }}
                                                    style={{ 
                                                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', 
                                                        background: isSelected ? 'var(--admin-primary-light)' : '#fff', 
                                                        border: `1px solid ${isSelected ? 'var(--admin-primary)' : 'var(--admin-border)'}`, 
                                                        borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s' 
                                                    }}
                                                >
                                                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${isSelected ? 'var(--admin-primary)' : '#cbd5e1'}`, background: isSelected ? 'var(--admin-primary)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {isSelected && <i className="fas fa-check" style={{ color: '#fff', fontSize: 10 }}></i>}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? 'var(--admin-primary-dark)' : 'var(--admin-text)' }}>{product.name}</div>
                                                        <div style={{ fontSize: 11, color: isSelected ? 'var(--admin-primary)' : 'var(--admin-text-muted)' }}>ID: {variant.id} • {variantName}</div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                            <input type="hidden" value={settings.founder_watch_ids} />
                        </div>
                    </div>
                </div>

                <div style={{ position: 'sticky', bottom: 20, display: 'flex', justifyContent: 'flex-end', zIndex: 10 }}>
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="btn-indigo-gradient"
                        style={{ padding: '14px 28px', fontSize: 15, borderRadius: 12, boxShadow: 'var(--admin-shadow-primary)', display: 'flex', alignItems: 'center', gap: 10, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                    >
                        {saving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                        Save About Page Layout
                    </button>
                </div>
            </form>

            <MediaPickerModal
                isOpen={!!pickerTarget}
                onClose={() => setPickerTarget(null)}
                onSelect={handleMediaSelect}
                multiple={false}
            />
        </div>
    );
}
