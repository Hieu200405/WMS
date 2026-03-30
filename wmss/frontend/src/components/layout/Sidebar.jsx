import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useAuth } from '../../app/auth-context.jsx';
// Removed useMockData import and badge logic for now
import { Roles } from '../../utils/constants.js';

export function Sidebar({ routes = [], collapsed = false }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Badge logic removed to decouple mock data.
  // Ideally, we fetch badge counts from a real API endpoint (e.g. /notifications/counts).
  // For this transition, we will remove the badges.

  const visibleRoutes = routes.filter((route) => {
    if (route.hiddenInMenu) return false;
    if (!route.roles || route.roles.length === 0) return true;
    if (!user) return false;
    return route.roles.includes(user.role);
  });

  return (
    <aside
      className={clsx(
        'sidebar-glass z-50 flex h-screen flex-col transition-all duration-300',
        collapsed ? 'w-[80px]' : 'w-72',
      )}
    >
      <div className="mb-10 flex items-center gap-3 px-3 shrink-0">
        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
          <span className="text-xl font-black text-white italic">W</span>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent" />
        </div>
        {!collapsed ? (
          <div className="animate-in">
            <p className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {t('app.title')}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
              {t(`roles.${user?.role ?? 'Staff'}`)}
            </p>
          </div>
        ) : null}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
        <nav className="flex flex-col gap-1.5">
          {visibleRoutes.map((route) => {
            const Icon = route.icon;

            return (
              <NavLink
                key={route.path}
                to={route.path}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white',
                  )
                }
              >
                {Icon ? <Icon className={clsx("h-5 w-5 transition-transform group-hover:scale-110")} /> : null}
                {!collapsed ? <span className="animate-in">{t(route.labelKey)}</span> : null}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
