"use client";
import React, { useState, useEffect, useCallback } from 'react';
import '@/app/admin/css/custom.css';
import * as api from '@/services/adminApi';
import Loader from '@/components/admin/ui/Loader';
import ErrorBanner from '@/components/admin/ui/ErrorBanner';
import AdminModal from '@/components/admin/AdminModal';
import ConfirmModal from '@/components/admin/ui/ConfirmModal';
import PageHeader from '@/components/admin/ui/PageHeader';
import { useToast } from '@/context/ToastContext';
import { getFileUrl } from '@/lib/utils';
import MediaPickerModal from '@/components/admin/MediaPickerModal';

const CommunityPage = () => {
  const toast = useToast();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ title: '', image: '', sortOrder: 0, isActive: true, rotation: 0 });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleMediaSelect = (selection) => {
    if (!selection || !selection.length) return;
    const item = selection[0];
    const url = item.url || (item.fileName ? `/uploads/${item.fileName}` : '');
    setFormData(prev => ({ ...prev, image: url }));
    toast?.success?.('Community wristshot image selected from Media Library');
    setIsPickerOpen(false);
  };

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await api.getCommunityImages();
    if (err) {
      setError(err);
    } else {
      setImages(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleRotateCard = async (e, img) => {
    e.stopPropagation();
    const nextRot = ((img.rotation || 0) + 90) % 360;
    const res = await api.updateCommunityImage(img.id, { rotation: nextRot });
    if (!res.error) {
      toast?.success?.(`Image rotated to ${nextRot}°`);
      fetchImages();
    } else {
      toast?.error?.(res.error);
    }
  };

  const handleSave = async () => {
    if (!formData.image && !imageFile) {
      toast?.error?.('Please select an image from Media Library');
      return;
    }
    setSaving(true);

    let imagePath = formData.image;

    if (imageFile) {
      const fd = new FormData();
      fd.append('file', imageFile);
      const uploadRes = await api.uploadMedia(fd);
      if (uploadRes.error) {
        toast?.error?.('Image upload failed: ' + uploadRes.error);
        setSaving(false);
        return;
      }
      const uploaded = Array.isArray(uploadRes.data) ? uploadRes.data[0] : uploadRes.data;
      imagePath = uploaded?.filePath || uploaded?.file_path || uploaded?.path || uploaded?.fileName || '';
    }

    const payload = {
      title: formData.title,
      image: imagePath,
      sortOrder: Number(formData.sortOrder) || 0,
      isActive: formData.isActive,
      rotation: Number(formData.rotation) || 0,
    };

    let res;
    if (formData.id) {
      res = await api.updateCommunityImage(formData.id, payload);
    } else {
      res = await api.createCommunityImage(payload);
    }

    if (res.error) {
      toast?.error?.(res.error);
    } else {
      toast?.success?.(formData.id ? 'Image updated successfully' : 'Image added successfully');
      setShowModal(false);
      fetchImages();
    }
    setSaving(false);
  };

  const handleAdd = () => {
    setFormData({ title: '', image: '', sortOrder: images.length, isActive: true, rotation: 0 });
    setImageFile(null);
    setImagePreview('');
    setShowModal(true);
    setIsPickerOpen(true);
  };

  const handleEdit = (img) => {
    setFormData({
      id: img.id,
      title: img.title || '',
      image: img.image || '',
      sortOrder: img.sortOrder ?? 0,
      isActive: img.isActive ?? true,
      rotation: img.rotation ?? 0,
    });
    setImageFile(null);
    setImagePreview(img.image ? getFileUrl(img.image) : '');
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await api.deleteCommunityImage(deleteTarget.id);
    if (res.error) {
      toast?.error?.(res.error);
    } else {
      toast?.success?.('Image deleted');
      setDeleteTarget(null);
      fetchImages();
    }
    setDeleting(false);
  };

  const toggleStatus = async (img) => {
    const res = await api.updateCommunityImage(img.id, { isActive: !img.isActive });
    if (!res.error) {
      toast?.success?.(img.isActive ? 'Image hidden' : 'Image visible');
      fetchImages();
    }
  };

  const activeCount = images.filter(i => i.isActive).length;
  const inactiveCount = images.filter(i => !i.isActive).length;

  return (
    <div className="w-full px-6 lg:px-10 xl:px-16 py-6">
      <div className="max-w-[1600px] mx-auto">
        <PageHeader
          title="Community Gallery"
          subtitle={<span>Manage images for The <img src="/fylex.png" alt="FYLEX" style={{ height: '0.8em', display: 'inline-block', verticalAlign: 'middle', transform: 'translateY(-0.1em)' }} /> World. section on the homepage</span>}
          action={{ label: 'Add Image', icon: 'fas fa-plus', onClick: handleAdd }}
        />

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 24, marginBottom: 24 }}>
          {[
            { label: 'Total Images', value: images.length, icon: 'fas fa-images', color: '#6366f1', bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' },
            { label: 'Active', value: activeCount, icon: 'fas fa-eye', color: '#10b981', bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)' },
            { label: 'Hidden', value: inactiveCount, icon: 'fas fa-eye-slash', color: '#f59e0b', bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: s.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: s.color
              }}>
                <i className={s.icon}></i>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Gallery Grid */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
          overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{
            padding: '16px 24px', borderBottom: '1px solid #f3f4f6',
            background: 'linear-gradient(to bottom, #fafbfc, #f9fafb)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
              <i className="fas fa-th-large" style={{ marginRight: 8, color: '#6366f1' }}></i>
              Gallery Images
            </h3>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              Drag images in The <img src="/fylex.png" alt="FYLEX" style={{ height: '0.8em', display: 'inline-block', verticalAlign: 'middle', transform: 'translateY(-0.1em)' }} /> World. carousel
            </span>
          </div>

          <div style={{ padding: 24 }}>
            {loading ? (
              <div style={{ padding: '80px 0' }}><Loader message="Loading community images..." /></div>
            ) : error ? (
              <ErrorBanner message={error} onRetry={fetchImages} />
            ) : images.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '80px 40px',
                color: '#9ca3af'
              }}>
                <i className="fas fa-camera-retro" style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}></i>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>No images yet</p>
                <p style={{ fontSize: 13 }}>Add your first community image to showcase in The <img src="/fylex.png" alt="FYLEX" style={{ height: '0.8em', display: 'inline-block', verticalAlign: 'middle', transform: 'translateY(-0.1em)' }} /> World.</p>
                <button
                  onClick={handleAdd}
                  style={{
                    marginTop: 20, padding: '10px 24px', background: '#6366f1',
                    color: '#fff', border: 'none', borderRadius: 10,
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fas fa-plus" style={{ marginRight: 8 }}></i>Add Image
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 20
              }}>
                {images.map((img) => {
                  const resolvedUrl = getFileUrl(img.image);

                  return (
                    <div key={img.id} style={{
                      position: 'relative', borderRadius: 14, overflow: 'hidden',
                      border: '1px solid #e5e7eb', background: '#f9fafb',
                      transition: 'all 0.3s ease',
                      opacity: img.isActive ? 1 : 0.55,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.10)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                    >
                      {/* Image */}
                      <div style={{ position: 'relative', paddingTop: '100%', background: '#18181b', overflow: 'hidden' }}>
                        <img
                          src={resolvedUrl}
                          alt={img.title || 'Community'}
                          style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                            objectFit: 'cover',
                            transform: `rotate(${img.rotation || 0}deg) ${(img.rotation || 0) % 180 !== 0 ? 'scale(1.35)' : 'scale(1)'}`,
                            transition: 'transform 0.3s ease'
                          }}
                        />

                        {/* Overlay actions */}
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
                          opacity: 0, transition: 'opacity 0.25s', display: 'flex',
                          alignItems: 'flex-end', justifyContent: 'center',
                          padding: '0 8px 12px', gap: 6
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                        >
                          <button
                            onClick={(e) => handleRotateCard(e, img)}
                            title="Rotate 90°"
                            style={{
                              padding: '7px 10px', background: 'rgba(99,102,241,0.95)',
                              border: 'none', borderRadius: 8, cursor: 'pointer',
                              fontSize: 12, fontWeight: 600, color: '#fff',
                              display: 'flex', alignItems: 'center', gap: 4,
                              backdropFilter: 'blur(8px)'
                            }}
                          >
                            <i className="fas fa-redo"></i> Rotate
                          </button>
                          <button
                            onClick={() => handleEdit(img)}
                            style={{
                              padding: '7px 10px', background: 'rgba(255,255,255,0.95)',
                              border: 'none', borderRadius: 8, cursor: 'pointer',
                              fontSize: 12, fontWeight: 600, color: '#111',
                              display: 'flex', alignItems: 'center', gap: 4,
                              backdropFilter: 'blur(8px)'
                            }}
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button
                            onClick={() => toggleStatus(img)}
                            style={{
                              padding: '7px 10px',
                              background: img.isActive ? 'rgba(245,158,11,0.9)' : 'rgba(16,185,129,0.9)',
                              border: 'none', borderRadius: 8, cursor: 'pointer',
                              fontSize: 12, fontWeight: 600, color: '#fff',
                              display: 'flex', alignItems: 'center', gap: 4
                            }}
                          >
                            <i className={`fas fa-eye${img.isActive ? '-slash' : ''}`}></i>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(img)}
                            style={{
                              padding: '7px 10px', background: 'rgba(239,68,68,0.9)',
                              border: 'none', borderRadius: 8, cursor: 'pointer',
                              fontSize: 12, fontWeight: 600, color: '#fff',
                              display: 'flex', alignItems: 'center', gap: 4
                            }}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>

                        {/* Rotation indicator pill */}
                        {Boolean(img.rotation) && (
                          <div style={{
                            position: 'absolute', top: 10, left: 10,
                            padding: '3px 8px', borderRadius: 20,
                            background: 'rgba(99,102,241,0.9)', color: '#fff',
                            fontSize: 10, fontWeight: 700, backdropFilter: 'blur(4px)'
                          }}>
                            {img.rotation}°
                          </div>
                        )}

                        {/* Status badge */}
                        <div style={{
                          position: 'absolute', top: 10, right: 10,
                          padding: '3px 10px', borderRadius: 20,
                          background: img.isActive ? 'rgba(16,185,129,0.9)' : 'rgba(107,114,128,0.9)',
                          color: '#fff', fontSize: 10, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          backdropFilter: 'blur(4px)'
                        }}>
                          {img.isActive ? 'Active' : 'Hidden'}
                        </div>

                        {/* Sort order badge */}
                        <div style={{
                          position: 'absolute', top: 10, left: 10,
                          width: 28, height: 28, borderRadius: 8,
                          background: 'rgba(0,0,0,0.5)', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, backdropFilter: 'blur(4px)'
                        }}>
                          {img.sortOrder ?? 0}
                        </div>
                      </div>

                      {/* Title bar */}
                      {img.title && (
                        <div style={{
                          padding: '10px 14px', borderTop: '1px solid #f3f4f6',
                          fontSize: 13, fontWeight: 600, color: '#374151',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {img.title}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add new card */}
                <div
                  onClick={handleAdd}
                  style={{
                    borderRadius: 14, border: '2px dashed #d1d5db',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: 220, cursor: 'pointer', background: '#fafafa',
                    transition: 'all 0.2s', color: '#9ca3af'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1'; e.currentTarget.style.background = '#f5f3ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = '#fafafa'; }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: '#e0e7ff', color: '#6366f1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, marginBottom: 8
                  }}>
                    <i className="fas fa-plus"></i>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Add Image</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Create/Edit */}
        <AdminModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={formData.id ? 'Edit Community Image' : 'Add Community Image'}
          maxWidth="max-w-lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Image Upload/Preview */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
                  Image *
                </label>
                {formData.image && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rotation: ((prev.rotation || 0) + 90) % 360 }))}
                    style={{
                      padding: '4px 10px', background: '#e0e7ff', color: '#4338ca',
                      border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <i className="fas fa-redo"></i> Rotate ({formData.rotation || 0}°)
                  </button>
                )}
              </div>
              <div 
                onClick={() => setIsPickerOpen(true)}
                style={{
                  position: 'relative', width: '100%', height: 200,
                  borderRadius: 12, border: '2px dashed #cbd5e1',
                  overflow: 'hidden', background: '#f9fafb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                {formData.image ? (
                  <>
                    <img
                      src={getFileUrl(formData.image)}
                      alt="Preview"
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        transform: `rotate(${formData.rotation || 0}deg) ${(formData.rotation || 0) % 180 !== 0 ? 'scale(1.35)' : 'scale(1)'}`,
                        transition: 'transform 0.3s ease'
                      }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: 0, transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }} className="hover:opacity-100 opacity-hover">
                      <i className="fas fa-folder-open mr-2"></i> Select from Media Library
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#475569' }}>
                    <i className="fas fa-folder-open text-3xl text-indigo-400 mb-2" style={{ fontSize: 32, marginBottom: 8 }}></i>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>Click to select from Media Library</p>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Title / Caption
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. #FylexTimepiece in Tokyo"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid #d1d5db', fontSize: 14, outline: 'none'
                }}
              />
            </div>

            {/* Sort Order & Active Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={e => setFormData({ ...formData, sortOrder: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    border: '1px solid #d1d5db', fontSize: 14, outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Visibility
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: '#6366f1' }}
                  />
                  <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>Active (Visible)</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px', background: '#f3f4f6', color: '#374151',
                  border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '10px 24px', background: '#6366f1', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : (formData.id ? 'Update Image' : 'Add Image')}
              </button>
            </div>
          </div>
        </AdminModal>

        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Image"
          message={`Are you sure you want to delete this community image? This action cannot be undone.`}
          confirmLabel="Delete"
          isDanger
          loading={deleting}
        />

        <MediaPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={handleMediaSelect}
          multiple={false}
        />
      </div>
    </div>
  );
};

export default CommunityPage;
