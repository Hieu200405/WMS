import { Types } from 'mongoose';
import { StocktakeModel } from '../models/stocktake.model.js';
import { InventoryModel } from '../models/inventory.model.js';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { conflict, notFound } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';

interface ListQuery {
  page?: string;
  limit?: string;
  sort?: string;
  status?: string;
  query?: string;
}

const computeStatus = (items: { systemQty: number; countedQty: number }[]) =>
  items.some((item) => item.countedQty !== item.systemQty) ? 'diff' : 'pass';

export const listStocktakes = async (query: ListQuery) => {
  const { page, limit, sort, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.query) filter.code = new RegExp(query.query, 'i');
  const [total, items] = await Promise.all([
    StocktakeModel.countDocuments(filter),
    StocktakeModel.find(filter).sort(sort).skip(skip).limit(limit).lean()
  ]);
  return buildPagedResponse(
    items.map((item) => ({
      id: item._id.toString(),
      code: item.code,
      date: item.date,
      status: computeStatus(item.items),
      items: item.items,
    })),
    total,
    { page, limit, sort, skip }
  );
};

const enrichItems = async (
  items: { productId: string; locationId: string; systemQty?: number; countedQty: number, serials?: string[] }[]
) => {
  const { ProductModel } = await import('../models/product.model.js');
  const { SerialModel } = await import('../models/serial.model.js');

  const results = [] as {
    productId: Types.ObjectId;
    locationId: Types.ObjectId;
    systemQty: number;
    countedQty: number;
    serials: string[];
  }[];

  for (const item of items) {
    const product = await ProductModel.findById(item.productId).lean();

    const systemQty =
      typeof item.systemQty === 'number'
        ? item.systemQty
        : (
          await InventoryModel.findOne({
            productId: new Types.ObjectId(item.productId),
            locationId: new Types.ObjectId(item.locationId),
            status: 'available'
          }).lean()
        )?.quantity ?? 0;

    let systemSerials: string[] = [];
    if (product && (product as any).manageBySerial) {
      const found = await SerialModel.find({
        productId: product._id,
        locationId: new Types.ObjectId(item.locationId),
        status: 'in_stock'
      }).lean();
      systemSerials = found.map(s => s.serialNumber);
    }

    results.push({
      productId: new Types.ObjectId(item.productId),
      locationId: new Types.ObjectId(item.locationId),
      systemQty,
      countedQty: item.countedQty,
      serials: item.serials || systemSerials
    });
  }
  return results;
};

export const createStocktake = async (
  payload: {
    code: string;
    date: Date;
    items: { productId: string; locationId: string; systemQty?: number; countedQty: number }[];
  },
  actorId: string
) => {
  const existing = await StocktakeModel.findOne({ code: payload.code }).lean();
  if (existing) {
    throw conflict('Stocktake code already exists');
  }
  const items = await enrichItems(payload.items);
  const stocktake = await StocktakeModel.create({
    code: payload.code,
    date: payload.date,
    items,
    status: computeStatus(items)
  });
  await recordAudit({
    action: 'stocktake.created',
    entity: 'Stocktake',
    entityId: stocktake._id,
    actorId,
    payload: { code: stocktake.code, totalItems: stocktake.items.length }
  });
  return stocktake.toObject();
};

export const updateStocktake = async (
  id: string,
  payload: {
    date?: Date;
    items?: { productId: string; locationId: string; systemQty?: number; countedQty: number }[];
  },
  actorId: string
) => {
  const stocktake = await StocktakeModel.findById(new Types.ObjectId(id));
  if (!stocktake) {
    throw notFound('Stocktake not found');
  }
  if (payload.date) stocktake.date = payload.date;
  if (payload.items) {
    stocktake.items = await enrichItems(payload.items);
    stocktake.status = computeStatus(stocktake.items);
  }
  await stocktake.save();
  await recordAudit({
    action: 'stocktake.updated',
    entity: 'Stocktake',
    entityId: stocktake._id,
    actorId,
    payload
  });
  return stocktake.toObject();
};

export const deleteStocktake = async (id: string, actorId: string) => {
  const stocktake = await StocktakeModel.findByIdAndDelete(new Types.ObjectId(id));
  if (!stocktake) {
    throw notFound('Stocktake not found');
  }
  await recordAudit({
    action: 'stocktake.deleted',
    entity: 'Stocktake',
    entityId: stocktake._id,
    actorId,
    payload: { code: stocktake.code }
  });
  return true;
};
