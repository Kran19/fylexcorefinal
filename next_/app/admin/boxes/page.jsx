'use client';
import { useState, useEffect } from 'react';
import { getBoxes, createBox, updateBox, deleteBox } from '@/services/adminApi';
import { FaEdit, FaTrash, FaPlus, FaCheck, FaTimes, FaImage, FaExclamationTriangle } from 'react-icons/fa';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import AdminModal from '@/components/admin/AdminModal';
import PageHeader from '@/components/admin/ui/PageHeader';
import Loader from '@/components/admin/ui/Loader';
import DataTable from '@/components/admin/table/DataTable';
import { useToast } from '@/context/ToastContext';
import { getFileUrl } from '@/lib/utils';
import '@/app/admin/css/datatable.css';
import '@/app/admin/css/custom.css';

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
      const res = await getBoxes();
      const list = res?.data || res;
      if (Array.isArray(list)) {
        setBoxes(list);
      } else if (list && Array.isArray(list.data)) {
        setBoxes(list.data);
      } else {
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
        const res = await updateBox(editingBox.id, formData);
        if (res?.error) return toast?.error?.(res.error);
        toast?.success?.('Box updated successfully');
      } else {
        const res = await createBox(formData);
        if (res?.error) return toast?.error?.(res.error);
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
      const res = await deleteBox(deleteConfirmId);
      if (res?.error) return toast?.error?.(res.error);
      toast?.success?.('Box has been deleted successfully');
      setDeleteConfirmId(null);
      fetchBoxes();
    } catch (err) {
      console.error(err);
      toast?.error?.('Failed to delete box');
    }
  };

  const columns = [
    {
      title: "Image", field: "image", width: 90, hozAlign: "center", headerSort: false,
      formatter: (cell) => {
        const box = cell.getRow().getData();
        const url = getFileUrl(box.image?.url || box.image?.filePath || box.image?.path || box.image?.fileName || (typeof box.image === 'string' ? box.image : null));
        if (url) return `<img src="${url}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0" />`;
        return `<div style="width:40px;height:40px;border-radius:8px;background:#f1f5f9;display:inline-flex;align-items:center;justify-content:center;color:#94a3b8"><i class="fas fa-box"></i></div>`;
      }
    },
    { title: "Box Name", field: "name", minWidth: 250, formatter: cell => `<strong class="text-slate-800 font-bold">${cell.getValue()}</strong>` },
    {
      title: "Status", field: "isActive", width: 140, hozAlign: "center",
      formatter: (cell) => {
        const active = cell.getValue() === true || cell.getValue() === 1;
        return `<span class="px-3 py-1 rounded-full text-xs font-bold ${active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'}">${active ? 'Active' : 'Inactive'}</span>`;
      }
    },
    {
      title: "Actions", width: 120, headerSort: false, hozAlign: "right",
      formatter: () => `<div style="display:flex;gap:6px;justify-content:flex-end">
        <button class="btn-icon-edit style-btn-edit" style="background:#f5f3ff;color:#6366f1;width:32px;height:32px;border-radius:8px;border:none;cursor:pointer"><i class="fas fa-edit"></i></button>
        <button class="btn-icon-delete style-btn-delete" style="background:#fef2f2;color:#ef4444;width:32px;height:32px;border-radius:8px;border:none;cursor:pointer"><i class="fas fa-trash-alt"></i></button>
      </div>`,
      cellClick: (e, cell) => {
        const d = cell.getRow().getData();
        if (e.target.closest('.btn-icon-edit')) openModal(d);
        if (e.target.closest('.btn-icon-delete')) setDeleteConfirmId(d.id);
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <DataTable
        title="Universal Boxes & Packaging"
        subtitle="Manage inventory boxes and universal packaging details"
        data={boxes}
        columns={columns}
        loading={loading}
        minWidth={950}
        action={{
          label: 'Add Box',
          icon: 'fas fa-plus',
          onClick: () => openModal()
        }}
        exportFileName="packaging_boxes"
        emptyTitle="No boxes found"
      />

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
