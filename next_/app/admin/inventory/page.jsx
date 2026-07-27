"use client";
import React, { useEffect, useRef, useState } from 'react';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import '@/app/admin/css/datatable.css';
import '@/app/admin/css/custom.css';
import { useAdminData } from '@/context/AdminDataContext';
import AdminModal from '@/components/admin/AdminModal';
import DataTable from '@/components/admin/table/DataTable';
import { useToast } from '@/context/ToastContext';
import * as api from '@/services/adminApi';

const tableWrapStyle = {
  width: '100%',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
};

const InventoryList = () => {
  const { data, updateRecord, refetch } = useAdminData();
  const inventory = data.inventory || [];
  const toast = useToast();

  const tableRef = useRef(null);
  const [table, setTable] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const selectedItem = inventory.find(i => i.id === selectedItemId);

  const [adjustForm, setAdjustForm] = useState({ type: 'Add', qty: '', note: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalActionsRef = useRef({ setSelectedItemId, setShowAdjustModal });
  useEffect(() => { modalActionsRef.current = { setSelectedItemId, setShowAdjustModal }; }, []);

  const columns = [
    { 
      title: "PRODUCT", field: "product_name", width: 320,
      formatter: (cell) => {
        const d = cell.getRow().getData();
        const letter = d.product_name?.charAt(0) || 'P';
        return `
          <div style="display:flex;align-items:center;gap:14px;padding:4px 0">
            <div style="width:40px;height:40px;background:#f1f5f9;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#64748b;font-size:14px;flex-shrink:0;border:1px solid #e2e8f0">${letter}</div>
            <div style="display:flex;flex-direction:column;gap:2px">
              <div style="font-weight:700;color:#1e293b;font-size:14px">${d.product_name || d.name || 'Product'}</div>
              <div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.02em">SKU: ${d.sku || 'N/A'}</div>
            </div>
          </div>
        `;
      }
    },
    { 
      title: "STOCK", field: "stock", width: 100, hozAlign: "center",
      formatter: (cell) => `<span style="font-weight:700;color:#1e293b">${cell.getValue() ?? cell.getRow().getData().qty ?? 0}</span>`
    },
    { 
      title: "RESERVED", field: "reserved", width: 110, hozAlign: "center",
      formatter: (cell) => `<span style="font-weight:600;color:#94a3b8">${cell.getValue() || 0}</span>`
    },
    {
      title: "AVAILABLE", field: "available", width: 140, hozAlign: "center",
      formatter: (cell) => {
        const d = cell.getRow().getData();
        const v = cell.getValue() ?? d.stock ?? d.qty ?? 0;
        const bg = v > 0 ? '#f0fdf4' : '#fef2f2';
        const color = v > 0 ? '#15803d' : '#dc2626';
        return `<span class="status-pill" style="background:${bg};color:${color};border-radius:8px;padding:4px 12px;font-weight:700">${v} IN STOCK</span>`;
      }
    },
    { 
      title: "MIN STOCK", field: "min_stock", width: 110, hozAlign: "center",
      formatter: (cell) => `<span style="font-weight:600;color:#64748b;padding:2px 8px;background:#f8fafc;border-radius:4px">${cell.getValue() || 5}</span>`
    },
    { 
      title: "WAREHOUSE", field: "warehouse", width: 140,
      formatter: (cell) => `<span style="text-transform:uppercase;font-size:11px;font-weight:700;color:#64748b;letter-spacing:0.03em">${cell.getValue() || 'MAIN'}</span>`
    },
    {
      title: "ACTIONS", headerSort: false, hozAlign: "right", width: 140,
      formatter: () => `
        <div style="display:flex;gap:12px;justify-content:flex-end">
          <button class="btn-filter-dark style-btn-edit" style="padding:6px 12px;font-size:11px;height:auto;border-radius:6px;cursor:pointer;background:#1e293b;color:#fff">ADJUST</button>
        </div>
      `,
      cellClick: (e, cell) => {
        const d = cell.getRow().getData();
        setSelectedItemId(d.id);
        setShowAdjustModal(true);
      }
    }
  ];

  const handleApplyAdjustment = async () => {
    if (!selectedItem || !adjustForm.qty) return;
    setIsSubmitting(true);
    
    try {
      const payload = {
        qty: parseInt(adjustForm.qty),
        type: adjustForm.type,
        note: adjustForm.note || `Manual ${adjustForm.type} adjustment`
      };

      // updateRecord handles the optimistic update and refetch
      await updateRecord('inventory', selectedItem.id, payload, api.updateInventory);
      
      // Specifically refetch inventory to get updated history
      await refetch.inventory();

      setAdjustForm({ type: 'Add', qty: '', note: '' });
      setShowAdjustModal(false);
    } catch (err) {
      toast?.error?.('External API error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <DataTable
        title="Inventory Management"
        subtitle="Monitor stock levels and manage warehouse movements"
        data={inventoryList}
        columns={columns}
        loading={loading.products}
        minWidth={950}
        exportFileName="inventory_stock_report"
        emptyTitle="No inventory items found"
      />

      {/* Adjust Stock Modal */}
      <AdminModal
        isOpen={showAdjustModal && !!selectedItem}
        onClose={() => setShowAdjustModal(false)}
        title="Adjust Stock"
        maxWidth={800}
      >
        <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{selectedItem?.product_name}</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>SKU: <span style={{ fontWeight: 700 }}>{selectedItem?.sku}</span> • Current Stock: <span style={{ fontWeight: 700 }}>{selectedItem?.stock}</span></p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: '#0e1726', display: 'flex', alignItems: 'center' }}>
              <i className="fas fa-sliders-h mr-2 text-indigo-500"></i>Manual Adjustment
            </h4>
            <div className="form-group mb-5">
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, display: 'block' }}>Adjustment Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {['Add', 'Subtract', 'Set'].map(type => (
                  <button
                    key={type}
                    onClick={() => setAdjustForm({ ...adjustForm, type })}
                    style={{
                      padding: '10px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      border: '1px solid',
                      borderColor: adjustForm.type === type ? '#6366f1' : '#e2e8f0',
                      background: adjustForm.type === type ? '#f5f3ff' : '#fff',
                      color: adjustForm.type === type ? '#6366f1' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group mb-5">
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, display: 'block' }}>Quantity</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="Enter quantity..." 
                style={{ height: 48, borderRadius: 10 }}
                value={adjustForm.qty} 
                onChange={e => setAdjustForm({ ...adjustForm, qty: e.target.value })} 
              />
            </div>
            <div className="form-group mb-6">
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, display: 'block' }}>Note / Reason</label>
              <textarea 
                className="form-control" 
                rows="3" 
                placeholder="Why is this change being made?" 
                style={{ borderRadius: 10, padding: 12 }}
                value={adjustForm.note} 
                onChange={e => setAdjustForm({ ...adjustForm, note: e.target.value })} 
              />
            </div>
            <button 
              className="btn-indigo-gradient w-full" 
              style={{ height: 48, borderRadius: 10, fontSize: 14, fontWeight: 700 }}
              onClick={handleApplyAdjustment}
              disabled={isSubmitting || !adjustForm.qty}
            >
              {isSubmitting ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : null}
              Confirm Adjustment
            </button>
          </div>

          <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: 32 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: '#0e1726', display: 'flex', alignItems: 'center' }}>
              <i className="fas fa-history mr-2 text-indigo-500"></i>Recent Activity
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 380, overflowY: 'auto', paddingRight: 8 }}>
              {selectedItem?.history?.length > 0 ? (
                selectedItem.history.map((log, idx) => (
                  <div key={idx} style={{ padding: '12px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 800, 
                        padding: '2px 8px', 
                        borderRadius: 6,
                        background: log.changeType === 'Add' || log.changeType === 'Set' ? '#ecfdf5' : '#fef2f2',
                        color: log.changeType === 'Add' || log.changeType === 'Set' ? '#059669' : '#dc2626',
                        textTransform: 'uppercase'
                      }}>
                        {log.changeType} {log.quantity}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                        {log.createdAt ? `${new Date(log.createdAt).toLocaleDateString()} ${new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', fontWeight: 500, lineHeight: 1.4 }}>{log.notes || 'No notes provided'}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className="fas fa-user-circle" style={{ fontSize: 12 }}></i>
                      <span>By Admin ID: {log.adminId || 'System'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <i className="fas fa-clock-rotate-left mb-3" style={{ fontSize: 24, opacity: 0.5 }}></i>
                  <p style={{ fontSize: 13, margin: 0 }}>No activity log found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminModal>
    </div>
  );
};

export default InventoryList;
