import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowUpRight, ArrowDownLeft, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/apiClient.js';
import { DataTable } from '../../components/DataTable.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import toast from 'react-hot-toast';

export function TransactionsPage() {
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient('/transactions');
            setTransactions(res.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleExport = async () => {
        try {
            const blob = await apiClient('/transactions/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Transactions-${Date.now()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (e) {
            console.error(e);
            toast.error('Export failed');
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const columns = [
        {
            key: 'type',
            header: 'Loại',
            render: (value) => (
                <div className="flex items-center gap-2">
                    {['revenue', 'income'].includes(value) ? (
                        <div className="p-1 rounded bg-emerald-100 text-emerald-600">
                            <ArrowDownLeft size={16} />
                        </div>
                    ) : (
                        <div className="p-1 rounded bg-red-100 text-red-600">
                            <ArrowUpRight size={16} />
                        </div>
                    )}
                    <span className="capitalize">{value === 'revenue' ? 'Thu (Revenue)' : value === 'expense' ? 'Chi (Expense)' : value}</span>
                </div>
            )
        },
        {
            key: 'amount', header: 'Số tiền', render: (val, row) => (
                <span className={['revenue', 'income'].includes(row.type) ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                    {['revenue', 'income'].includes(row.type) ? '+' : '-'}{formatCurrency(val)}
                </span>
            )
        },
        { key: 'partner', header: 'Đối tác', render: (p) => p?.name || '---' }, // Backend populates partner
        {
            key: 'referenceType', header: 'Tham chiếu', render: (val, row) => (
                <div className="flex flex-col">
                    <span className="text-xs font-semibold">{val}</span>
                    <span className="text-xs text-slate-500">{row.referenceId}</span>
                </div>
            )
        },
        { key: 'date', header: 'Ngày', render: (val) => formatDate(val) },
        { key: 'status', header: 'Trạng thái', render: (val) => <StatusBadge status={val} /> },
        { key: 'note', header: 'Ghi chú', render: (val) => <span className="text-xs text-slate-500 truncate max-w-[200px] inline-block" title={val}>{val}</span> }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {t('financials.title')}
                    </h1>
                    <p className="text-sm text-slate-500">{t('financials.transactions')}</p>
                </div>
                <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-500"
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export Excel
                </button>
            </div>

            <DataTable
                data={transactions}
                columns={columns}
                isLoading={loading}
                emptyMessage="Không có giao dịch tải chính nào."
            />
        </div>
    );
}
