import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Home,
    Box,
    CreditCard,
    Users,
    FileText,
    Settings,
    LogOut,
    Search,
    Truck,
    BarChart2,
    History
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        const down = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const run = (command) => {
        command();
        setOpen(false);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] animate-in fade-in duration-200">
            <div className="w-full max-w-xl mx-4 relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-50 blur group-hover:opacity-75 transition duration-200"></div>
                <Command
                    className="relative w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
                    loop
                >
                    <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-4">
                        <Search className="mr-3 h-5 w-5 text-slate-400" />
                        <Command.Input
                            className="flex h-14 w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 dark:text-white"
                            placeholder={t('app.searchCmd') || "Type a command or search..."}
                        />
                        <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">ESC</kbd>
                    </div>

                    <Command.List className="max-h-[350px] overflow-y-auto overflow-x-hidden p-2 scrollbar-hide">
                        <Command.Empty className="py-10 text-center text-sm text-slate-500">
                            No results found.
                        </Command.Empty>

                        <Command.Group heading="Navigation" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-2 select-none">
                            <Item icon={<Home />} onSelect={() => run(() => navigate('/dashboard'))}>Dashboard</Item>
                            <Item icon={<Box />} onSelect={() => run(() => navigate('/inventory'))}>Inventory</Item>
                            <Item icon={<CreditCard />} onSelect={() => run(() => navigate('/products'))}>Products</Item>
                            <Item icon={<Truck />} onSelect={() => run(() => navigate('/partners'))}>Partners</Item>
                            <Item icon={<FileText />} onSelect={() => run(() => navigate('/receipts'))}>Receipts</Item>
                            <Item icon={<Truck />} onSelect={() => run(() => navigate('/deliveries'))}>Deliveries</Item>
                            <Item icon={<History />} onSelect={() => run(() => navigate('/audit'))}>Audit Logs</Item>
                        </Command.Group>

                        <Command.Group heading="System" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-2 mt-2 select-none">
                            <Item icon={<Settings />} onSelect={() => run(() => navigate('/settings'))}>Settings</Item>
                            <Item icon={<Users />} onSelect={() => run(() => navigate('/users'))}>User Management</Item>
                            <Item icon={<LogOut className="text-rose-500" />} onSelect={() => run(() => navigate('/logout'))}>Logout</Item>
                        </Command.Group>
                    </Command.List>

                    <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 p-2 px-4 flex justify-between items-center text-[10px] text-slate-400 select-none">
                        <div className="flex gap-4">
                            <span><strong>↑↓</strong> to navigate</span>
                            <span><strong>↵</strong> to select</span>
                        </div>
                        <div className="flex gap-2 font-mono">
                            PROTIP: CMD+K
                        </div>
                    </div>
                </Command>
            </div>
        </div>
    );
}

function Item({ children, icon, onSelect }) {
    return (
        <Command.Item
            onSelect={onSelect}
            className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-600 dark:aria-selected:bg-indigo-900/20 dark:aria-selected:text-indigo-400 transition-all data-[disabled]:opacity-50"
        >
            {icon && <span className="h-4 w-4 opacity-70 group-aria-selected:text-indigo-500">{icon}</span>}
            {children}
        </Command.Item>
    );
}
