"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

const CategoriesPage = () => {
  const router = useRouter();
  const toast = useToast();
  const { data, loading, errors, refetch, addRecord, updateRecord, deleteRecord } = useAdminData();
  const categories = data.categories || [];

  const tableRef = useRef(null);
  const tabulatorRef = useRef(null);
  const actionsRef = useRef({});

  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);



  const columns = [
    {
      title: 'ID', field: 'id', width: 80, hozAlign: 'center', headerSort: true,
      formatter: (cell) => `<span style="font-weight:600;color:#94a3b8;font-size:12px">#${cell.getValue()}</span>`,
    },
    {
      title: 'CATEGORY INFO', field: 'name', minWidth: 300,
      formatter: (cell) => {
        const d = cell.getRow().getData();
        const img = d.image || d.image_url;
        return `
          <div style="display:flex;align-items:center;gap:14px;padding:8px 0">
            <div style="width:44px;height:44px;background:#f8fafc;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid #e2e8f0;flex-shrink:0;box-shadow:0 2px 4px rgba(0,0,0,0.02)">
              ${img ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover" />` : `<i class="fas fa-folder" style="color:#6366f1;font-size:18px;opacity:0.8"></i>`}
            </div>
            <div style="min-width:0">
              <div style="font-weight:800;color:#1e293b;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-0.01em">${d.name}</div>
              <div style="font-size:11px;color:#6366f1;font-weight:700;margin-top:2px;text-transform:lowercase;font-family:'SF Mono',monospace">/${d.slug}</div>
            </div>
          </div>
        `;
      },
    },
    {
      title: 'PARENT', field: 'parent.name', width: 160,
      formatter: (cell) => {
        const val = cell.getValue();
        return val 
          ? `<span style="font-size:11px;font-weight:700;color:#475569;background:#f1f5f9;padding:4px 10px;border-radius:6px;display:inline-block">${val}</span>`
          : `<span style="font-size:11px;color:#cbd5e1;font-style:italic">None (Root)</span>`;
      }
    },
    {
      title: 'PRODUCTS', field: 'productCount', width: 120, hozAlign: 'center',
      formatter: (cell) => {
        const count = cell.getValue() ?? cell.getRow().getData()._count?.products ?? 0;
        return `<span style="font-size:12px;font-weight:800;color:#6366f1;background:#f5f3ff;border:1px solid #e0e7ff;padding:4px 12px;border-radius:20px;display:inline-block">${count} items</span>`;
      }
    },
    {
      title: 'STATUS', field: 'isActive', width: 120, hozAlign: 'center',
      formatter: (cell) => {
        const active = cell.getValue() === true || cell.getValue() === 1 || cell.getRow().getData().status === 'active';
        return `<span class="px-3 py-1 rounded-full text-xs font-bold ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">${active ? 'Active' : 'Inactive'}</span>`;
      }
    },
    {
      title: 'ACTIONS', headerSort: false, hozAlign: 'right', width: 110,
      formatter: () => `<div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
        <button class="btn-icon style-btn-edit" style="background:#f1f5f9;color:#6366f1;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;border:none;cursor:pointer;" title="Edit Category"><i class="fas fa-edit"></i></button>
        <button class="btn-icon-delete style-btn-delete" style="background:#fef2f2;color:#ef4444;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;border:none;cursor:pointer;" title="Delete Category"><i class="fas fa-trash-alt"></i></button>
      </div>`,
      cellClick: (e, cell) => {
        const d = cell.getRow().getData();
        if (e.target.closest('.btn-icon')) {
          router.push(`/admin/categories/edit/${d.id}`);
        }
        if (e.target.closest('.btn-icon-delete')) {
          setDeleteTarget({ id: d.id, name: d.name });
        }
      },
    },
  ];

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      router.push('/admin/categories/create');
    }
  }, [searchParams, router]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const success = await deleteRecord('categories', deleteTarget.id, api.deleteCategory);
    setDeleting(false);
    if (success) setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <DataTable
        title="Categories"
        subtitle="Manage product hierarchy and organization"
        data={categories}
        columns={columns}
        loading={loading.categories}
        minWidth={950}
        action={{
          label: 'Add Category',
          icon: 'fas fa-plus',
          onClick: () => router.push('/admin/categories/create')
        }}
        exportFileName="categories_hierarchy"
        emptyTitle="No categories found"
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`This will permanently delete the category "${deleteTarget?.name}". All associated sub-categories will be unlinked. Continue?`}
        confirmLabel="Confirm Delete"
        loading={deleting}
        danger
      />
    </div>
  );
};

export default CategoriesPage;
