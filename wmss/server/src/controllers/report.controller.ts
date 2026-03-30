import type { Request, Response } from 'express';
import {
  getDashboardStats,
  getInventoryReport,
  getInboundReport,
  getOutboundReport,
  getStocktakeReport,
  createPdfBuffer
} from '../services/report.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/errors.js';

// Helper to extract date filter from query
const extractDateFilter = (req: Request) => {
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  return { startDate, endDate };
};

export const overview = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = extractDateFilter(req);
  const data = await getDashboardStats({ startDate, endDate });
  res.json({ data });
});

export const inventory = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getInventoryReport();
  res.json({ data });
});

export const inbound = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = extractDateFilter(req);
  const data = await getInboundReport({ startDate, endDate });
  res.json({ data });
});

export const outbound = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = extractDateFilter(req);
  const data = await getOutboundReport({ startDate, endDate });
  res.json({ data });
});

export const stocktake = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = extractDateFilter(req);
  const data = await getStocktakeReport({ startDate, endDate });
  res.json({ data });
});

const reportMap = {
  overview: getDashboardStats,
  inventory: getInventoryReport,
  inbound: getInboundReport,
  receipts: getInboundReport,
  outbound: getOutboundReport,
  deliveries: getOutboundReport,
  stocktake: getStocktakeReport,
  stocktaking: getStocktakeReport
} as const;

type ReportKey = keyof typeof reportMap;

export const pdf = asyncHandler(async (req: Request, res: Response) => {
  const type = req.params.type as ReportKey;
  const resolver = reportMap[type];
  if (!resolver) {
    throw badRequest('Unknown report type');
  }
  const { startDate, endDate } = extractDateFilter(req);
  const data = await resolver({ startDate, endDate });
  const buffer = await createPdfBuffer(`${type.toUpperCase()} Report`, data);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${type}-report.pdf`);
  res.send(buffer);
});
