import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PageHeader({ title, description, actions }) {
    const location = useLocation();
    const { t } = useTranslation();

    // Simple breadcrumb generation based on path segments
    const pathnames = location.pathname.split('/').filter((x) => x);

    // Don't show breadcrumbs on dashboard/root
    const showBreadcrumbs = pathnames.length > 0 && pathnames[0] !== 'dashboard';

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 animate-in">
            <div className="space-y-1">
                {showBreadcrumbs && (
                    <nav className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-2">
                        <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
                            <Home className="h-3 w-3" />
                        </Link>
                        {pathnames.map((value, index) => {
                            const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                            const isLast = index === pathnames.length - 1;

                            // Try to translate the segment, fallback to capitalization
                            const label = t(`navigation.${value}`) !== `navigation.${value}`
                                ? t(`navigation.${value}`)
                                : value.charAt(0).toUpperCase() + value.slice(1);

                            return (
                                <div key={to} className="flex items-center gap-1">
                                    <ChevronRight className="h-3 w-3 text-slate-300" />
                                    {isLast ? (
                                        <span className="text-slate-900 dark:text-slate-200 font-bold">{label}</span>
                                    ) : (
                                        <Link to={to} className="hover:text-indigo-600 transition-colors">
                                            {label}
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                )}
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">{title}</h1>
                    {description && (
                        <p className="mt-2 text-sm font-medium text-slate-500 italic opacity-80">{description}</p>
                    )}
                </div>
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
    );
}
