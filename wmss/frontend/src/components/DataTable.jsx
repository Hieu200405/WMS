import { useMemo, useState, useEffect } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, Rows, LayoutGrid } from 'lucide-react';
import { Input } from './forms/Input.jsx';
import { useTranslation } from 'react-i18next';
import { Skeleton } from './Skeleton.jsx'

export function DataTable({
  title,
  columns = [],
  data = [],
  pageSize = 10,
  searchable = true,
  searchableFields,
  onRowClick,
  actions,
  emptyMessage = 'No data',
  loading = false,
  enableSelection = false,
  onSelectionChange,
  renderBulkActions,
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [sortState, setSortState] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const [density, setDensity] = useState('normal');
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    if (!enableSelection) return;
    const validIds = new Set(data.map((row) => row.id).filter(Boolean));
    const nextSelected = new Set(Array.from(selected).filter((id) => validIds.has(id)));
    if (nextSelected.size !== selected.size) {
      setSelected(nextSelected);
      onSelectionChange?.(Array.from(nextSelected));
    }
  }, [data, enableSelection, onSelectionChange, selected]);

  // Filter Logic
  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return data;
    const lowered = search.trim().toLowerCase();
    const keys =
      searchableFields ??
      columns
        .filter((col) => typeof col.key === 'string')
        .map((col) => col.key);

    return data.filter((row) =>
      keys.some((key) => {
        const value = row[key];
        if (value == null) return false;
        return value.toString().toLowerCase().includes(lowered);
      }),
    );
  }, [columns, data, search, searchable, searchableFields]);

  // Sort Logic
  const sorted = useMemo(() => {
    if (!sortState.key) return filtered;
    return [...filtered].sort((a, b) => {
      const valueA = a[sortState.key];
      const valueB = b[sortState.key];
      if (valueA == null) return 1;
      if (valueB == null) return -1;
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortState.direction === 'asc' ? valueA - valueB : valueB - valueA;
      }
      return sortState.direction === 'asc'
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });
  }, [filtered, sortState]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);

  // Selection Logic Helpers
  const allPageIds = useMemo(() => pageItems.map(r => r.id).filter(Boolean), [pageItems]);
  const allPageSelected = allPageIds.length > 0 && allPageIds.every(id => selected.has(id));
  const isIndeterminate = !allPageSelected && allPageIds.some(id => selected.has(id));

  const handleSelectAll = (e) => {
    const isChecked = e.target.checked;
    const newSelected = new Set(selected);

    allPageIds.forEach(id => {
      if (isChecked) newSelected.add(id);
      else newSelected.delete(id);
    });

    setSelected(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const handleSelectRow = (id, isChecked) => {
    if (!id) return;
    const newSelected = new Set(selected);
    if (isChecked) newSelected.add(id);
    else newSelected.delete(id);
    setSelected(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  // Construct Columns with Checkbox if enabled
  const displayColumns = useMemo(() => {
    if (!enableSelection) return columns;
    const checkboxCol = {
      key: '__selection__',
      sortable: false,
      header: (
        <div className="flex items-center">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700"
            checked={allPageSelected}
            ref={input => { if (input) input.indeterminate = isIndeterminate; }}
            onChange={handleSelectAll}
          />
        </div>
      ),
      render: (_, row) => (
        <div onClick={e => e.stopPropagation()} className="flex items-center">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-700"
            checked={selected.has(row.id)}
            onChange={(e) => handleSelectRow(row.id, e.target.checked)}
          />
        </div>
      )
    };
    return [checkboxCol, ...columns];
  }, [columns, enableSelection, allPageSelected, isIndeterminate, selected, allPageIds]); // allPageIds dep ensures new page updates header

  const toggleSort = (key) => {
    setPage(1);
    setSortState((current) => {
      if (current.key !== key) {
        return { key, direction: 'asc' };
      }
      return {
        key,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      };
    });
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {title ? (
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
          ) : null}
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
              {sorted.length} {t('app.records') || 'Bản ghi'}
            </p>
            {selected.size > 0 && (
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
                • {selected.size} Selected
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Bulk Actions Area */}
          {selected.size > 0 && renderBulkActions ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 mr-2">
              {renderBulkActions(Array.from(selected))}
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
            </div>
          ) : null}

          {searchable ? (
            <div className="w-full sm:w-72">
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="!rounded-2xl !bg-slate-100/50 dark:!bg-slate-900/50"
                placeholder={t('app.search') || "Tìm kiếm..."}
              />
            </div>
          ) : null}
          {actions}
          <button
            onClick={() => setDensity(d => d === 'normal' ? 'compact' : 'normal')}
            className="btn btn-secondary !px-2.5 !py-2.5"
            title="Toggle Density"
          >
            {density === 'normal' ? <LayoutGrid className="h-4 w-4" /> : <Rows className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden ring-1 ring-slate-200/50 dark:ring-slate-800/50">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-100/30 dark:bg-slate-800/20">
                {displayColumns.map((column, idx) => {
                  const isSortable = column.sortable !== false;
                  const isActive = sortState.key === column.key;
                  return (
                    <th
                      key={column.key ?? column.header}
                      className={clsx(
                        density === 'normal' ? "px-6 py-4" : "px-4 py-2",
                        "text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-200/50 dark:border-slate-800/50",
                        idx === 0 && (density === 'normal' ? "pl-8" : "pl-6")
                      )}
                    >
                      {/* Checkbox Header is special, usually no sort. If it's a string header, render button. If react element, render as is */}
                      {typeof column.header === 'string' ? (
                        <button
                          type="button"
                          className={clsx(
                            'flex items-center gap-1 group transition-colors',
                            isSortable ? 'cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400' : 'cursor-default',
                          )}
                          onClick={() => (isSortable && column.key ? toggleSort(column.key) : undefined)}
                        >
                          <span>{column.header}</span>
                          {isSortable && column.key ? (
                            <div className={clsx(
                              "transition-opacity",
                              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                            )}>
                              {isActive && sortState.direction === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                            </div>
                          ) : null}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {displayColumns.map((col, idx) => (
                      <td key={idx} className={density === 'normal' ? "px-6 py-4" : "px-4 py-2"}>
                        <Skeleton className="h-6 w-full rounded-lg" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={displayColumns.length}
                    className="px-6 py-20 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 opacity-50">
                      <p className="text-sm font-bold text-slate-400">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : null}
              {pageItems.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  className={clsx(
                    'group transition-all duration-200',
                    onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20',
                    selected.has(row.id) && "bg-indigo-50/50 dark:bg-indigo-900/20"
                  )}
                  onClick={() => (onRowClick ? onRowClick(row) : undefined)}
                >
                  {displayColumns.map((column, colIdx) => (
                    <td
                      key={column.key ?? column.header}
                      className={clsx(
                        density === 'normal' ? "px-6 py-4" : "px-4 py-2",
                        "text-sm font-medium text-slate-600 dark:text-slate-300",
                        colIdx === 0 && (density === 'normal' ? "pl-8" : "pl-6")
                      )}
                    >
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {t('app.page') || 'Trang'} {currentPage} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="btn btn-secondary !px-4 !py-2 !text-xs disabled:hidden"
              disabled={currentPage === 1}
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="btn btn-primary !px-4 !py-2 !text-xs disabled:hidden"
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
