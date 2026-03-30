import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../../app/theme-context.jsx';
import { useAuth } from '../../app/auth-context.jsx';
import { Input } from '../forms/Input.jsx';
import { NotificationDropdown } from './NotificationDropdown.jsx';

export function Header({ onSearch }) {
  const { theme, toggleTheme } = useTheme();
  const { i18n, t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const changeLanguage = (lng) => {
    void i18n.changeLanguage(lng);
  };

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between gap-4 border-b border-slate-200/50 bg-white/60 px-8 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-950/60">
      <div className="w-full max-w-xl">
        <Input
          className="w-full !rounded-2xl !bg-slate-100/50 focus:!bg-white dark:!bg-slate-900/50 dark:focus:!bg-slate-900"
          placeholder={t('app.search')}
          onChange={(event) => onSearch?.(event.target.value)}
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-1 rounded-2xl border border-slate-200/50 bg-slate-100/30 p-1 dark:border-slate-800/50 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={() => changeLanguage('vi')}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-200 ${i18n.language === 'vi' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
          >
            VI
          </button>
          <button
            type="button"
            onClick={() => changeLanguage('en')}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all duration-200 ${i18n.language === 'en' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
          >
            EN
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1" />

        <NotificationDropdown />

        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/50 bg-white/50 text-slate-600 shadow-sm transition-all hover:bg-white hover:text-indigo-600 dark:border-slate-800/50 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-indigo-400"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="flex items-center gap-3 pl-2">
          <div
            className="hidden text-right md:block cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/profile')}
          >
            <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              {user?.fullName}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t(`roles.${user?.role}`)}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-sm transition-all hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
