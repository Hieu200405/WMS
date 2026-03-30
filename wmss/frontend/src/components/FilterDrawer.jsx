import { Fragment, useEffect } from 'react';
import { X, Filter, RefreshCcw } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export function FilterDrawer({
    open,
    onClose,
    onApply,
    onReset,
    children,
    title = 'Bộ lọc nâng cao'
}) {
    const { t } = useTranslation();

    // Prevent body scroll when open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [open]);

    return (
        <div
            className={clsx(
                "fixed inset-0 z-50 flex justify-end transition-opacity duration-300",
                open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none delay-200"
            )}
        >
            {/* Backdrop */}
            <div
                className={clsx(
                    "absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300",
                    open ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={clsx(
                    "relative w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-out border-l border-slate-200 dark:border-slate-800 flex flex-col",
                    open ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <Filter className="h-5 w-5" />
                        <h2 className="font-bold text-lg text-slate-900 dark:text-white">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {children}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                    <button
                        onClick={() => { onApply?.(); onClose(); }}
                        className="btn btn-primary w-full justify-center !py-3 !text-sm font-bold shadow-indigo-200 dark:shadow-none"
                    >
                        Áp dụng bộ lọc
                    </button>
                    {onReset && (
                        <button
                            onClick={onReset}
                            className="btn w-full justify-center border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 !py-2.5 !text-xs font-semibold uppercase tracking-wider"
                        >
                            <RefreshCcw className="h-3 w-3 mr-2" />
                            Đặt lại
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
