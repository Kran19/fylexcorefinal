"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import '@/app/admin/css/datatable.css';
import '@/app/admin/css/custom.css';
import { useAdminData } from '@/context/AdminDataContext';
import PageHeader from '@/components/admin/ui/PageHeader';
import Loader from '@/components/admin/ui/Loader';
import ErrorBanner from '@/components/admin/ui/ErrorBanner';
import DataTable from '@/components/admin/table/DataTable';
import { useToast } from '@/context/ToastContext';
import { deleteOrderApi } from '@/lib/api';
import { deleteOrder } from '@/services/adminApi';
import Swal from 'sweetalert2';

const OrdersPage = () => {
  const router = useRouter();
  const toast = useToast();
  const { data, loading, errors, refetch, deleteRecord } = useAdminData();
  const orders = data.orders || [];

  const tableRef = useRef(null);
  const tabulatorRef = useRef(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tableBuilt, setTableBuilt] = useState(false);



  const columns = [
    {
      title: 'ORDER #', field: 'orderNumber', width: 140,
      formatter: (cell) => {
        const v = cell.getValue() || cell.getRow().getData().id;
        return `<span style="font-family:'SF Mono',monospace;font-size:12px;font-weight:800;color:#6366f1;background:#f5f3ff;padding:5px 12px;border-radius:8px;border:1px solid rgba(99,102,241,0.15)">#${v}</span>`;
      },
    },
    {
      title: 'CUSTOMER', field: 'customer.name', width: 280,
      formatter: (cell) => {
        const d = cell.getRow().getData();
        const name = d.customer?.name || d.customerName || 'Guest User';
        const email = d.customer?.email || d.customerEmail || 'no-email@provided.com';
        const mobile = d.customer?.mobile || d.customerMobile || '';
        const letter = (name[0] || 'G').toUpperCase();
        return `<div style="display:flex;align-items:center;gap:12px;padding:6px 0">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#38bdf8,#0284c7);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:14px;flex-shrink:0">${letter}</div>
          <div style="min-width:0">
            <div style="font-weight:800;color:#1e293b;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
            <div style="font-size:11px;color:#64748b;font-weight:600">${mobile ? `<i class="fas fa-phone" style="margin-right:4px;opacity:0.6"></i>${mobile}` : email}</div>
          </div>
        </div>`;
      },
    },
    {
      title: 'ITEMS', field: 'itemsCount', width: 100, hozAlign: 'center',
      formatter: (cell) => {
        const d = cell.getRow().getData();
        const items = d.items || [];
        const totalUnits = items.reduce((acc, item) => acc + (item.quantity || item.qty || 1), 0);
        return `<div style="text-align:center"><span style="font-weight:700;color:#1e293b">${totalUnits}</span><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700">Units</div></div>`;
      },
    },
    {
      title: 'DATE', field: 'createdAt', width: 140,
      formatter: (cell) => {
        const val = cell.getValue();
        if (!val) return '—';
        const d = new Date(val);
        if (isNaN(d.getTime())) return 'Invalid Date';
        return `<div style="line-height:1.4"><div style="font-weight:700;color:#1e293b;font-size:13px">${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div style="font-size:11px;color:#94a3b8;font-weight:600">${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>`;
      },
    },
    {
      title: 'AMOUNT', field: 'grandTotal', width: 140,
      formatter: (cell) => {
        const val = cell.getValue() || cell.getRow().getData().amount || 0;
        return `<div style="font-weight:800;color:#1e293b;font-size:15px">₹${Math.round(Number(val)).toLocaleString('en-IN')}</div>`;
      },
    },
    {
      title: 'STATUS', field: 'status', width: 130, hozAlign: 'center',
      formatter: (cell) => {
        const v = (cell.getValue() || '').toLowerCase();
        const colors = {
          pending: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
          confirmed: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
          processing: { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
          shipped: { bg: '#ecfeff', text: '#155e75', border: '#a5f3fc' },
          delivered: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
          cancelled: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
          refunded: { bg: '#fafafa', text: '#171717', border: '#e5e5e5' },
        }[v] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
        return `<div style="display:inline-flex;padding:5px 12px;border-radius:10px;font-size:11px;font-weight:700;background:${colors.bg};color:${colors.text};border:1px solid ${colors.border};text-transform:uppercase;letter-spacing:0.02em">${v}</div>`;
      },
    },
    {
      title: 'PAYMENT', field: 'paymentStatus', width: 120, hozAlign: 'center',
      formatter: (cell) => {
        const v = (cell.getValue() || '').toLowerCase();
        const active = v === 'paid';
        const pending = v === 'pending';
        return `<div style="display:inline-flex;padding:5px 12px;border-radius:10px;font-size:11px;font-weight:700;background:${active ? '#f0fdf4' : pending ? '#fffbeb' : '#fef2f2'};color:${active ? '#166534' : pending ? '#92400e' : '#991b1b'};border:1px solid ${active ? '#bbf7d0' : pending ? '#fde68a' : '#fecaca'};text-transform:uppercase">${v}</div>`;
      },
    },
    {
      title: 'ACTIONS', headerSort: false, hozAlign: 'right', width: 100,
      formatter: () => `<div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn-icon style-btn-edit" style="background:#f5f3ff;color:#6366f1;width:32px;height:32px;border-radius:8px;border:none;cursor:pointer" title="View Details"><i class="fas fa-eye"></i></button>
        <button class="btn-icon-delete style-btn-delete" style="background:#fef2f2;color:#ef4444;width:32px;height:32px;border-radius:8px;border:none;cursor:pointer" title="Delete Order"><i class="fas fa-trash"></i></button>
      </div>`,
      cellClick: (e, cell) => {
        const d = cell.getRow().getData();
        if (e.target.closest('.style-btn-edit')) {
          router.push(`/admin/orders/${d.id}`);
        } else if (e.target.closest('.style-btn-delete')) {
          Swal.fire({
            title: 'Delete Order?',
            text: `Are you sure you want to delete order #${d.orderNumber || d.id}? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!'
          }).then((result) => {
            if (result.isConfirmed) {
              deleteRecord('orders', d.id, deleteOrder);
            }
          });
        }
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <DataTable
        title="Orders"
        subtitle="Track and process customer orders"
        data={orders}
        columns={columns}
        loading={loading.orders}
        minWidth={950}
        exportFileName="orders_list"
        emptyTitle="No orders found"
      />
    </div>
  );
};

export default OrdersPage;
