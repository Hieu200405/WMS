import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../services/apiClient';
import { formatDateTime } from '../utils/formatters';

export function AuditLogViewer({ resource, resourceId }) {
    const { t } = useTranslation();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!resourceId) return;

        setLoading(true);
        apiClient.get(`/${resource}/${resourceId}/audit-logs`)
            .then(res => setLogs(res.data.data || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [resource, resourceId]);

    if (loading) return <div className="p-4 text-center text-sm text-slate-500">Loading history...</div>;
    if (logs.length === 0) return <div className="p-4 text-center text-sm text-slate-500">No history available.</div>;

    return (
        <div className="p-8">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-10 tracking-tight">Nhật ký hoạt động</h3>
            <div className="flow-root">
                <ul role="list" className="-mb-8">
                    {logs.map((log, logIdx) => (
                        <li key={log._id}>
                            <div className="relative pb-8">
                                {logIdx !== logs.length - 1 ? (
                                    <span className="absolute left-5 top-5 -ml-px h-full w-[2px] bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex items-start space-x-4">
                                    <div className="relative">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm transition-transform hover:scale-110 dark:bg-slate-900 dark:border-slate-800">
                                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                                {log.actorId?.name?.charAt(0).toUpperCase() || 'S'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {log.actorId?.name || 'Hệ thống'}{' '}
                                                <span className="font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md ml-1 uppercase text-[10px] tracking-widest">{formatAction(log.action)}</span>
                                            </p>
                                            {/* Optional: Show payload details for critical actions */}
                                            {['create', 'update', 'delete', 'completed'].some(a => log.action.includes(a)) && log.payload && (
                                                <div className="mt-2 text-xs font-bold text-slate-400 font-mono bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                                                    {Object.entries(log.payload).map(([k, v]) => (
                                                        <div key={k}>{k}: {String(v)}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="whitespace-nowrap text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {formatDateTime(log.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function formatAction(action) {
    if (!action) return '';
    // Format "receipt.created" -> "created receipt"
    const parts = action.split('.');
    if (parts.length > 1) {
        return `${parts[1]} ${parts[0]}`;
    }
    return action.replace(/_/g, ' ');
}
