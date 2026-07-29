"use client";
import React, { useState, useEffect, useRef } from 'react';
import * as api from '@/services/adminApi';
import { useAdminData } from '@/context/AdminDataContext';
import settingsService from '@/services/settings.service';
import PageHeader from '@/components/admin/ui/PageHeader';
import Loader from '@/components/admin/ui/Loader';
import ErrorBanner from '@/components/admin/ui/ErrorBanner';
import ConfirmModal from '@/components/admin/ui/ConfirmModal';
import AdminModal from '@/components/admin/AdminModal';
import { useToast } from '@/context/ToastContext';
import { getFileUrl } from '@/lib/utils';

const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid var(--admin-border)', borderRadius: 10, outline: 'none', background: '#f8fafc', fontSize: 13, fontFamily: 'monospace' };
const inputStyleNormal = { ...inputStyle, fontFamily: 'inherit' };
const labelStyle = { fontSize: 13, fontWeight: 700, color: 'var(--admin-text)', marginBottom: 8, display: 'block' };
const sectionHeaderStyle = { padding: '24px 32px', background: '#f8fafc', borderBottom: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const sectionTitleStyle = { fontSize: 18, fontWeight: 800, color: 'var(--admin-text)', margin: 0 };
const badgeStyle = { padding: '4px 10px', background: 'var(--admin-primary-light)', color: 'var(--admin-primary)', fontSize: 11, fontWeight: 800, borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em' };
const cardBodyStyle = { padding: 32, display: 'flex', flexDirection: 'column', gap: 24 };

const DEFAULT_SETTINGS = {
    home_hero_video: '',
    home_hero_video_title: 'FYLEX',
    home_hero_video_subtitle: 'Wear Your Choice.',
    home_legacy_video: '',
    home_legacy_video_title: 'Not Everyone Follows The Same Path.',
    home_legacy_video_subtitle: 'Different Ambitions. Different Routines. Different Stories.'
};

const DEFAULT_BANNER = {
    id: null,
    type: '',
    image: '',
    title: '',
    subtitle: '',
    content: '',
    textColor: '#ffffff'
};

const HomeSections = () => {
    const toast = useToast();
    
    // --- Layout Structure State ---
    const { data, loading: adminLoading, errors, refetch, addRecord, updateRecord, deleteRecord } = useAdminData();
    const sections = (data.homeSections || []).sort((a,b) => a.order - b.order);
    
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', type: '', order: 1, status: true });
    const [confirmTarget, setConfirmTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // --- Content Editor State ---
    const [contentLoading, setContentLoading] = useState(true);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [bannerS2, setBannerS2] = useState({ ...DEFAULT_BANNER, type: 'home_s2' });
    const [bannerS3, setBannerS3] = useState({ ...DEFAULT_BANNER, type: 'home_s3' });
    const [savingContent, setSavingContent] = useState(false);
    const fileInputRefs = useRef({});
    const [activeTab, setActiveTab] = useState('structure');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        loadContentData();
    }, []);

    const loadContentData = async () => {
        setContentLoading(true);
        try {
            // Fetch Settings
            const settingsRes = await settingsService.getSettings();
            const fetchedSettings = {};
            if (settingsRes?.data) {
                settingsRes.data.forEach(s => {
                    if (Object.keys(DEFAULT_SETTINGS).includes(s.key)) {
                        fetchedSettings[s.key] = s.value;
                    }
                });
            }
            setSettings(prev => ({ ...prev, ...fetchedSettings }));

            // Fetch Banners
            const bannersRes = await api.getBanners();
            if (bannersRes?.data) {
                const s2 = bannersRes.data.find(b => b.type === 'home_s2');
                if (s2) setBannerS2(s2);
                
                const s3 = bannersRes.data.find(b => b.type === 'home_s3');
                if (s3) setBannerS3(s3);
            }
        } catch (err) {
            console.error("Failed to load content", err);
            toast?.error?.("Failed to load layout content");
        } finally {
            setContentLoading(false);
        }
    };

    // --- Structure Handlers ---
    const handleSaveStructure = async (e) => {
        if (e) e.preventDefault();
        if (!formData.name || !formData.type) {
            toast?.error?.("Name and Key are required");
            return;
        }
        setSubmitting(true);
        
        const payload = {
            ...formData,
            order: parseInt(formData.order) || 1,
            status: formData.status === 'true' || formData.status === true
        };

        let success;
        if (formData.id) {
           success = await updateRecord('homeSections', formData.id, payload, api.updateHomeSection);
        } else {
           success = await addRecord('homeSections', payload, api.createHomeSection);
        }
        
        setSubmitting(false);
        if (success || success === undefined) setShowModal(false);
    };

    const handleToggleStatus = async () => {
        if (!confirmTarget) return;
        setSubmitting(true);
        const updatedData = { ...confirmTarget, status: !confirmTarget.status };
        const success = await updateRecord('homeSections', confirmTarget.id, updatedData, api.updateHomeSection);
        setSubmitting(false);
        if (success || success === undefined) setConfirmTarget(null);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const success = await deleteRecord('homeSections', deleteTarget.id, api.deleteHomeSection);
        setDeleting(false);
        if (success || success === undefined) setDeleteTarget(null);
    };

    // --- Content Handlers ---
    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };
    
    const handleBannerChange = (bannerType, key, value) => {
        if (bannerType === 'home_s2') {
            setBannerS2(prev => ({ ...prev, [key]: value }));
        } else if (bannerType === 'home_s3') {
            setBannerS3(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleFileUpload = async (key, e, bannerType = null) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const fd = new FormData();
            fd.append('file', file);
            toast?.info?.("Uploading file...");
            const { data, error } = await api.uploadMedia(fd);
            if (error) throw new Error(error);
            const fileItem = data?.data ? (Array.isArray(data.data) ? data.data[0] : data.data) : (Array.isArray(data) ? data[0] : data);
            const fileName = fileItem?.fileName || fileItem?.name;
            const filePath = fileName ? `/uploads/${fileName}` : (fileItem?.url || fileItem?.filePath || '');
            if (!filePath) throw new Error("Could not parse uploaded file path");
            
            if (bannerType) {
                handleBannerChange(bannerType, key, filePath);
            } else {
                handleSettingChange(key, filePath);
            }
            toast?.success?.("File uploaded successfully!");
        } catch (err) {
            toast?.error?.(err.message || 'Failed to upload file');
        } finally {
            e.target.value = '';
        }
    };

    const handleSaveContent = async (e) => {
        e.preventDefault();
        setSavingContent(true);
        try {
            // Save Settings
            await settingsService.updateSettings(settings);
            
            // Save Banners
            if (bannerS2.id) {
                await api.updateBanner(bannerS2.id, bannerS2);
            } else {
                await api.createBanner(bannerS2);
            }

            if (bannerS3.id) {
                await api.updateBanner(bannerS3.id, bannerS3);
            } else {
                await api.createBanner(bannerS3);
            }

            toast?.success?.("Homepage content saved successfully!");
            setRefreshKey(prev => prev + 1); // Refresh iframe
            loadContentData(); // Refresh IDs
        } catch (err) {
            console.error("Failed to save content", err);
            toast?.error?.("Failed to save content");
        } finally {
            setSavingContent(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '60% 40%', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            {/* LEFT: EDITOR */}
            <div style={{ padding: '32px 40px', overflowY: 'auto', background: '#fff', borderRight: '1px solid var(--admin-border)' }}>
                <div className="space-y-6 animate-fade-in" style={{ paddingBottom: 60 }}>
                    <PageHeader 
                title="Home Page Layout Manager" 
                subtitle="Manage the structural blocks that appear on the storefront homepage, and easily edit their textual/visual content."
                action={{ label: 'Add Section', icon: 'fas fa-plus', onClick: () => {
                    const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order)) : 0;
                    setFormData({ name: '', type: '', order: maxOrder + 1, status: true });
                    setShowModal(true);
                }}}
            />

            {/* Custom Tabs */}
            <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--admin-border)', marginBottom: 32 }}>
                <button 
                    onClick={() => setActiveTab('structure')}
                    style={{ background: 'none', border: 'none', borderBottom: activeTab === 'structure' ? '2px solid var(--admin-primary)' : '2px solid transparent', padding: '0 0 12px 0', fontSize: 15, fontWeight: activeTab === 'structure' ? 800 : 600, color: activeTab === 'structure' ? 'var(--admin-primary)' : 'var(--admin-text-muted)', cursor: 'pointer' }}
                >
                    <i className="fas fa-layer-group" style={{ marginRight: 8 }}></i>
                    Layout Structure (Toggle & Re-order)
                </button>
                <button 
                    onClick={() => setActiveTab('content')}
                    style={{ background: 'none', border: 'none', borderBottom: activeTab === 'content' ? '2px solid var(--admin-primary)' : '2px solid transparent', padding: '0 0 12px 0', fontSize: 15, fontWeight: activeTab === 'content' ? 800 : 600, color: activeTab === 'content' ? 'var(--admin-primary)' : 'var(--admin-text-muted)', cursor: 'pointer' }}
                >
                    <i className="fas fa-paint-brush" style={{ marginRight: 8 }}></i>
                    Visual Content Editor
                </button>
            </div>

            {/* --- TAB: STRUCTURE --- */}
            {activeTab === 'structure' && (
                <div className="admin-card" style={{ borderRadius: 16 }}>
                    <div className="admin-card-header"><h3>Active Layout Structure</h3></div>
                    {adminLoading.homeSections ? <Loader message="Loading layout..." /> :
                     errors.homeSections  ? <ErrorBanner message={errors.homeSections} onRetry={() => refetch.homeSections()} /> :
                     <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 80, textAlign: 'center' }}>ORDER</th>
                                    <th>SECTION NAME</th>
                                    <th>KEY</th>
                                    <th style={{ textAlign: 'center' }}>STATUS</th>
                                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sections.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No sections found. Please ensure database is seeded.</td></tr> : 
                                 sections.map((s) => (
                                    <tr key={s.id}>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, background: '#f5f3ff', color: '#6366f1', fontWeight: 800, fontSize: 13, border: '1px solid #ddd6fe' }}>{s.order}</div>
                                        </td>
                                        <td className="cell-primary" style={{ fontWeight: 800 }}>{s.name}</td>
                                        <td><span className="cell-mono" style={{ textTransform: 'uppercase', fontSize: 11, background: '#f1f5f9', padding: '4px 10px', borderRadius: 8, color: '#475569', fontWeight: 700 }}>{s.type}</span></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button 
                                                onClick={() => setConfirmTarget(s)}
                                                style={{ display: 'inline-flex', padding: '5px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: s.status ? '#ecfdf5' : '#fff1f2', color: s.status ? '#10b981' : '#f43f5e', border: `1px solid ${s.status ? '#d1fae5' : '#fecdd3'}`, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
                                                title="Click to toggle status"
                                            >
                                                {s.status ? 'Visible' : 'Hidden'}
                                            </button>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button className="btn-icon btn-icon-edit" style={{ background: '#f1f5f9', color: '#6366f1' }} title="Edit" onClick={() => { setFormData({...s}); setShowModal(true); }}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn-icon btn-icon-delete" style={{ background: '#fef2f2', color: '#ef4444' }} title="Delete" onClick={() => setDeleteTarget(s)}>
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                 ))}
                            </tbody>
                        </table>
                     </div>
                    }
                </div>
            )}

            {/* --- TAB: CONTENT EDITOR --- */}
            {activeTab === 'content' && (
                contentLoading ? <Loader message="Loading content settings..." /> :
                <form onSubmit={handleSaveContent} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    
                    {/* SECTION 1: HERO VIDEO */}
                    <div className="admin-card" style={{ borderRadius: 16, padding: 0, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                        <div style={sectionHeaderStyle}>
                            <h3 style={sectionTitleStyle}>Section 1: Main Hero (s1)</h3>
                            <span style={badgeStyle}>Video Background</span>
                        </div>
                        <div style={cardBodyStyle}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div>
                                    <label style={labelStyle}>Hero Title</label>
                                    <input type="text" value={settings.home_hero_video_title} onChange={e => handleSettingChange('home_hero_video_title', e.target.value)} style={inputStyleNormal} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Hero Subtitle</label>
                                    <input type="text" value={settings.home_hero_video_subtitle} onChange={e => handleSettingChange('home_hero_video_subtitle', e.target.value)} style={inputStyleNormal} />
                                </div>
                            </div>
                            <div style={{ padding: 20, border: '1px solid var(--admin-border)', borderRadius: 12, background: '#fafbff' }}>
                                <label style={labelStyle}>Background Video (URL or path)</label>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <input type="text" value={settings.home_hero_video} onChange={e => handleSettingChange('home_hero_video', e.target.value)} placeholder="/assets/Fylexxx.mp4" style={{...inputStyleNormal, flex: 1, background: '#fff'}} />
                                    <input type="file" ref={el => fileInputRefs.current['home_hero_video'] = el} onChange={e => handleFileUpload('home_hero_video', e)} accept="video/*" style={{ display: 'none' }} />
                                    <button type="button" onClick={() => fileInputRefs.current['home_hero_video']?.click()} style={{ padding: '0 20px', background: '#0e1726', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer' }}>Upload</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: MOVEMENT BANNER */}
                    <div className="admin-card" style={{ borderRadius: 16, padding: 0, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                        <div style={sectionHeaderStyle}>
                            <h3 style={sectionTitleStyle}>Section 2: Movement (s2)</h3>
                            <span style={badgeStyle}>Banner Block</span>
                        </div>
                        <div style={cardBodyStyle}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div>
                                    <label style={labelStyle}>Label (Subtitle)</label>
                                    <input type="text" value={bannerS2.subtitle} onChange={e => handleBannerChange('home_s2', 'subtitle', e.target.value)} placeholder="II · Movement" style={inputStyleNormal} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Main Title (HTML)</label>
                                    <input type="text" value={bannerS2.title} onChange={e => handleBannerChange('home_s2', 'title', e.target.value)} placeholder="The <em>Heart</em> Within" style={inputStyleNormal} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Description (HTML supported)</label>
                                <textarea value={bannerS2.content} onChange={e => handleBannerChange('home_s2', 'content', e.target.value)} style={{...inputStyleNormal, minHeight: 80}} placeholder="Hundreds of hand-finished bridges..." />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div style={{ padding: 20, border: '1px solid var(--admin-border)', borderRadius: 12, background: '#fafbff' }}>
                                    <label style={labelStyle}>Background Image</label>
                                    {bannerS2.image && <img src={getFileUrl(bannerS2.image)} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} alt="Preview" />}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input type="text" value={bannerS2.image} onChange={e => handleBannerChange('home_s2', 'image', e.target.value)} placeholder="/Rim.png" style={{...inputStyleNormal, flex: 1, background: '#fff'}} />
                                        <input type="file" ref={el => fileInputRefs.current['home_s2_img'] = el} onChange={e => handleFileUpload('image', e, 'home_s2')} accept="image/*" style={{ display: 'none' }} />
                                        <button type="button" onClick={() => fileInputRefs.current['home_s2_img']?.click()} style={{ padding: '0 16px', background: '#0e1726', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer' }}>Upload</button>
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Text Color Override</label>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <input type="color" value={bannerS2.textColor || '#ffffff'} onChange={e => handleBannerChange('home_s2', 'textColor', e.target.value)} style={{ width: 44, height: 44, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                                        <input type="text" value={bannerS2.textColor} onChange={e => handleBannerChange('home_s2', 'textColor', e.target.value)} style={inputStyle} placeholder="#ffffff" />
                                    </div>
                                    <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 8 }}>Leave empty to use default CSS styling.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: DESIGN BANNER */}
                    <div className="admin-card" style={{ borderRadius: 16, padding: 0, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                        <div style={sectionHeaderStyle}>
                            <h3 style={sectionTitleStyle}>Section 3: Design (s3)</h3>
                            <span style={badgeStyle}>Banner Block</span>
                        </div>
                        <div style={cardBodyStyle}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div>
                                    <label style={labelStyle}>Label (Subtitle)</label>
                                    <input type="text" value={bannerS3.subtitle} onChange={e => handleBannerChange('home_s3', 'subtitle', e.target.value)} placeholder="III · Design" style={inputStyleNormal} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Main Title (HTML)</label>
                                    <input type="text" value={bannerS3.title} onChange={e => handleBannerChange('home_s3', 'title', e.target.value)} placeholder="Form Follows <em>Time</em>" style={inputStyleNormal} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Description (HTML supported)</label>
                                <textarea value={bannerS3.content} onChange={e => handleBannerChange('home_s3', 'content', e.target.value)} style={{...inputStyleNormal, minHeight: 80}} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div style={{ padding: 20, border: '1px solid var(--admin-border)', borderRadius: 12, background: '#fafbff' }}>
                                    <label style={labelStyle}>Background Image</label>
                                    {bannerS3.image && <img src={getFileUrl(bannerS3.image)} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} alt="Preview" />}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input type="text" value={bannerS3.image} onChange={e => handleBannerChange('home_s3', 'image', e.target.value)} placeholder="/Watch_1.png" style={{...inputStyleNormal, flex: 1, background: '#fff'}} />
                                        <input type="file" ref={el => fileInputRefs.current['home_s3_img'] = el} onChange={e => handleFileUpload('image', e, 'home_s3')} accept="image/*" style={{ display: 'none' }} />
                                        <button type="button" onClick={() => fileInputRefs.current['home_s3_img']?.click()} style={{ padding: '0 16px', background: '#0e1726', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer' }}>Upload</button>
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Text Color Override</label>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <input type="color" value={bannerS3.textColor || '#ffffff'} onChange={e => handleBannerChange('home_s3', 'textColor', e.target.value)} style={{ width: 44, height: 44, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                                        <input type="text" value={bannerS3.textColor} onChange={e => handleBannerChange('home_s3', 'textColor', e.target.value)} style={inputStyle} placeholder="#ffffff" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: LEGACY VIDEO */}
                    <div className="admin-card" style={{ borderRadius: 16, padding: 0, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                        <div style={sectionHeaderStyle}>
                            <h3 style={sectionTitleStyle}>Section 4: Legacy (s4)</h3>
                            <span style={badgeStyle}>Video Background</span>
                        </div>
                        <div style={cardBodyStyle}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
                                <div>
                                    <label style={labelStyle}>Main Title (HTML)</label>
                                    <input type="text" value={settings.home_legacy_video_title} onChange={e => handleSettingChange('home_legacy_video_title', e.target.value)} style={inputStyleNormal} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Subtitle text</label>
                                    <textarea value={settings.home_legacy_video_subtitle} onChange={e => handleSettingChange('home_legacy_video_subtitle', e.target.value)} style={{...inputStyleNormal, minHeight: 60}} />
                                </div>
                            </div>
                            <div style={{ padding: 20, border: '1px solid var(--admin-border)', borderRadius: 12, background: '#fafbff' }}>
                                <label style={labelStyle}>Background Video (URL or path)</label>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <input type="text" value={settings.home_legacy_video} onChange={e => handleSettingChange('home_legacy_video', e.target.value)} placeholder="/assets/Fylexx.mp4" style={{...inputStyleNormal, flex: 1, background: '#fff'}} />
                                    <input type="file" ref={el => fileInputRefs.current['home_legacy_video'] = el} onChange={e => handleFileUpload('home_legacy_video', e)} accept="video/*" style={{ display: 'none' }} />
                                    <button type="button" onClick={() => fileInputRefs.current['home_legacy_video']?.click()} style={{ padding: '0 20px', background: '#0e1726', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer' }}>Upload</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'sticky', bottom: 20, display: 'flex', justifyContent: 'flex-end', zIndex: 10 }}>
                        <button 
                            type="submit" 
                            disabled={savingContent}
                            className="btn-indigo-gradient"
                            style={{ padding: '14px 28px', fontSize: 15, borderRadius: 12, boxShadow: 'var(--admin-shadow-primary)', display: 'flex', alignItems: 'center', gap: 10, cursor: savingContent ? 'not-allowed' : 'pointer', opacity: savingContent ? 0.7 : 1 }}
                        >
                            {savingContent ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                            Save Content
                        </button>
                    </div>
                </form>
            )}

            {/* Structure Modals */}
            <AdminModal isOpen={showModal} onClose={() => setShowModal(false)} title={formData.id ? "Edit Section" : "Add New Section"} maxWidth={450}>
                <form onSubmit={handleSaveStructure}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
                        <div className="form-group">
                            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>Section Name</label>
                            <input type="text" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Featured Products Grid" required />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>Key Identifier (Type)</label>
                            <input type="text" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none' }} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="e.g. featured" required />
                            <p style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>This must match the key used in your frontend code.</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>Display Order</label>
                                <input type="number" style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none' }} value={formData.order} onChange={e => setFormData({...formData, order: e.target.value})} min="1" required />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>Status</label>
                                <select style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', background: '#fff' }} value={formData.status.toString()} onChange={e => setFormData({...formData, status: e.target.value === 'true'})}>
                                    <option value="true">Visible</option>
                                    <option value="false">Hidden</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 32, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
                        <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</> : 'Save Section'}</button>
                    </div>
                </form>
            </AdminModal>

            <ConfirmModal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={handleToggleStatus} title={confirmTarget?.status ? "Hide Section" : "Show Section"} message={`Are you sure you want to ${confirmTarget?.status ? 'hide' : 'show'} the "${confirmTarget?.name}" section on the home page?`} confirmLabel={confirmTarget?.status ? "Hide" : "Show"} loading={submitting} danger={confirmTarget?.status} />
            <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Section" message={`Are you sure you want to permanently delete the "${deleteTarget?.name}" section? This might break the frontend layout.`} confirmLabel="Delete" loading={deleting} danger />
                </div>
            </div>

            {/* RIGHT: LIVE PREVIEW IFRAME */}
            <div style={{ background: '#f8fafc', padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--admin-text)', margin: 0 }}>Live Storefront Preview</h3>
                        <p style={{ fontSize: 13, color: 'var(--admin-text-muted)', margin: 0 }}>Save content to update preview</p>
                    </div>
                    <button onClick={() => setRefreshKey(k => k + 1)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid var(--admin-border)', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--admin-text)' }}>
                        <i className="fas fa-sync-alt"></i> Reload
                    </button>
                </div>
                <div style={{ flex: 1, border: '1px solid var(--admin-border)', borderRadius: 16, overflow: 'hidden', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <iframe 
                        key={refreshKey}
                        src="/"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="Storefront Preview"
                    />
                </div>
            </div>
        </div>
    );
};

export default HomeSections;
