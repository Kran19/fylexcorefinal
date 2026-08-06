"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import '@/app/admin/css/datatable.css';
import '@/app/admin/css/custom.css';
import { useAdminData } from '@/context/AdminDataContext';
import * as api from '@/services/adminApi';
import PageHeader from '@/components/admin/ui/PageHeader';
import Loader from '@/components/admin/ui/Loader';
import ErrorBanner from '@/components/admin/ui/ErrorBanner';
import ConfirmModal from '@/components/admin/ui/ConfirmModal';
import { useToast } from '@/context/ToastContext';
import DataTable from '@/components/admin/table/DataTable';

const AdminProducts = () => {
  const toast = useToast();
  const { data, loading, errors, refetch, deleteRecord } = useAdminData();
  const products = data.products || [];
  const categories = data.categories || [];

  const tableRef = useRef(null);
  const tabulatorRef = useRef(null);
  const actionsRef = useRef({});

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const router = useRouter();

  const getDisplayData = (product) => {
    if (!product) return { name: 'Unknown', price: 0, formattedPrice: '₹0.00', image: '', isConfigurable: false };
    const isConfigurable = product.productType === 'configurable';
    let img = product.images?.[0]?.url || product.primaryImage || product.image || product.thumbnailUrl || '';
    let price = product.price || product.basePrice || 0;
    if (isConfigurable && product.variants?.length > 0) {
      const activeVariants = product.variants.filter(v => v.status === 'active' || v.isActive !== false);
      if (activeVariants.length > 0) {
        const prices = activeVariants.map(v => Number(v.price || 0)).filter(p => p > 0);
        if (prices.length > 0) price = Math.min(...prices);
        if (!img && activeVariants[0]?.image) img = activeVariants[0].image;
      }
    }
    const formattedPrice = typeof price === 'number' ? `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : (price ? `₹${price}` : '₹0.00');
    return {
      name: product.name || 'Untitled Product',
      price,
      formattedPrice,
      image: img,
      isConfigurable
    };
  };

  const columns = [
    {
      rowHandle: true, formatter: 'handle', headerSort: false, frozen: true, width: 40,
    },
    {
      title: 'ID', field: 'id', width: 70, hozAlign: 'center', headerSort: true,
      formatter: (cell) => `<span style="font-weight:700;color:#94a3b8">#${cell.getValue()}</span>`,
    },
    {
      title: 'TYPE', field: 'productType', width: 110,
      formatter: (cell) => {
        const val = cell.getValue() || 'simple';
        const isConfig = val === 'configurable';
        return `<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:${isConfig ? '#8b5cf6' : '#64748b'};background:${isConfig ? '#f5f3ff' : '#f1f5f9'};padding:4px 8px;border-radius:6px;display:inline-block">${val}</div>`;
      }
    },
    {
      title: 'PRODUCT INFO', field: 'name', minWidth: 240, widthGrow: 2,
      formatter: (cell) => {
        const d = cell.getRow().getData();
        const display = getDisplayData(d);
        const cat = d.mainCategory?.name || d.category?.name || 'Uncategorized';
        return `
          <div style="display:flex;align-items:center;gap:16px;padding:4px 0;cursor:pointer">
            <div style="width:40px;height:40px;background:#f8fafc;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #e2e8f0">
              ${display.image ? `<img src="${display.image}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='block'" />` : ''}
              <i class="fas fa-box" style="color:#cbd5e1;font-size:16px;${display.image ? 'display:none' : 'display:block'}"></i>
            </div>
            <div style="min-width:0">
              <div style="font-weight:800;color:#1e293b;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${display.name}</div>
              <div style="font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.04em;margin-top:2px">${cat}</div>
            </div>
          </div>`;
      }
    },
    {
      title: 'SKU', field: 'sku', width: 140, resizable: true,
      formatter: (cell) => {
        const val = cell.getValue() || cell.getRow().getData().productCode || 'N/A';
        return `<div style="font-family:monospace;font-size:11px;font-weight:700;color:#475569;background:#f8fafc;padding:4px 8px;border-radius:6px;border:1px solid #e2e8f0;display:inline-block;letter-spacing:0.04em">${val}</div>`;
      }
    },
    {
      title: 'PRICE / STOCK', field: 'price', width: 150,
      formatter: (cell) => {
        const d = cell.getRow().getData();
        const display = getDisplayData(d);
        const stock = d.qty ?? d.stock ?? 0;
        const lowStock = stock <= 5;
        return `
          <div>
            <div style="font-weight:800;color:#1e293b;font-size:13px">${display.isConfigurable ? 'From ' : ''}${display.formattedPrice}</div>
            <div style="font-size:11px;font-weight:700;color:${lowStock ? '#ef4444' : '#64748b'};margin-top:2px">
              <i class="fas fa-cubes" style="margin-right:4px;opacity:0.6"></i>${stock} in stock
            </div>
          </div>`;
      },
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
        <button class="btn-icon style-btn-edit" style="background:#f1f5f9;color:#6366f1;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;border:none;cursor:pointer;" title="Edit Product"><i class="fas fa-edit"></i></button>
        <button class="btn-icon-delete style-btn-delete" style="background:#fef2f2;color:#ef4444;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;border:none;cursor:pointer;" title="Delete Product"><i class="fas fa-trash-alt"></i></button>
      </div>`,
      cellClick: (e, cell) => {
        const d = cell.getRow().getData();
        if (e.target.closest('.style-btn-edit')) {
          router.push(`/admin/products/edit/${d.id}`);
        } else if (e.target.closest('.style-btn-delete')) {
          setDeleteTarget({ id: d.id, name: d.name });
        }
      },
    },
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const success = await deleteRecord('products', deleteTarget.id, api.deleteProduct);
    setDeleting(false);
    if (success) setDeleteTarget(null);
  };

  const handleRowMoved = async (newRowSequence) => {
    try {
      const orderedIds = newRowSequence.map(item => item.id).filter(Boolean);
      const res = await api.reorderProducts(orderedIds);
      if (res.error || res.success === false) {
        toast.error(res.error || res.message || 'Failed to reorder models');
      } else {
        setProducts(newRowSequence);
        toast.success('Model sequence updated successfully');
      }
    } catch (err) {
      toast.error('Failed to update sequence');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <DataTable
        title="Products"
        subtitle="Full Catalog & Inventory Management"
        data={products}
        columns={columns}
        loading={loading.products}
        minWidth={1000}
        onRowMoved={handleRowMoved}
        action={{
          label: 'Add Product',
          icon: 'fas fa-plus',
          onClick: () => router.push('/admin/products/create')
        }}
        exportFileName="products_catalog"
        emptyTitle="No products found"
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Warning: You are about to remove "${deleteTarget?.name}" from your catalog. This cannot be undone. History of orders will be preserved.`}
        confirmLabel="Destroy Product"
        loading={deleting}
        danger
      />
    </div>
  );
};

export default AdminProducts;
