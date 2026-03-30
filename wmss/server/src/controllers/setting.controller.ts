import type { Request, Response } from 'express';
import { getAllSettings, updateSetting } from '../services/setting.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
    const settings = await getAllSettings(req.query.group as string);
    res.json({ data: settings });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
    const { key, value } = req.body;
    const result = await updateSetting(key, value, req.user!.id);
    res.json({ data: result });
});
