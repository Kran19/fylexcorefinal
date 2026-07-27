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
import { getDisplayData } from '@/lib/utils';
import { FaSearch } from 'react-icons/fa';

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

  useEffect(() => {
    if (!tableRef.current || loading.products) return;
    tabulatorRef.current?.destroy();

    actionsRef.current = {
      onDelete: (id, name) => setDeleteTarget({ id, name }),
      onToggleStatus: async (cell) => {
        const d = cell.getRow().getData();
        const currentStatus = d.isActive === true || d.isActive === 1 || d.status === 'active';
        const newStatus = !currentStatus;
        
        // Optimistic UI update
        cell.setValue(newStatus);
        
        const res = await api.updateProduct(d.id, { isActive: newStatus });
        if (res.success) {
            toast.success(`Product marked as ${newStatus ? 'active' : 'inactive'}`);
            refetch.products?.(); 
        } else {
            cell.setValue(currentStatus);
            toast.error(res.error || 'Failed to update status');
        }
      }
    };

    tabulatorRef.current = new Tabulator(tableRef.current, {
      data: products,
      layout: 'fitColumns',
      responsiveLayout: 'collapse',
      pagination: 'local',
      paginationSize: 15,
      rowHeight: 60,
      movableRows: true,
      rowClick: (e, row) => {
        if (e.target.closest('.toggle-switch-container') || e.target.closest('.btn-icon') || e.target.closest('.btn-icon-delete')) {
          return;
        }
        const d = row.getData();
        if (d?.id) {
          router.push(`/admin/products/edit/${d.id}`);
        }
      },
      columns: [
        {
          rowHandle: true, formatter: 'handle', headerSort: false, frozen: true, width: 40,
        },
        {
          title: 'ID', field: 'id', width: 60, hozAlign: 'center', headerSort: true,
          formatter: (cell) => `<span style="font-weight:700;color:#94a3b8">#${cell.getValue()}</span>`,
        },
        {
          title: 'TYPE', field: 'productType', width: 100,
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
                <div style="width:48px;height:48px;background:#f8fafc;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #e2e8f0">
                  ${display.image ? `<img src="${display.image}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='block'" />` : ''}
                  <i class="fas fa-box" style="color:#cbd5e1;font-size:16px;${display.image ? 'display:none' : 'display:block'}"></i>
                </div>
                <div style="min-width:0">
                  <div style="font-weight:800;color:#1e293b;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${display.name}</div>
                  <div style="font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.04em;margin-top:2px">${cat}</div>
                </div>
              </div>`;
          },
          headerFilter: "input",
          headerFilterFunc: "like"
        },
        {
          title: 'SKU', field: 'sku', width: 130, resizable: true,
          formatter: (cell) => {
            const val = cell.getValue() || cell.getRow().getData().productCode || 'N/A';
            return `<div style="font-family:monospace;font-size:11px;font-weight:700;color:#475569;background:#f8fafc;padding:4px 8px;border-radius:6px;border:1px solid #e2e8f0;display:inline-block;letter-spacing:0.04em">${val}</div>`;
          }
        },
        {
          title: 'PRICE / STOCK', field: 'price', width: 140,
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
          title: 'STATUS', field: 'isActive', width: 100, hozAlign: 'center',
          formatter: (cell) => {
            const active = cell.getValue() === true || cell.getValue() === 1 || cell.getRow().getData().status === 'active';
            return `
              <label class="toggle-switch-container" style="display:flex;align-items:center;justify-content:center;cursor:pointer;height:100%;width:100%">
                <div style="width:36px;height:20px;background:${active ? '#10b981' : '#cbd5e1'};border-radius:10px;position:relative;transition:background 0.2s;">
                  <div style="width:16px;height:16px;background:white;border-radius:50%;position:absolute;top:2px;left:${active ? '18px' : '2px'};transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>
                </div>
              </label>
            `;
          },
          cellClick: (e, cell) => {
             if (e.target.closest('.toggle-switch-container')) {
                 e.preventDefault();
                 actionsRef.current.onToggleStatus(cell);
             }
          }
        },
        {
          title: 'ACTIONS', headerSort: false, hozAlign: 'right', width: 120,
          formatter: () => `<div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
            <button class="btn-icon" style="background:#f1f5f9;color:#6366f1;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer;" title="Edit Product"><i class="fas fa-edit"></i></button>
            <button class="btn-icon-delete" style="background:#fef2f2;color:#ef4444;padding:6px 12px;border-radius:8px;font-size:12px;display:inline-flex;align-items:center;border:none;cursor:pointer;" title="Delete Product"><i class="fas fa-trash-alt"></i></button>
          </div>`,
          cellClick: (e, cell) => {
            const d = cell.getRow().getData();
            if (e.target.closest('.btn-icon')) {
              e.stopPropagation();
              router.push(`/admin/products/edit/${d.id}`);
            }
            if (e.target.closest('.btn-icon-delete')) {
              e.stopPropagation();
              actionsRef.current.onDelete(d.id, d.name);
            }
          },
        },
      ],
    });

    return () => { tabulatorRef.current?.destroy(); tabulatorRef.current = null; };
  }, [products, loading.products, router, refetch, toast]);

  useEffect(() => {
    if (tabulatorRef.current && !loading.products) {
      if (searchTerm) {
        tabulatorRef.current.setFilter("name", "like", searchTerm);
      } else {
        tabulatorRef.current.removeFilter("name", "like", searchTerm);
      }
    }
  }, [searchTerm, loading.products]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const success = await deleteRecord('products', deleteTarget.id, api.deleteProduct);
    setDeleting(false);
    if (success) setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Products"
        subtitle="Full Catalog & Inventory Management"
        action={{ label: 'Add Product', icon: 'fas fa-plus', href: '/admin/products/create' }}
      />

      <div className="admin-card" style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="admin-search" style={{ flex: '1 1 240px', minWidth: 0, background: '#f8fafc', borderRadius: 10 }}>
            <FaSearch style={{ color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search products by name or SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{ background: 'transparent' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select 
              style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', color: '#475569', fontWeight: 600, background: '#fff' }}
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                if (tabulatorRef.current) {
                  if (e.target.value) {
                    tabulatorRef.current.setFilter(data => {
                       const catName = data.mainCategory?.name || data.category?.name;
                       return catName === e.target.value;
                    });
                  } else {
                    tabulatorRef.current.clearFilter();
                    if (searchTerm) tabulatorRef.current.setFilter("name", "like", searchTerm);
                  }
                }
              }}
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading.products ? <Loader message="Loading catalog..." /> :
          errors.products ? <ErrorBanner message={errors.products} onRetry={() => refetch.products()} /> :
            <div style={{ padding: '0 8px 8px 8px' }}>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 1000, borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                  <div ref={tableRef}></div>
                </div>
              </div>
            </div>
        }
      </div>

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
