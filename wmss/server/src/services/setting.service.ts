import { SettingModel } from '../models/setting.model.js';
import { notFound } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';
import { logger } from '../utils/logger.js';

// Cache settings in memory to avoid frequent DB hits
let settingsCache: Map<string, any> | null = null;
const CACHE_TTL = 300000; // 5 minutes
let lastCacheUpdate = 0;

const refreshCache = async () => {
    const settings = await SettingModel.find().lean();
    settingsCache = new Map();
    settings.forEach(s => settingsCache!.set(s.key, s.value));
    lastCacheUpdate = Date.now();
};

export const getSetting = async <T = any>(key: string, defaultValue?: T): Promise<T> => {
    if (!settingsCache || Date.now() - lastCacheUpdate > CACHE_TTL) {
        await refreshCache();
    }
    if (settingsCache?.has(key)) {
        return settingsCache.get(key) as T;
    }

    // Try direct DB fetch if cache miss (though refresh should cover it)
    const setting = await SettingModel.findOne({ key }).lean();
    if (setting) {
        settingsCache?.set(key, setting.value);
        return setting.value as T;
    }

    if (defaultValue !== undefined) return defaultValue;
    throw notFound(`Setting ${key} not found`);
};

export const getAllSettings = async (group?: string) => {
    const filter: any = {};
    if (group) filter.group = group;
    return SettingModel.find(filter).sort({ group: 1, key: 1 }).lean();
};

export const updateSetting = async (key: string, value: any, actorId: string) => {
    const setting = await SettingModel.findOne({ key });
    if (!setting) throw notFound(`Setting ${key} not found`);

    const oldValue = setting.value;
    setting.value = value;
    await setting.save();
    await refreshCache();

    await recordAudit({
        action: 'setting.updated',
        entity: 'Setting',
        entityId: setting._id,
        actorId,
        payload: { key, oldValue, newValue: value }
    });

    return setting.toObject();
};

export const initializeDefaultSettings = async () => {
    const defaults = [
        { key: 'company.name', value: 'WMS Corp', type: 'string', group: 'general', description: 'Company Name' },
        { key: 'delivery.sla.corporate', value: 7, type: 'number', group: 'delivery', description: 'SLA Days for Corporate Customers' },
        { key: 'delivery.sla.individual', value: 2, type: 'number', group: 'delivery', description: 'SLA Days for Individual Customers' },
        { key: 'delivery.limit.corporate', value: 1000, type: 'number', group: 'delivery', description: 'Max Quantity per Order (Corporate)' },
        { key: 'delivery.limit.individual', value: 50, type: 'number', group: 'delivery', description: 'Max Quantity per Order (Individual)' },
        { key: 'inventory.low_stock_threshold', value: 10, type: 'number', group: 'inventory', description: 'Global Low Stock Threshold (Fallback)' },
        { key: 'disposal.approval_threshold', value: 1000000, type: 'number', group: 'disposal', description: 'Value requiring Level 2 approval' },
    ];

    for (const def of defaults) {
        const exists = await SettingModel.exists({ key: def.key });
        if (!exists) {
            await SettingModel.create(def);
            logger.info(`Initialized setting: ${def.key}`);
        }
    }
    await refreshCache();
};
