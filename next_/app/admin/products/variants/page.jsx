"use client";
import React, { useEffect, useRef, useState } from 'react';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import '../../css/datatable.css';
import '../../css/custom.css';
import * as api from '@/services/adminApi';
import { useAdminData } from '@/context/AdminDataContext';
import { useToast } from '@/context/ToastContext';
import AdminModal from '@/components/admin/AdminModal';
import PageHeader from '@/components/admin/ui/PageHeader';
import { FaFileExport, FaLayerGroup, FaMagic, FaSearch } from 'react-icons/fa';

const tableWrapStyle = {
  width: '100%',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
};

const AdminProductVariants = () => {
  const { updateRecord, deleteRecord } = useAdminData();
  const [variantsUrlData, setVariantsUrlData] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const tableRef = useRef(null);
  const [table, setTable] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  const [bulkConfig, setBulkConfig] = useState({
    priceAction: 'Set to', priceValue: '',
    stockAction: 'Set to', stockValue: ''
  });

  const actionsRef = useRef({ updateRecord, deleteRecord });
  useEffect(() => { actionsRef.current = { updateRecord, deleteRecord }; }, [updateRecord, deleteRecord]);

  const loadVariants = async () => {
    setLoading(true);
    const { data, success } = await api.getAllVariants(1, 100);
    if (success && data) {
      setVariantsUrlData(data.map(v => ({
        ...v,
        productName: v.product?.name || 'Unknown',
        color: v.variantAttributes?.find(a => a.attributeValue?.attribute?.name === 'Color')?.attributeValue?.value || '-',
        size: v.variantAttributes?.find(a => a.attributeValue?.attribute?.name === 'Size')?.attributeValue?.value || '-',
        strap: v.variantAttributes?.find(a => a.attributeValue?.attribute?.name === 'Strap')?.attributeValue?.value || '-',
        price: v.price || v.sellingPrice || 0,
        stock: v.qty || 0
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVariants();
  }, []);

  useEffect(() => {
    let t = null;
    if (tableRef.current && !table) {
      t = new Tabulator(tableRef.current, {
        data: variantsUrlData,
        layout: "fitDataFill",
        pagination: "local",
        paginationSize: 15,
        selectable: true,
        rowHeight: 56, // Modern comfortable row height
        columns: [
          { formatter: "rowSelection", titleFormatter: "rowSelection", hozAlign: "center", headerSort: false, width: 50 },
          { title: "SKU", field: "sku", width: 150, hozAlign: "left", headerFilter: "input" },
          { 
            title: "Product", field: "productName", minWidth: 200, widthGrow: 2, headerFilter: "input",
            formatter: (cell) => `<span style="font-weight:700; color: #1e293b;">${cell.getValue()}</span>`
          },
          { title: "Color", field: "color", width: 120, headerFilter: "input" },
          { title: "Strap", field: "strap", width: 120, headerFilter: "input" },
          { title: "Size", field: "size", width: 100 },
          {
            title: "Price", field: "price", width: 120,
            formatter: (cell) => `<span style="font-weight:700; color: #1e293b;">₹${Number(cell.getValue()).toLocaleString()}</span>`,
            editor: "number",
            cellEdited: async (cell) => {
              const res = await api.updateVariant(cell.getRow().getData().id, { price: cell.getValue() });
              if (res.success) toast.success('Price updated');
              else toast.error('Failed to update price');
            }
          },
          {
            title: "Stock", field: "stock", width: 100, hozAlign: "center",
            formatter: (cell) => {
              const v = cell.getValue();
              const bg = v > 0 ? '#d1fae5' : '#fee2e2';
              const color = v > 0 ? '#059669' : '#dc2626';
              return `<span style="background:${bg};color:${color};padding:4px 10px;border-radius:8px;font-size:12px;font-weight:700">${v}</span>`;
            },
            editor: "number",
            cellEdited: async (cell) => {
              const res = await api.updateVariant(cell.getRow().getData().id, { qty: cell.getValue() });
              if (res.success) toast.success('Stock updated');
              else toast.error('Failed to update stock');
            }
          }
        ],
      });
      t.on("tableBuilt", () => {
        setTable(t);
        setTimeout(() => t.redraw(true), 100);
      });
    }
    return () => {
      if (t) t.destroy();
    };
  }, []);

  useEffect(() => {
    if (table) {
      table.replaceData(variantsUrlData).catch(() => {});
    }
  }, [variantsUrlData, table]);

  const handleGenerate = async () => {
    // We would need actual productId and selections
    const productId = 1; // dummy for now, requires a select product UI
    const selections = [];
    const res = await api.generateVariants(productId, selections);
    if (res && res.success) {
      toast.success('Variants generated');
      loadVariants();
    } else {
      toast.error('Failed to generate variants');
    }
    setShowGenerateModal(false);
  };

  const handleApplyBulkEdit = async () => {
    if (!table) return;
    const selected = table.getSelectedData();
    if (selected.length === 0) return toast.error("Please select at least one variant to edit.");

    let successCount = 0;
    for (const v of selected) {
      let updates = {};
      if (bulkConfig.priceValue) {
        let pVal = parseFloat(bulkConfig.priceValue);
        let currentPrice = parseFloat(v.price) || 0;
        if (bulkConfig.priceAction === 'Set to') updates.price = pVal;
        else if (bulkConfig.priceAction === 'Increase by %') updates.price = currentPrice + (currentPrice * (pVal / 100));
        else if (bulkConfig.priceAction === 'Decrease by %') updates.price = currentPrice - (currentPrice * (pVal / 100));
      }
      if (bulkConfig.stockValue) {
        let sVal = parseInt(bulkConfig.stockValue);
        let currentStock = parseInt(v.stock) || 0;
        if (bulkConfig.stockAction === 'Set to') updates.qty = sVal;
        else if (bulkConfig.stockAction === 'Add') updates.qty = currentStock + sVal;
        else if (bulkConfig.stockAction === 'Subtract') updates.qty = Math.max(0, currentStock - sVal);
      }
      if (Object.keys(updates).length > 0) {
        const res = await api.updateVariant(v.id, updates);
        if (res.success) successCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully updated ${successCount} variants`);
      loadVariants();
    } else {
      toast.error('Failed to update variants');
    }

    table.deselectRow();
    setBulkConfig({ priceAction: 'Set to', priceValue: '', stockAction: 'Set to', stockValue: '' });
    setShowBulkEditModal(false);
  };

  const handleExportCSV = () => {
    if (table) table.download("csv", "variants_export.csv");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Variant Management"
        subtitle="Manage pricing, stock, and attributes for your product variants."
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-filter-dark" style={{ background: '#f1f5f9', color: '#475569', border: 'none' }} onClick={handleExportCSV}>
            <FaFileExport className="mr-2 inline" /> Export CSV
          </button>
          <button className="btn-filter-dark" style={{ background: '#f8fafc', color: '#3b82f6', border: '1px solid #bfdbfe' }} onClick={() => setShowBulkEditModal(true)}>
            <FaLayerGroup className="mr-2 inline" /> Bulk Edit
          </button>
          <button className="btn-filter-dark" style={{ background: '#000', color: '#fff', border: 'none' }} onClick={() => setShowGenerateModal(true)}>
            <FaMagic className="mr-2 inline" /> Auto-Generate
          </button>
        </div>
      </PageHeader>

      <div className="admin-card" style={{ borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <div className="admin-search" style={{ flex: '1 1 240px', minWidth: 0, background: '#f8fafc', borderRadius: 10 }}>
            <FaSearch style={{ color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search variants by SKU, Product..." 
              onChange={(e) => {
                if (table) table.setFilter("sku", "like", e.target.value);
              }} 
              style={{ background: 'transparent' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select 
              style={{ padding: '10px 16px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', color: '#475569', fontWeight: 600, background: '#fff' }}
              onChange={(e) => {
                if (table) {
                  if (e.target.value === 'instock') table.setFilter("stock", ">", 0);
                  else if (e.target.value === 'outofstock') table.setFilter("stock", "<=", 0);
                  else table.removeFilter("stock", ">", 0);
                }
              }}
            >
              <option value="">All Stock Status</option>
              <option value="instock">In Stock</option>
              <option value="outofstock">Out of Stock</option>
            </select>
          </div>
        </div>

        <div style={{ padding: '0 8px 8px 8px' }}>
          <div style={tableWrapStyle}>
            <div ref={tableRef} style={{ borderRadius: '0 0 8px 8px', overflow: 'hidden', minWidth: 850 }}></div>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: '16px 16px 8px', fontWeight: 500 }}>
            <i className="fas fa-lightbulb mr-1" style={{ color: '#f59e0b' }}></i> Tip: You can double-click on Price or Stock cells to edit them directly.
          </p>
        </div>
      </div>

      {/* Generate Combinations Modal */}
      <AdminModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Auto-Generate Variants"
        maxWidth={600}
      >
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
          Select attributes to automatically generate all possible SKUs and variant combinations for a product.
        </p>
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>Select Product</label>
          <select style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', fontSize: 14 }}>
            <option>Luxury Watch Alpha</option>
            <option>Classic Gold Edition</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12, display: 'block' }}>Colors</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#475569' }}><input type="checkbox" style={{ marginRight: 10, width: 16, height: 16, cursor: 'pointer' }} /> Black</label>
              <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#475569' }}><input type="checkbox" style={{ marginRight: 10, width: 16, height: 16, cursor: 'pointer' }} /> Silver</label>
              <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#475569' }}><input type="checkbox" style={{ marginRight: 10, width: 16, height: 16, cursor: 'pointer' }} /> Gold</label>
            </div>
          </div>
          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12, display: 'block' }}>Straps</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#475569' }}><input type="checkbox" style={{ marginRight: 10, width: 16, height: 16, cursor: 'pointer' }} /> Leather</label>
              <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#475569' }}><input type="checkbox" style={{ marginRight: 10, width: 16, height: 16, cursor: 'pointer' }} /> Metal</label>
              <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#475569' }}><input type="checkbox" style={{ marginRight: 10, width: 16, height: 16, cursor: 'pointer' }} /> Silicone</label>
            </div>
          </div>
          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12, display: 'block' }}>Sizes</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#475569' }}><input type="checkbox" style={{ marginRight: 10, width: 16, height: 16, cursor: 'pointer' }} /> 40mm</label>
              <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#475569' }}><input type="checkbox" style={{ marginRight: 10, width: 16, height: 16, cursor: 'pointer' }} /> 42mm</label>
              <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#475569' }}><input type="checkbox" style={{ marginRight: 10, width: 16, height: 16, cursor: 'pointer' }} /> 44mm</label>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
          <button className="btn-filter-dark" style={{ background: '#f1f5f9', color: '#475569', border: 'none' }} onClick={() => setShowGenerateModal(false)}>Cancel</button>
          <button className="btn-filter-dark" style={{ background: '#000', color: '#fff', border: 'none' }} onClick={handleGenerate}>Generate Combinations</button>
        </div>
      </AdminModal>

      {/* Bulk Edit Modal */}
      <AdminModal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        title="Bulk Edit Selected Variants"
        maxWidth={500}
      >
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
          Apply rapid changes to the selected variants in the datatable below.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10, display: 'block' }}>Update Price For Selected</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <select style={{ width: 160, flexShrink: 0, padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', fontSize: 14 }} value={bulkConfig.priceAction} onChange={e => setBulkConfig({ ...bulkConfig, priceAction: e.target.value })}>
                <option>Set to</option>
                <option>Increase by %</option>
                <option>Decrease by %</option>
              </select>
              <input type="number" style={{ flex: 1, padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', fontSize: 14 }} placeholder="Value" value={bulkConfig.priceValue} onChange={e => setBulkConfig({ ...bulkConfig, priceValue: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10, display: 'block' }}>Update Stock For Selected</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <select style={{ width: 160, flexShrink: 0, padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', fontSize: 14 }} value={bulkConfig.stockAction} onChange={e => setBulkConfig({ ...bulkConfig, stockAction: e.target.value })}>
                <option>Set to</option>
                <option>Add</option>
                <option>Subtract</option>
              </select>
              <input type="number" style={{ flex: 1, padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', fontSize: 14 }} placeholder="Value" value={bulkConfig.stockValue} onChange={e => setBulkConfig({ ...bulkConfig, stockValue: e.target.value })} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
          <button className="btn-filter-dark" style={{ background: '#f1f5f9', color: '#475569', border: 'none' }} onClick={() => setShowBulkEditModal(false)}>Cancel</button>
          <button className="btn-filter-dark" style={{ background: '#3b82f6', color: '#fff', border: 'none' }} onClick={handleApplyBulkEdit}>Apply Bulk Edit</button>
        </div>
      </AdminModal>
    </div>
  );
};

export default AdminProductVariants;
