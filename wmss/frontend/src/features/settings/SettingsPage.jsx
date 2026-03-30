import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Save, Settings as SettingsIcon } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "../../services/apiClient.js";
import { Input } from "../../components/forms/Input.jsx";

export function SettingsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState([]);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get("/settings");
            setSettings(data);
        } catch (error) {
            console.error(error);
            toast.error(t('settings.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const groups = useMemo(() => {
        return (settings || []).reduce((acc, setting) => {
            const group = setting.group || 'general';
            if (!acc[group]) acc[group] = [];
            acc[group].push(setting);
            return acc;
        }, {});
    }, [settings]);

    const handleUpdate = async (key, value, type) => {
        let parsedValue = value;
        if (type === 'number') parsedValue = Number(value);
        if (type === 'boolean') parsedValue = value === 'true';

        try {
            await apiClient.patch("/settings", { key, value: parsedValue });
            toast.success(t('settings.updateSuccess'));
            // Update local state to reflect change
            setSettings(prev => prev.map(s => s.key === key ? { ...s, value: parsedValue } : s));
        } catch (error) {
            toast.error(t('settings.updateError'));
        }
    };

    if (loading && settings.length === 0) {
        return <div className="p-8 text-center text-slate-500">{t('settings.loading')}</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <SettingsIcon className="h-6 w-6" />
                    {t("navigation.settings")}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('settings.description')}
                </p>
            </div>

            <div className="grid gap-6">
                {Object.entries(groups).map(([groupName, groupSettings]) => (
                    <div key={groupName} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h2 className="mb-4 text-lg font-semibold capitalize text-slate-900 dark:text-slate-100 border-b border-slate-100 pb-2 dark:border-slate-800">
                            {t(`settings.groups.${groupName}`, groupName)} {t('settings.groupSuffix')}
                        </h2>
                        <div className="space-y-4">
                            {groupSettings.map((setting) => {
                                const label = t(`settings.keys.${setting.key}.label`, { defaultValue: setting.description || setting.key });
                                const desc = t(`settings.keys.${setting.key}.desc`, { defaultValue: setting.key });

                                return (
                                    <div key={setting.key} className="grid gap-2 sm:grid-cols-3 sm:items-center">
                                        <div className="sm:col-span-1">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {label}
                                            </label>
                                            <p className="text-xs text-slate-500">{desc}</p>
                                        </div>
                                        <div className="sm:col-span-2">
                                            {setting.type === 'boolean' ? (
                                                <select
                                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                    value={String(setting.value)}
                                                    onChange={(e) => handleUpdate(setting.key, e.target.value, 'boolean')}
                                                >
                                                    <option value="true">{t('settings.true')}</option>
                                                    <option value="false">{t('settings.false')}</option>
                                                </select>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <input
                                                        type={setting.type === 'number' ? 'number' : 'text'}
                                                        className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                        defaultValue={setting.value}
                                                        onBlur={(e) => {
                                                            if (e.target.value !== String(setting.value)) {
                                                                handleUpdate(setting.key, e.target.value, setting.type);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
