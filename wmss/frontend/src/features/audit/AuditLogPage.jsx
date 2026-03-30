import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, User, Calendar, Filter, X, FileSpreadsheet } from 'lucide-react';
import { apiClient } from '../../services/apiClient.js';
import { formatDateTime } from '../../utils/formatters.js';
import { DataTable } from '../../components/DataTable.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { FilterDrawer } from '../../components/FilterDrawer.jsx';
import { Input } from '../../components/forms/Input.jsx'; // Assuming this exists
import { Select } from '../../components/forms/Select.jsx'; // Assuming this exists

export function AuditLogPage() {
    const { t } = useTranslation();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Main filter state
    const [filter, setFilter] = useState({
        page: 1,
        limit: 20,
        entity: '',
        query: '',
        startDate: '',
        endDate: ''
    });
    const [total, setTotal] = useState(0);

    // Drawer state
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [tempFilter, setTempFilter] = useState({ entity: '', startDate: '', endDate: '' });

    // Export state
    const [exportOpen, setExportOpen] = useState(false);
    const [exportRange, setExportRange] = useState({ startDate: '', endDate: '' });

    const processExport = async () => {
        try {
            const params = {};
            if (exportRange.startDate) params.startDate = exportRange.startDate;
            if (exportRange.endDate) params.endDate = exportRange.endDate;
            if (filter.entity) params.entity = filter.entity;
            if (filter.query) params.query = filter.query;

            const blob = await apiClient('/audit/export', { responseType: 'blob', params });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Audit-Logs-${Date.now()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            setExportOpen(false);
        } catch (e) {
            console.error(e);
        }
    };

    // Sync temp state when drawer opens
    useEffect(() => {
        if (isFilterOpen) {
            setTempFilter({
                entity: filter.entity,
                startDate: filter.startDate || '',
                endDate: filter.endDate || ''
            });
        }
    }, [isFilterOpen, filter]);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                // Remove empty keys
                const params = Object.fromEntries(
                    Object.entries(filter).filter(([_, v]) => v != null && v !== '')
                );
                const res = await apiClient.get('/audit', { params });
                setLogs(res.data || []);
                setTotal(res.pagination?.total || 0);
            } catch (error) {
                console.error('Failed to fetch audit logs', error);
            } finally {
                setLoading(false);
            }
        };
        // Debounce query slightly
        const timeout = setTimeout(fetchLogs, 300);
        return () => clearTimeout(timeout);
    }, [filter]);

    const handleApplyFilters = () => {
        setFilter(prev => ({
            ...prev,
            ...tempFilter,
            page: 1
        }));
        setIsFilterOpen(false);
    };

    const handleResetFilters = () => {
        setTempFilter({ entity: '', startDate: '', endDate: '' });
        setFilter(prev => ({
            ...prev,
            entity: '',
            startDate: '',
            endDate: '',
            page: 1
        }));
        setIsFilterOpen(false);
    };

    // Entity Options
    const entityOptions = [
        { value: '', label: t('audit.filter.entity') },
        { value: 'Product', label: t('audit.entities.Product') },
        { value: 'Inventory', label: t('audit.entities.Inventory') },
        { value: 'Receipt', label: t('audit.entities.Receipt') },
        { value: 'Delivery', label: t('audit.entities.Delivery') },
        { value: 'Setting', label: t('audit.entities.Setting') },
        { value: 'User', label: t('audit.entities.User') },
    ];

    const activeFilterCount = [filter.entity, filter.startDate, filter.endDate].filter(Boolean).length;

    const formatAction = (action) => {
        if (!action) return '';
        // Handle "receipt.created" -> "created"
        const parts = action.split('.');
        const key = parts.length > 1 ? parts[parts.length - 1] : action;

        // Map backend action verbs to translation keys if specific ones needed
        // But usually 'created', 'updated', 'deleted' are common
        return t(`audit.actions.${key}`, key);
    };

    const getActionColor = (action) => {
        if (action.includes('create')) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
        if (action.includes('delete')) return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
        if (action.includes('update')) return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    };

    const formatPayload = (row) => {
        const { action, payload, entity } = row;
        if (!payload) return <span className="text-slate-400 italic">No details</span>;

        // 1. Settings Update (Key, Old, New)
        if (entity === 'Setting' && payload.key) {
            const label = t(`settings.keys.${payload.key}.label`, { defaultValue: payload.key });
            return (
                <div className="space-y-1">
                    <span className="font-medium text-xs text-slate-700 dark:text-slate-300">{label}</span>
                    {payload.oldValue !== undefined && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded line-through dark:bg-rose-500/20">{String(payload.oldValue)}</span>
                            <span className="text-slate-400">→</span>
                            <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold dark:bg-emerald-500/20">{String(payload.newValue)}</span>
                        </div>
                    )}
                </div>
            );
        }

        // 2. Resource Created (shows code/name)
        if (action.endsWith('created')) {
            const name = payload.code || payload.name || payload.sku || 'N/A';
            const extra = payload.totalLines ? `(${payload.totalLines} lines)` : '';
            return (
                <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">Đã tạo mới:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{name}</span>
                    {extra && <span className="text-slate-400">{extra}</span>}
                </div>
            );
        }

        // 3. Resource Deleted
        if (action.endsWith('deleted')) {
            const name = payload.code || payload.name || payload.sku || 'N/A';
            return (
                <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">Đã xóa:</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{name}</span>
                </div>
            );
        }

        // 4. Status Change (Approve/Reject/Complete)
        if (payload.status) {
            return (
                <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">Trạng thái:</span>
                    <span className="font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{payload.status}</span>
                    {payload.rejectedNote && (
                        <span className="text-rose-500 italic">- {payload.rejectedNote}</span>
                    )}
                </div>
            );
        }

        // 5. Generic Update (Show changed fields if possible)
        // If payload is just a flat object of changes
        if (action.endsWith('updated') && Object.keys(payload).length > 0) {
            return (
                <div className="text-xs">
                    <span className="text-slate-500 block mb-1">Cập nhật:</span>
                    <div className="flex flex-wrap gap-1">
                        {Object.entries(payload).map(([k, v]) => (
                            <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                {k}: <span className="font-medium ml-1 text-slate-800 dark:text-slate-200">{String(v)}</span>
                            </span>
                        ))}
                    </div>
                </div>
            );
        }

        // General fallback - simplified JSON
        return (
            <div className="group relative">
                <div className="text-xs text-slate-500 cursor-help underline decoration-dotted decoration-slate-300">
                    {t('audit.details')}
                </div>
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-80 p-3 bg-slate-900 text-slate-50 rounded-lg text-[10px] font-mono shadow-xl overflow-auto max-h-[300px] border border-slate-700">
                    <pre className="whitespace-pre-wrap break-all">{JSON.stringify(payload, null, 2)}</pre>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('audit.title')}
                description={t('audit.description')}
                actions={
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setExportRange({
                                    startDate: filter.startDate,
                                    endDate: filter.endDate
                                });
                                setExportOpen(true);
                            }}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
                        >
                            <FileSpreadsheet className="h-4 w-4 text-green-600" />
                            {t('Xuất file')}
                        </button>
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="btn btn-secondary shadow-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50"
                        >
                            <Filter className="h-4 w-4 mr-2 text-indigo-500" />
                            {t('app.filter')}
                            {activeFilterCount > 0 && (
                                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                }
            />

            {/* Quick Search Bar */}
            <div className="relative group max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white shadow-sm placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder={t('audit.filter.searchPlaceholder')}
                    value={filter.query}
                    onChange={(e) => setFilter({ ...filter, query: e.target.value, page: 1 })}
                />
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <DataTable
                    data={logs}
                    loading={loading}
                    searchable={false}
                    columns={[
                        {
                            key: 'createdAt',
                            header: t('audit.time'),
                            render: (value) => (
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                        {new Date(value).toLocaleDateString('vi-VN')}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {new Date(value).toLocaleTimeString('vi-VN')}
                                    </span>
                                </div>
                            )
                        },
                        {
                            key: 'actor',
                            header: t('audit.actor'),
                            render: (value) => (
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <User className="h-3 w-3" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{value?.username || 'System'}</span>
                                </div>
                            )
                        },
                        {
                            key: 'entity',
                            header: t('audit.entity'),
                            render: (_, row) => (
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-tight">
                                        {t(`audit.entities.${row.entity}`, row.entity)}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono" title="ID">#{row.entityId?.slice(-6)}</span>
                                </div>
                            )
                        },
                        {
                            key: 'action',
                            header: t('audit.action'),
                            render: (value) => (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getActionColor(value)}`}>
                                    {formatAction(value)}
                                </span>
                            )
                        },
                        {
                            key: 'payload',
                            header: t('audit.details'),
                            render: (_, row) => formatPayload(row)
                        }
                    ]}
                />
            </div>

            {/* Pagination Controls Reuse */}
            <div className="flex justify-between items-center px-4 py-2 bg-white/50 dark:bg-slate-900/50 rounded-xl backdrop-blur-sm border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {t('app.page', { page: filter.page }).replace('{{page}}', filter.page).replace('undefined', filter.page)}
                </span>
                <div className="flex gap-2">
                    <button
                        className="btn-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest"
                        disabled={filter.page === 1}
                        onClick={() => setFilter({ ...filter, page: filter.page - 1 })}
                    >
                        {t('app.previous', 'Trước')}
                    </button>
                    <button
                        className="btn-primary px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                        onClick={() => setFilter({ ...filter, page: filter.page + 1 })}
                        disabled={logs.length < filter.limit}
                    >
                        {t('app.next', 'Sau')}
                    </button>
                </div>
            </div>

            {/* Advanced Filter Drawer */}
            <FilterDrawer
                open={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                title={t('app.filter')}
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {t('audit.filter.entity')}
                        </label>
                        <select
                            className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-indigo-500 text-sm py-2.5"
                            value={tempFilter.entity}
                            onChange={(e) => setTempFilter({ ...tempFilter, entity: e.target.value })}
                        >
                            {entityOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {t('audit.filter.timeRange')}
                        </label>
                        <div className="space-y-3">
                            <div>
                                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1 block"> {t('audit.filter.startDate')}</span>
                                <input
                                    type="date"
                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm py-2.5 px-3"
                                    value={tempFilter.startDate}
                                    onChange={(e) => setTempFilter({ ...tempFilter, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1 block"> {t('audit.filter.endDate')}</span>
                                <input
                                    type="date"
                                    className="w-full rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm py-2.5 px-3"
                                    value={tempFilter.endDate}
                                    onChange={(e) => setTempFilter({ ...tempFilter, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </FilterDrawer>

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                style={{ display: exportOpen ? 'flex' : 'none' }}
                onClick={(e) => e.target === e.currentTarget && setExportOpen(false)}
            >
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{t('app.export')} Excel</h3>
                        <button onClick={() => setExportOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {t('audit.exportPrompt', 'Chọn khoảng thời gian để xuất dữ liệu (để trống để xuất toàn bộ).')}
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('audit.filter.startDate')}</label>
                                <input
                                    type="date"
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm py-2 px-3"
                                    value={exportRange.startDate}
                                    onChange={(e) => setExportRange(prev => ({ ...prev, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('audit.filter.endDate')}</label>
                                <input
                                    type="date"
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm py-2 px-3"
                                    value={exportRange.endDate}
                                    onChange={(e) => setExportRange(prev => ({ ...prev, endDate: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button
                            onClick={() => setExportOpen(false)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            {t('Hủy')}
                        </button>
                        <button
                            onClick={processExport}
                            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-500 shadow-sm transition-colors flex items-center gap-2"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            {t('Xuất file')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
