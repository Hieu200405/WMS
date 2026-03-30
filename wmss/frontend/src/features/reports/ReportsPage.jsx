import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { FileDown, RefreshCw, Calendar, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { DataTable } from '../../components/DataTable.jsx';
import { apiClient } from '../../services/apiClient.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { Skeleton } from '../../components/Skeleton.jsx';

export function ReportsPage() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);

    // Input state (what user types in the date inputs)
    const [startDateInput, setStartDateInput] = useState('');
    const [endDateInput, setEndDateInput] = useState('');

    // Applied filter state (what's actually used for API calls)
    const [appliedStartDate, setAppliedStartDate] = useState('');
    const [appliedEndDate, setAppliedEndDate] = useState('');

    const fetchReport = useCallback(async (type, dateStart = null, dateEnd = null) => {
        setLoading(true);
        try {
            // Build query params for date filtering
            const params = new URLSearchParams();
            if (dateStart) params.append('startDate', dateStart);
            if (dateEnd) params.append('endDate', dateEnd);

            const queryString = params.toString();
            const url = `/reports/${type}${queryString ? `?${queryString}` : ''}`;

            console.log('Fetching report:', url); // Debug log
            const res = await apiClient(url);
            setData(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    }, []);

    // Only fetch on tab change, using the APPLIED filter (not input state)
    useEffect(() => {
        fetchReport(activeTab, appliedStartDate, appliedEndDate);
    }, [activeTab, appliedStartDate, appliedEndDate, fetchReport]);

    // Handle "Áp dụng" button - copies input to applied state
    const handleApplyFilter = () => {
        setAppliedStartDate(startDateInput);
        setAppliedEndDate(endDateInput);
    };

    // Handle "Xóa bộ lọc" button - clears both input and applied states
    const handleClearFilter = () => {
        setStartDateInput('');
        setEndDateInput('');
        setAppliedStartDate('');
        setAppliedEndDate('');
    };

    const downloadPdf = async () => {
        try {
            // Build query params for PDF download too
            const params = new URLSearchParams();
            if (appliedStartDate) params.append('startDate', appliedStartDate);
            if (appliedEndDate) params.append('endDate', appliedEndDate);
            const queryString = params.toString();

            const blob = await apiClient(`/reports/${activeTab}/pdf${queryString ? `?${queryString}` : ''}`, {
                headers: { Accept: 'application/pdf' },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report-${activeTab}-${new Date().toISOString().slice(0, 10)}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success(t('reports.common.downloadCompleted'));
        } catch (e) {
            console.error(e);
            toast.error(t('reports.common.downloadFailed'));
        }
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    const renderOverview = () => {
        if (loading || Array.isArray(data)) {
            // ... skeleton logic remains the same ...
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="h-80 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <Skeleton className="h-6 w-48 mb-6" />
                            <Skeleton className="h-full w-full rounded-lg" />
                        </div>
                        <div className="h-80 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <Skeleton className="h-6 w-32 mb-6" />
                            <Skeleton className="h-full w-full rounded-full" />
                        </div>
                    </div>
                </div>
            );
        }

        if (!data) return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <FileDown className="h-12 w-12 mb-4 opacity-50" />
                <p>{t('reports.common.noData')}</p>
            </div>
        );

        const { counts, totalInventoryValue, revenueChart, inventoryStatus } = data;

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title={t('reports.stats.totalInventoryValue')} value={formatCurrency(totalInventoryValue)} color="bg-blue-50 text-blue-700" />
                    <StatCard title={t('reports.stats.products')} value={counts?.products} color="bg-indigo-50 text-indigo-700" />
                    <StatCard title={t('reports.stats.pendingReceipts')} value={counts?.pendingReceipts} color="bg-emerald-50 text-emerald-700" />
                    <StatCard title={t('reports.stats.pendingDeliveries')} value={counts?.pendingDeliveries} color="bg-amber-50 text-amber-700" />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                            {t('reports.charts.revenueVsExpenses')}
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueChart}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} dx={-10} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="income" fill="#10b981" name={t('reports.common.revenue')} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" fill="#ef4444" name={t('reports.common.expenses')} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                            {t('reports.charts.inventoryStatus')}
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={inventoryStatus}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {inventoryStatus?.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderInventory = () => {
        if (loading || !Array.isArray(data)) return (
            <div className="space-y-6">
                {/* Skeleton logic same */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );

        if (!data || data.length === 0) return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <FileDown className="h-12 w-12 mb-4 opacity-50" />
                <p>{t('reports.common.noData')}</p>
            </div>
        );

        // Calculate summaries
        const totalItems = data.length;
        const lowStock = data.filter(i => i.status === 'belowMin').length;
        const outOfStock = data.filter(i => i.totalQty === 0).length;
        const totalValue = data.reduce((acc, curr) => acc + (curr.totalQty * (curr.price || 0)), 0);

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard title={t('reports.stats.totalSkus')} value={totalItems} color="bg-indigo-50 text-indigo-700" />
                    <StatCard title={t('reports.stats.lowStock')} value={lowStock} color="bg-orange-50 text-orange-700" />
                    <StatCard title={t('reports.stats.outOfStock')} value={outOfStock} color="bg-red-50 text-red-700" />
                    <StatCard title={t('reports.stats.stockValue')} value={formatCurrency(totalValue)} color="bg-emerald-50 text-emerald-700" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
                    <DataTable
                        data={data}
                        isLoading={loading}
                        columns={[
                            { key: 'sku', header: 'SKU' },
                            { key: 'name', header: 'Product Name' },
                            { key: 'totalQty', header: 'Total Quantity' },
                            { key: 'minStock', header: 'Min Stock' },
                            {
                                key: 'status',
                                header: 'Status',
                                render: (val) => val === 'belowMin' ?
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Low Stock</span> :
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">OK</span>
                            }
                        ]}
                    />
                </div>
            </div>
        );
    };

    const renderInbound = () => {
        if (loading || !Array.isArray(data)) return (
            // ... skeleton logic same ...
            <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <Skeleton className="h-80 w-full" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );

        if (!data || data.length === 0) return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <FileDown className="h-12 w-12 mb-4 opacity-50" />
                <p>{t('reports.common.noData')}</p>
            </div>
        );

        const totalVolume = data.reduce((acc, curr) => acc + (curr.totalQty || 0), 0);
        const totalReceipts = data.reduce((acc, curr) => acc + (curr.documents || 0), 0);

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <StatCard title={t('reports.stats.inboundVolume')} value={totalVolume} color="bg-indigo-50 text-indigo-700" />
                    <StatCard title={t('reports.stats.totalReceipts')} value={totalReceipts} color="bg-emerald-50 text-emerald-700" />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <h3 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                        {t('reports.charts.monthlyInbound')}
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} dy={10} minTickGap={30} tickFormatter={(val) => formatDate(val)} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} dx={-10} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} dx={10} />
                                <Tooltip
                                    cursor={{ stroke: '#6366f1', strokeWidth: 1 }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="totalQty" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} name={t('reports.common.volume')} dot={false} />
                                <Line yAxisId="right" type="monotone" dataKey="documents" stroke="#10b981" strokeWidth={3} name={t('reports.inventory')} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

    const renderOutbound = () => {
        if (loading || !Array.isArray(data)) return (
            // ... skeleton logic same ...
            <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <Skeleton className="h-80 w-full" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );

        if (!data || data.length === 0) return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <FileDown className="h-12 w-12 mb-4 opacity-50" />
                <p>{t('reports.common.noData')}</p>
            </div>
        );

        const totalVolume = data.reduce((acc, curr) => acc + (curr.totalQty || 0), 0);
        const totalDeliveries = data.reduce((acc, curr) => acc + (curr.documents || 0), 0);

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <StatCard title={t('reports.stats.outboundVolume')} value={totalVolume} color="bg-purple-50 text-purple-700" />
                    <StatCard title={t('reports.stats.totalDeliveries')} value={totalDeliveries} color="bg-blue-50 text-blue-700" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <h3 className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                        {t('reports.charts.monthlyOutbound')}
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} dy={10} minTickGap={30} tickFormatter={(val) => formatDate(val)} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} dx={-10} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} dx={10} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="totalQty" fill="#8884d8" name={t('reports.common.volume')} radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="right" dataKey="documents" fill="#82ca9d" name={t('reports.common.orders')} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

    const renderStocktake = () => {
        if (loading || !Array.isArray(data)) return (
            // ... skeleton logic same ...
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <Skeleton className="h-96 w-full" />
                </div>
            </div>
        );

        if (!data || data.length === 0) return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <FileDown className="h-12 w-12 mb-4 opacity-50" />
                <p>{t('reports.common.noData')}</p>
            </div>
        );

        const totalDiscrepancies = data.reduce((acc, curr) => acc + (curr.discrepancies || 0), 0);
        const completedChecks = data.filter(i => i.status === 'Completed').length;

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <StatCard title={t('reports.stats.discrepancyRate')} value={totalDiscrepancies} color="bg-rose-50 text-rose-700" />
                    <StatCard title={t('reports.stats.totalStocktakes')} value={completedChecks} color="bg-indigo-50 text-indigo-700" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
                    <DataTable
                        data={data}
                        isLoading={loading}
                        columns={[
                            { key: 'code', header: t('stocktaking.create') }, // Reuse code label? Or just 'Code' -> 'Mã'
                            { key: 'date', header: t('financials.date'), render: (val) => formatDate(val) },
                            {
                                key: 'status',
                                header: t('app.status'),
                                render: (val) => (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${val === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {val}
                                    </span>
                                )
                            },
                            { key: 'discrepancies', header: t('stocktaking.difference') }
                        ]}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {t('reports.title')}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchReport(activeTab)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('reports.common.refresh')}
                    </button>
                    <button
                        onClick={downloadPdf}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                    >
                        <FileDown className="h-4 w-4" />
                        {t('reports.common.exportPdf')}
                    </button>
                </div>
            </div>

            {/* Date Range Filter */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <Calendar className="h-4 w-4" />
                        <span>{t('reports.filter.dateRange')}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
                        <div className="flex items-center gap-2">
                            <label htmlFor="startDate" className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {t('reports.filter.from')}:
                            </label>
                            <input
                                type="date"
                                id="startDate"
                                value={startDateInput}
                                onChange={(e) => setStartDateInput(e.target.value)}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="endDate" className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {t('reports.filter.to')}:
                            </label>
                            <input
                                type="date"
                                id="endDate"
                                value={endDateInput}
                                onChange={(e) => setEndDateInput(e.target.value)}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleApplyFilter}
                                disabled={!startDateInput && !endDateInput}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                {t('reports.filter.apply')}
                            </button>
                            {(startDateInput || endDateInput || appliedStartDate || appliedEndDate) && (
                                <button
                                    onClick={handleClearFilter}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    {t('reports.filter.clear')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {[
                        { id: 'overview', label: t('reports.tabs.overview') },
                        { id: 'inventory', label: t('reports.tabs.inventoryLevel') },
                        { id: 'inbound', label: t('reports.tabs.inbound') },
                        { id: 'outbound', label: t('reports.tabs.outbound') },
                        { id: 'stocktake', label: t('reports.tabs.stocktakeAccuracy') },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition
                ${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                }
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'inventory' && renderInventory()}
                {activeTab === 'inbound' && renderInbound()}
                {activeTab === 'outbound' && renderOutbound()}
                {activeTab === 'stocktake' && renderStocktake()}
            </div>
        </div>
    );
}

function StatCard({ title, value, color }) {
    return (
        <div className={`rounded-xl p-6 shadow-sm ${color.split(' ')[0]}`}>
            <dt className={`truncate text-sm font-medium ${color.split(' ')[1]}`}>{title}</dt>
            <dd className={`mt-2 text-3xl font-semibold ${color.split(' ')[1]}`}>{value ?? '-'}</dd>
        </div>
    );
}
