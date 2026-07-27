"use client";
import React, { useState, useRef, useEffect } from 'react';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import '@/app/admin/css/datatable.css';
import '@/app/admin/css/custom.css';
import { useAdminData } from '@/context/AdminDataContext';
import * as api from '@/services/adminApi';
import PageHeader from '@/components/admin/ui/PageHeader';
import FormField from '@/components/admin/ui/FormField';
import Loader from '@/components/admin/ui/Loader';
import ErrorBanner from '@/components/admin/ui/ErrorBanner';
import ConfirmModal from '@/components/admin/ui/ConfirmModal';
import AdminModal from '@/components/admin/AdminModal';
import DataTable from '@/components/admin/table/DataTable';
import { useToast } from '@/context/ToastContext';

const CareStepsManagement = () => {
  const toast = useToast();
  const { data, loading, errors, refetch, addRecord, updateRecord, deleteRecord } = useAdminData();
  
  const steps = data.productCareSteps || [];
  const products = data.products || [];

  const tableRef = useRef(null);
  const tabulatorRef = useRef(null);
  const actionsRef = useRef({});

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    productId: '',
    stepNumber: '1',
    title: '',
    description: '',
    imageUrl: ''
  });
  const [formErrors, setFormErrors] = useState({});



  const columns = [
    { title: 'STEP NO', field: 'stepNumber', width: 90, hozAlign: 'center', formatter: (cell) => `<span class="w-6 h-6 inline-flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">${cell.getValue()}</span>` },
    { 
      title: 'IMAGE', field: 'imageUrl', width: 120, hozAlign: 'center', headerSort: false,
      formatter: (cell) => {
        const raw = cell.getValue() || cell.getRow().getData().image || cell.getRow().getData().image_url || '';
        const url = api.formatImageUrl(raw);
        return url ? `<img src="${url}" class="w-16 h-16 object-cover rounded shadow-sm border border-slate-200" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="w-16 h-16 bg-slate-100 rounded items-center justify-center text-slate-300 hidden"><i class="fas fa-image"></i></div>` : `<div class="w-16 h-16 bg-slate-100 rounded flex items-center justify-center text-slate-300"><i class="fas fa-image"></i></div>`;
      }
    },
    { title: 'TITLE', field: 'title', headerSort: false, formatter: (cell) => `<div class="font-bold text-slate-800">${cell.getValue()}</div>` },
    { title: 'DESCRIPTION', field: 'description', headerSort: false, formatter: (cell) => `<div class="text-slate-500 text-sm truncate max-w-xs">${cell.getValue() || '-'}</div>` },
    {
      title: 'ACTIONS', headerSort: false, hozAlign: 'right', width: 110,
      formatter: () => `<div class="flex gap-2 justify-end">
        <button class="btn-icon style-btn-edit" style="background:#f5f3ff;color:#6366f1;width:32px;height:32px;border-radius:8px;border:none;cursor:pointer" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="btn-icon-delete style-btn-delete" style="background:#fef2f2;color:#ef4444;width:32px;height:32px;border-radius:8px;border:none;cursor:pointer" title="Delete"><i class="fas fa-trash-alt"></i></button>
      </div>`,
      cellClick: (e, cell) => {
        const d = cell.getRow().getData();
        if (e.target.closest('.style-btn-edit')) {
          setEditingItem(d);
          setFormData({
            productId: d.productId?.toString() || '',
            stepNumber: d.stepNumber?.toString() || '1',
            title: d.title || '',
            description: d.description || '',
            imageUrl: d.imageUrl || ''
          });
          setShowForm(true);
        } else if (e.target.closest('.style-btn-delete')) {
          setDeleteTarget({ id: d.id, name: 'this care step' });
        }
      },
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imgData = new FormData();
    imgData.append('file', file);
    imgData.append('disk', 'public');
    
    toast?.info('Uploading image...');
    const res = await api.uploadMedia(imgData);
    if (res.error || res.success === false) {
      toast?.error(res.error || 'Failed to upload image');
    } else {
      const uploaded = Array.isArray(res.data) ? res.data[0] : res.data;
      const path = uploaded?.filePath || uploaded?.file_path || uploaded?.path || uploaded?.fileName || '';
      
      const getFileUrl = (p) => {
        if (!p) return '';
        if (p.startsWith('http')) return p;
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const root = base.replace(/\/api$/, '');
        return `${root}/${p.replace(/^\//, '')}`;
      };

      setFormData(prev => ({ ...prev, imageUrl: getFileUrl(path) }));
      toast?.success('Image uploaded');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productId) { setFormErrors({ productId: 'Product is required' }); return; }

    setSubmitting(true);
    const payload = {
      ...formData,
      productId: parseInt(formData.productId),
      stepNumber: parseInt(formData.stepNumber) || 1,
      title: formData.title || `Step ${formData.stepNumber || 1}`,
      description: formData.description || '-'
    };

    try {
      if (editingItem) {
        await updateRecord('productCareSteps', editingItem.id, payload, api.updateProductCareStep);
      } else {
        await addRecord('productCareSteps', payload, api.createProductCareStep);
      }
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const success = await deleteRecord('productCareSteps', deleteTarget.id, api.deleteProductCareStep);
      if (success) {
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({ productId: '', stepNumber: '1', title: '', description: '', imageUrl: '' });
    setFormErrors({});
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <DataTable
        title="Watch Care Steps"
        subtitle="Manage dynamic instructions and photos for specific watches"
        data={steps}
        columns={columns}
        loading={loading.productCareSteps}
        minWidth={950}
        action={{
          label: 'Add Care Step',
          icon: 'fas fa-plus',
          onClick: () => setShowForm(true)
        }}
        exportFileName="watch_care_steps"
        emptyTitle="No care steps found"
      />

      <AdminModal 
        isOpen={showForm} 
        onClose={closeModal} 
        title={editingItem ? "Edit Care Step" : "Add Care Step"} 
        maxWidth={600}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
            <FormField 
                label="Product *" 
                name="productId" 
                type="select"
                value={formData.productId} 
                onChange={handleChange} 
                options={[
                  { value: '', label: 'Select a Product...' },
                  ...products.map(p => ({ value: p.id.toString(), label: p.name }))
                ]}
                required
                error={formErrors.productId}
            />

            <div className="grid grid-cols-1 gap-4">
                <FormField 
                    label="Step Number *" 
                    name="stepNumber" 
                    type="number"
                    value={formData.stepNumber} 
                    onChange={handleChange} 
                    required
                />
                <FormField 
                    label="Title" 
                    name="title" 
                    value={formData.title} 
                    onChange={handleChange} 
                />
                <FormField 
                    label="Description" 
                    name="description" 
                    type="textarea"
                    value={formData.description} 
                    onChange={handleChange} 
                />
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">Step Image</label>
              
              {formData.imageUrl ? (
                <div className="relative inline-block group">
                  <img src={formData.imageUrl} alt="Preview" className="w-full max-w-[200px] rounded-lg border border-slate-300 shadow-sm" />
                  <button 
                    type="button" 
                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                    className="absolute -top-2 -right-2 bg-rose-500 text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-rose-600"
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-white px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                    <i className="fas fa-upload mr-2"></i> Upload Image
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <span className="text-xs text-slate-400">or enter URL below</span>
                </div>
              )}
              
              {!formData.imageUrl && (
                <div className="mt-3">
                  <input 
                    type="text" 
                    name="imageUrl" 
                    value={formData.imageUrl || ''} 
                    onChange={handleChange} 
                    placeholder="https://..." 
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-6 border-t border-slate-100">
                <button type="button" className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold transition-colors" onClick={closeModal}>Cancel</button>
                <button type="submit" className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2" disabled={submitting}>
                    {submitting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>}
                    {editingItem ? 'Update Step' : 'Save Step'}
                </button>
            </div>
        </form>
      </AdminModal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Care Step?"
        message="Are you sure you want to delete this step? This action cannot be undone."
        confirmLabel="Confirm Deletion"
        loading={deleting}
        danger
      />
    </div>
  );
};

export default CareStepsManagement;
