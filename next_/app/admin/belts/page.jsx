'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
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

export default function BeltsPage() {
  const toast = useToast();
  const [belts, setBelts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBelt, setEditingBelt] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    isActive: true,
    imageId: null,
    imageObj: null
  });
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const fetchBelts = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${getApiUrl()}/belts`);
      if (Array.isArray(data)) {
        setBelts(data);
      } else if (data && Array.isArray(data.data)) {
        setBelts(data.data);
      } else {
        console.warn('API returned non-array data:', data);
        setBelts([]);
      }
    } catch (err) {
      console.error(err);
      toast?.error?.('Failed to fetch belts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBelts();
  }, []);

  const openModal = (belt = null) => {
    if (belt) {
      setEditingBelt(belt);
      setFormData({
        name: belt.name,
        price: belt.price,
        stock: belt.stock,
        isActive: belt.isActive,
        imageId: belt.imageId || null,
        imageObj: belt.image || null
      });
    } else {
      setEditingBelt(null);
      setFormData({
        name: '',
        price: '',
        stock: '',
        isActive: true,
        imageId: null,
        imageObj: null
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBelt(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBelt) {
        await axios.put(`${getApiUrl()}/belts/${editingBelt.id}`, formData);
        toast?.success?.('Belt updated successfully');
      } else {
        await axios.post(`${getApiUrl()}/belts`, formData);
        toast?.success?.('Belt created successfully');
      }
      closeModal();
      fetchBelts();
    } catch (err) {
      console.error(err);
      toast?.error?.('Failed to save belt');
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await axios.delete(`${getApiUrl()}/belts/${deleteConfirmId}`);
      toast?.success?.('Belt has been deleted successfully');
      setDeleteConfirmId(null);
      fetchBelts();
    } catch (err) {
      console.error(err);
      toast?.error?.('Failed to delete belt');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Belts Management" 
        subtitle="Manage configurable watch belt accessories and stock levels"
        action={{ label: 'Add Belt', icon: 'fas fa-plus', onClick: () => openModal() }}
      />

      <div className="admin-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <Loader message="Loading belts..." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Image</th>
                  <th>Belt Name</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th style={{ width: 180 }}>Status</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {belts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500" style={{ fontWeight: 600 }}>
                      No belts found
                    </td>
                  </tr>
                ) : (
                  belts.map(belt => (
                    <tr key={belt.id} className="hover:bg-slate-50/50">
                      <td className="py-3">
                        {belt.image ? (
                          <img 
                            src={getFileUrl(belt.image.url || belt.image.filePath || belt.image.path || belt.image.fileName || (typeof belt.image === 'string' ? belt.image : null))} 
                            alt={belt.name} 
                            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0' }} 
                          />
                        ) : (
                          <div style={{ width: 48, height: 48, background: '#f1f5f9', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <FaImage size={16} />
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: '#1e293b' }}>
                        {belt.name}
                      </td>
                      <td style={{ fontWeight: 600, color: '#475569' }}>
                        Rs. {parseFloat(belt.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontWeight: 600, color: '#475569' }}>
                        {belt.stock} pcs
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
                            background: belt.isActive ? '#ecfdf5' : '#fef2f2',
                            color: belt.isActive ? '#10b981' : '#ef4444',
                            border: `1px solid ${belt.isActive ? '#d1fae5' : '#fee2e2'}`,
                            textTransform: 'uppercase'
                          }}
                        >
                          {belt.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                      <td className="text-right">
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => openModal(belt)} 
                            className="btn-icon"
                            style={{ background: '#f1f5f9', color: '#6366f1' }}
                            title="Edit"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(belt.id)} 
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

      {/* Edit/Create Belt Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingBelt ? 'Edit Belt Details' : 'Add New Belt'}
        maxWidth={460}
      >
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>Belt Name *</label>
            <input 
              type="text" 
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none' }}
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Royal Blue Alligator Strap"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>Price (Rs.) *</label>
              <input 
                type="number" 
                step="0.01"
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none' }}
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="2499.00"
                required
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>Stock *</label>
              <input 
                type="number" 
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none' }}
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: e.target.value})}
                placeholder="50"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>Belt Asset Media</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {formData.imageObj ? (
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <img 
                    src={formData.imageObj.fileName ? getFileUrl(formData.imageObj.fileName) : formData.imageObj.url} 
                    alt="Belt Preview" 
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
              This action cannot be undone. This belt accessory option will be permanently removed from products.
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
