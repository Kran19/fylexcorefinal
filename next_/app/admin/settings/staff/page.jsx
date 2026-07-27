"use client";
import React, { useState, useRef, useEffect } from 'react';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import '@/app/admin/css/datatable.css';
import '@/app/admin/css/custom.css';
import { useAdminData } from '@/context/AdminDataContext';
import AdminModal from '@/components/admin/AdminModal';
import Swal from 'sweetalert2';

import DataTable from '@/components/admin/table/DataTable';

const AdminUsers = () => {
  const { data, addRecord, deleteRecord } = useAdminData();
  const staff = data.staff || [];
  const tableRef = useRef(null);
  const [table, setTable] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Manager' });
  const handleSave = () => {
    if (!form.name) return;
    addRecord('staff', { ...form, status: 'active', last_login: 'Never' });
    setForm({ name: '', email: '', role: 'Manager' });
    setShowModal(false);
  };

  const columns = [
    {
      title: "STAFF MEMBER", field: "name", width: 320,
      formatter: (cell) => {
        const d = cell.getRow().getData();
        const letter = d.name.charAt(0);
        return `
          <div style="display:flex;align-items:center;gap:14px;padding:4px 0">
            <div style="width:40px;height:40px;border-radius:12px;background:#e0e7ff;color:#4338ca;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:16px">${letter}</div>
            <div>
              <div style="font-weight:700;color:#1e293b;font-size:14px">${d.name}</div>
              <div style="font-size:12px;color:#64748b">${d.email}</div>
            </div>
          </div>`;
      }
    },
    { title: "ROLE", field: "role", width: 180, formatter: cell => `<span class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-xs">${cell.getValue()}</span>` },
    { title: "STATUS", field: "status", width: 140, formatter: cell => `<span class="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full font-bold text-xs">Active</span>` },
    {
      title: "ACTIONS", width: 100, headerSort: false, hozAlign: "right",
      formatter: () => `<button class="btn-icon-delete style-btn-delete" style="background:#fef2f2;color:#ef4444;width:32px;height:32px;border-radius:8px;border:none;cursor:pointer"><i class="fas fa-trash-alt"></i></button>`,
      cellClick: async (e, cell) => {
        const result = await Swal.fire({
          title: 'Remove staff member?',
          text: 'Are you sure you want to remove this staff member?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Yes, remove'
        });
        if (result.isConfirmed) deleteRecord('staff', cell.getRow().getData().id);
      }
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <DataTable
        title="Staff Management"
        subtitle="Manage admin users, team roles, and internal system permissions"
        data={staff}
        columns={columns}
        minWidth={950}
        action={{
          label: 'Add Staff',
          icon: 'fas fa-user-plus',
          onClick: () => setShowModal(true)
        }}
        exportFileName="staff_members"
        emptyTitle="No staff members found"
      />

      {/* Add Staff Member Modal */}
      <AdminModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Staff Member"
        maxWidth={420}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Discard</button>
            <button className="btn-indigo-gradient" onClick={handleSave}><i className="fas fa-user-plus mr-2" style={{ fontSize: 12 }}></i>Add User</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group"><label>Full Name</label><input type="text" className="form-control" placeholder="e.g. Jane Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="form-group"><label>Email Address</label><input type="email" className="form-control" placeholder="admin@domain.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div className="form-group">
            <label>Role / Permissions</label>
            <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="Super Admin">Super Admin</option>
              <option value="Manager">Manager (Can edit products, process orders)</option>
              <option value="Support">Support (Can view orders, moderate reviews)</option>
            </select>
          </div>
          <div className="form-group"><label>Temporary Password</label><input type="password" className="form-control" placeholder="••••••••" /></div>
        </div>
      </AdminModal>
    </div>
  );
};

export default AdminUsers;
