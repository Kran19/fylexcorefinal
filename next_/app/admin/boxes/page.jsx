'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
const axiosInstance = axios;
import { FaEdit, FaTrash, FaPlus, FaCheck, FaTimes, FaImage, FaExclamationTriangle } from 'react-icons/fa';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import AdminModal from '@/components/admin/AdminModal';
import PageHeader from '@/components/admin/ui/PageHeader';
import Loader from '@/components/admin/ui/Loader';
import { useToast } from '@/context/ToastContext';
import { getFileUrl } from '@/lib/utils';
import '@/app/admin/css/datatable.css';
import '@/app/admin/css/custom.css';

const getApiUrl = () => {
  let urlStr = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(urlStr);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        url.hostname = window.location.hostname;
        urlStr = url.toString().replace(/\/$/, '');
      }
    } catch (e) {}
  }
  return urlStr;
};

export default function BoxesPage() {
  const toast = useToast();
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBox, setEditingBox] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    imageId: null,
    imageObj: null
  });
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const fetchBoxes = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(`${getApiUrl()}/boxes`);
      if (Array.isArray(data)) {
        setBoxes(data);
      } else if (data && Array.isArray(data.data)) {
        setBoxes(data.data);
      } else {
        console.warn('API returned non-array data:', data);
        setBoxes([]);
      }
    } catch (err) {
      console.error(err);
      toast?.error?.('Failed to fetch boxes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoxes();
  }, []);

  const openModal = (box = null) => {
    if (box) {
      setEditingBox(box);
      setFormData({
        name: box.name,
        isActive: box.isActive,
        imageId: box.imageId || null,
        imageObj: box.image || null
      });
    } else {
      setEditingBox(null);
      setFormData({
        name: '',
        isActive: true,
        imageId: null,
        imageObj: null
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBox(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBox) {
        await axiosInstance.put(`${getApiUrl()}/boxes/${editingBox.id}`, formData);
        toast?.success?.('Box updated successfully');
      } else {
        await axiosInstance.post(`${getApiUrl()}/boxes`, formData);
        toast?.success?.('Box created successfully');
      }
      closeModal();
      fetchBoxes();
    } catch (err) {
      console.error(err);
      toast?.error?.('Failed to save box');
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await axiosInstance.delete(`${getApiUrl()}/boxes/${deleteConfirmId}`);
      toast?.success?.('Box has been deleted successfully');
      setDeleteConfirmId(null);
      fetchBoxes();
    } catch (err) {
      console.error(err);
      toast?.error?.('Failed to delete box');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Boxes Management" 
        subtitle="Manage inventory boxes and universal packaging details"
        action={{ label: 'Add Box', icon: 'fas fa-plus', onClick: () => openModal() }}
      />

      <div className="admin-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <Loader message="Loading boxes..." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Image</th>
                  <th>Box Name</th>
                  <th style={{ width: 180 }}>Status</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {boxes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500" style={{ fontWeight: 600 }}>
                      No boxes found
                    </td>
                  </tr>
                ) : (
                  boxes.map(box => (
                    <tr key={box.id} className="hover:bg-slate-50/50">
                      <td className="py-3">
                        {box.image ? (
                          <img 
                            src={getFileUrl(box.image.url || box.image.filePath || box.image.path || box.image.fileName || (typeof box.image === 'string' ? box.image : null))} 
                            alt={box.name} 
                            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0' }} 
                          />
                        ) : (
                          <div style={{ width: 48, height: 48, background: '#f1f5f9', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <FaImage size={16} />
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: '#1e293b' }}>
                        {box.name}
                      </td>
                      <td>
                        <div 
                          className="status-badge"
                          style={{
                            display: 'inline-flex',
                            padding: '5px 12px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                            background: box.isActive ? '#ecfdf5' : '#fef2f2',
                            color: box.isActive ? '#10b981' : '#ef4444',
                            border: `1px solid ${box.isActive ? '#d1fae5' : '#fee2e2'}`,
                            textTransform: 'uppercase'
                          }}
                        >
                          {box.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                      <td className="text-right">
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => openModal(box)} 
                            className="btn-icon"
                            style={{ background: '#f1f5f9', color: '#6366f1' }}
                            title="Edit"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(box.id)} 
                            className="btn-icon"
                            style={{ background: '#fef2f2', color: '#ef4444' }}
                            title="Delete"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit/Create Box Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingBox ? 'Edit Box Details' : 'Add New Box'}
        maxWidth={460}
      >
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>Box Name *</label>
            <input 
              type="text" 
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none' }}
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Premium Piano Lacquer Box"
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>Box Asset Media</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {formData.imageObj ? (
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <img 
                    src={formData.imageObj.fileName ? getFileUrl(formData.imageObj.fileName) : formData.imageObj.url} 
                    alt="Box Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, border: '1px solid #e2e8f0' }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, imageId: null, imageObj: null})}
                    style={{
                      position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff',
                      borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 10, border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : (
                <div style={{ width: 80, height: 80, background: '#f8fafc', borderRadius: 12, border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <FaImage size={24} />
                </div>
              )}
              
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(true)}
                className="btn-filter-dark"
                style={{ padding: '10px 16px', fontSize: 13, borderRadius: 10 }}
              >
                <FaImage className="mr-2 inline" /> {formData.imageId ? 'Change Image' : 'Select Image'}
              </button>
            </div>
          </div>
          
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input 
              type="checkbox" 
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#000' }}
            />
            <label htmlFor="isActive" style={{ fontSize: 14, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>Visible and Active in Configuration</label>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <button 
              type="button" 
              onClick={closeModal}
              className="btn-filter-dark"
              style={{ background: '#f1f5f9', color: '#475569', border: 'none' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-filter-dark"
              style={{ background: '#000', color: '#fff' }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Delete Confirmation Modal */}
      <AdminModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Deletion"
        maxWidth={400}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '10px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <FaExclamationTriangle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>Are you absolutely sure?</h3>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              This action cannot be undone. This box packaging option will be permanently removed from products.
            </p>
          </div>
          <div style={{ display: 'flex', width: '100%', gap: 12, marginTop: 12 }}>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="btn-filter-dark"
              style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none' }}
            >
              Cancel
            </button>
            <button
              onClick={executeDelete}
              className="btn-filter-dark"
              style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none' }}
            >
              Delete Option
            </button>
          </div>
        </div>
      </AdminModal>
      
      <MediaPickerModal 
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        multiple={false}
        onSelect={(selected) => {
            if (selected && selected.length > 0) {
                setFormData({
                    ...formData,
                    imageId: parseInt(selected[0].id),
                    imageObj: selected[0]
                });
            }
        }}
      />
    </div>
  );
}
