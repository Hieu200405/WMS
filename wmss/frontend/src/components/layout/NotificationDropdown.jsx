import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../../app/socket-context.jsx';

export function NotificationDropdown() {
    const { t, i18n } = useTranslation();
    const socket = useSocket(); // Use socket
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await apiClient('/notifications');
            setNotifications(res.data || []);
            setUnreadCount(res.meta?.unreadCount || 0);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Backup polling every 60s
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Realtime listener
    useEffect(() => {
        if (!socket) return;
        const handleNewNotification = (newNotif) => {
            // Add new notif to top
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
        };
        socket.on('notification', handleNewNotification);
        return () => socket.off('notification', handleNewNotification);
    }, [socket]);

    // Handle click outside to close
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const markAsRead = async (id) => {
        try {
            await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            // Only decrement if it was previously unread
            const notif = notifications.find(n => n._id === id);
            if (notif && !notif.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (e) { console.error(e); }
    };



    const markAllRead = async () => {
        try {
            await apiClient('/notifications/read-all', { method: 'PATCH' });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (e) { console.error(e); }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
            default: return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-slate-700 dark:bg-slate-900 overflow-hidden z-50">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('app.notifications', 'Notifications')}</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                            >
                                {t('app.markAllRead', 'Mark all read')}
                            </button>
                        )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-sm text-slate-500">
                                {t('app.noNotifications', 'No notifications')}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification._id}
                                        className={clsx(
                                            "flex gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800",
                                            !notification.isRead && "bg-slate-50/50 dark:bg-slate-800/30"
                                        )}
                                        onClick={() => !notification.isRead && markAsRead(notification._id)}
                                    >
                                        <div className="mt-0.5 flex-shrink-0">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1">
                                            <p className={clsx("text-sm font-medium", !notification.isRead ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400")}>
                                                {notification.title}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                {notification.message}
                                            </p>
                                            <p className="mt-1 text-[10px] text-slate-400">
                                                {formatDistanceToNow(new Date(notification.createdAt), {
                                                    addSuffix: true,
                                                    locale: i18n.language === 'vi' ? vi : enUS
                                                })}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-600" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
