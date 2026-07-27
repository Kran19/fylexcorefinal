"use client";
import React from 'react';

export default function PaginationFooter({
  currentPage = 1,
  pageSize = 15,
  totalRecords = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50, 100, 250]
}) {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const [jumpPage, setJumpPage] = React.useState('');

  const handleJump = (e) => {
    e.preventDefault();
    const p = parseInt(jumpPage);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
      setJumpPage('');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '16px 24px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        borderBottomLeftRadius: '16px',
        borderBottomRightRadius: '16px',
        flexWrap: 'wrap',
        gap: '16px',
        fontSize: '13px',
        color: '#64748b'
      }}
    >
      {/* Left Info & Page Size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <span>
          Showing <strong style={{ color: '#0f172a' }}>{startRecord.toLocaleString()}</strong>–
          <strong style={{ color: '#0f172a' }}>{endRecord.toLocaleString()}</strong> of{' '}
          <strong style={{ color: '#0f172a' }}>{totalRecords.toLocaleString()}</strong> records
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '12px',
              fontWeight: 700,
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Controls: Navigation & Jump */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            title="First Page"
            style={navBtnStyle(currentPage <= 1)}
          >
            <i className="fas fa-angle-double-left"></i>
          </button>

          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Previous Page"
            style={navBtnStyle(currentPage <= 1)}
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 12px',
              fontWeight: 700,
              fontSize: '13px',
              color: '#1e293b'
            }}
          >
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="Next Page"
            style={navBtnStyle(currentPage >= totalPages)}
          >
            <i className="fas fa-chevron-right"></i>
          </button>

          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            title="Last Page"
            style={navBtnStyle(currentPage >= totalPages)}
          >
            <i className="fas fa-angle-double-right"></i>
          </button>
        </div>

        {/* Jump To Page */}
        <form onSubmit={handleJump} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="number"
            min="1"
            max={totalPages}
            placeholder="Go to"
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            style={{
              width: '60px',
              padding: '6px 8px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '12px',
              textAlign: 'center'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            Go
          </button>
        </form>
      </div>
    </div>
  );
}

function navBtnStyle(disabled) {
  return {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: disabled ? '#f8fafc' : '#ffffff',
    color: disabled ? '#cbd5e1' : '#334155',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    transition: 'all 0.2s'
  };
}
