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
  emptyTitle = "No records found",
  emptyDescription = "There are no items to display right now.",
  onResetFilters,
  exportFileName = 'data_export',
  onRowMoved
}) {
  const tableRef = useRef(null);
  const tabulatorRef = useRef(null);
  const isBuiltRef = useRef(false);
  const onRowMovedRef = useRef(onRowMoved);
  useEffect(() => {
    onRowMovedRef.current = onRowMoved;
  }, [onRowMoved]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [density, setDensity] = useState('default');
  const [selectedRows, setSelectedRows] = useState([]);

  // Filter data locally if searchQuery is present
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

  const columnsRef = useRef(columns);
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // Tabulator initialization (Runs ONLY when loading transitions to false or on initial mount)
  useEffect(() => {
    if (!tableRef.current || loading) return;

    isBuiltRef.current = false;
    tabulatorRef.current?.destroy();

    const instance = new Tabulator(tableRef.current, {
      data: filteredData,
      columns: columnsRef.current,
      layout: 'fitColumns',
      responsiveLayout: false,
      pagination: 'local',
      paginationSize: pageSize,
      paginationElement: false, // Handled by custom PaginationFooter below
      headerVisible: true,
      movableColumns: true,
      movableRows: !!onRowMoved,
      placeholder: 'No records found',
      selectable: true
    });

    instance.on("rowSelectionChanged", (data, rows) => {
      setSelectedRows(rows.map(r => r.getData()));
    });

    instance.on("rowMoved", (row) => {
      if (onRowMovedRef.current && tabulatorRef.current) {
        const currentTableData = tabulatorRef.current.getData();
        onRowMovedRef.current(currentTableData);
      }
    });

    instance.on("tableBuilt", () => {
      isBuiltRef.current = true;
      if (tabulatorRef.current) {
        tabulatorRef.current.redraw(true);
      }
    });

    tabulatorRef.current = instance;

    return () => {
      isBuiltRef.current = false;
      instance.destroy();
      tabulatorRef.current = null;
    };
  }, [loading]);

  // Update Data dynamically without destroying table
  useEffect(() => {
    if (tabulatorRef.current && isBuiltRef.current && !loading) {
      try {
        tabulatorRef.current.replaceData(filteredData);
      } catch (err) {}
    }
  }, [filteredData, loading]);

  // Update Columns dynamically if needed without destroying table
  useEffect(() => {
    if (tabulatorRef.current && isBuiltRef.current && !loading) {
      try {
        tabulatorRef.current.setColumns(columns);
      } catch (err) {}
    }
  }, [columns, loading]);

  // Sync Page Size
  useEffect(() => {
    if (tabulatorRef.current && isBuiltRef.current) {
      try {
        tabulatorRef.current.setPageSize(pageSize);
      } catch (err) {}
    }
  }, [pageSize]);

  // Sync Current Page Navigation
  useEffect(() => {
    if (tabulatorRef.current && isBuiltRef.current) {
      try {
        tabulatorRef.current.setPage(currentPage);
      } catch (err) {}
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
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
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
