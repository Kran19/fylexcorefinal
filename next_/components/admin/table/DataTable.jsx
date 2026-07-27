"use client";
import React, { useRef, useEffect, useState } from 'react';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import TableToolbar from './TableToolbar';
import PaginationFooter from './PaginationFooter';
import BulkActionBar from './BulkActionBar';
import EmptyState from './EmptyState';
import LoadingTable from './LoadingTable';

export default function DataTable({
  title,
  subtitle,
  data = [],
  columns = [],
  loading = false,
  action,
  minWidth = 950,
  pageSize: initialPageSize = 15,
  onBulkDelete,
  onBulkActivate,
  onBulkDeactivate,
  emptyTitle,
  emptyDescription,
  onResetFilters,
  exportFileName = 'data_export'
}) {
  const tableRef = useRef(null);
  const tabulatorRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [density, setDensity] = useState('default'); // 'compact', 'default', 'comfortable'
  const [selectedRows, setSelectedRows] = useState([]);

  // Filter data locally if local filtering is enabled
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      return Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        return val.toString().toLowerCase().includes(q);
      });
    });
  }, [data, searchQuery]);

  // Tabulator initialization
  useEffect(() => {
    if (!tableRef.current || loading) return;
    tabulatorRef.current?.destroy();

    const rowHeights = {
      compact: 42,
      default: 56,
      comfortable: 68
    };

    tabulatorRef.current = new Tabulator(tableRef.current, {
      data: filteredData,
      columns: columns,
      layout: 'fitColumns',
      responsiveLayout: false,
      pagination: 'local',
      paginationSize: pageSize,
      paginationElement: false, // Handled by PaginationFooter
      headerVisible: true,
      movableColumns: true,
      rowHeight: rowHeights[density] || 56,
      placeholder: 'No records found',
      selectable: true,
      rowSelectionChanged: (data, rows) => {
        setSelectedRows(rows.map(r => r.getData()));
      }
    });

    return () => {
      tabulatorRef.current?.destroy();
      tabulatorRef.current = null;
    };
  }, [filteredData, columns, loading, pageSize, density]);

  // Sync pagination page changes
  useEffect(() => {
    if (tabulatorRef.current) {
      tabulatorRef.current.setPage(currentPage).catch(() => {});
    }
  }, [currentPage]);

  // Handle Export CSV
  const handleExportCSV = () => {
    if (tabulatorRef.current) {
      tabulatorRef.current.download('csv', `${exportFileName}_${Date.now()}.csv`);
    }
  };

  // Handle Print Table
  const handlePrint = () => {
    if (tabulatorRef.current) {
      tabulatorRef.current.print(false, true);
    }
  };

  return (
    <div
      className="admin-card space-y-0"
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#ffffff',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0'
      }}
    >
      {/* Top Toolbar */}
      <TableToolbar
        title={title}
        subtitle={subtitle}
        totalRecords={filteredData.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        density={density}
        onDensityChange={setDensity}
        onExportCSV={handleExportCSV}
        onPrint={handlePrint}
        action={action}
      />

      {/* Main Content */}
      {loading ? (
        <LoadingTable rows={6} />
      ) : filteredData.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          onResetFilters={searchQuery ? () => setSearchQuery('') : onResetFilters}
          onCreateNew={action?.onClick}
          createLabel={action?.label}
        />
      ) : (
        <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div ref={tableRef} style={{ minWidth: `${minWidth}px`, width: '100%' }}></div>
        </div>
      )}

      {/* Footer Pagination */}
      {!loading && filteredData.length > 0 && (
        <PaginationFooter
          currentPage={currentPage}
          pageSize={pageSize}
          totalRecords={filteredData.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedRows.length}
        onClear={() => {
          if (tabulatorRef.current) tabulatorRef.current.deselectRow();
          setSelectedRows([]);
        }}
        onBulkDelete={onBulkDelete ? () => onBulkDelete(selectedRows) : undefined}
        onBulkActivate={onBulkActivate ? () => onBulkActivate(selectedRows) : undefined}
        onBulkDeactivate={onBulkDeactivate ? () => onBulkDeactivate(selectedRows) : undefined}
      />
    </div>
  );
}
