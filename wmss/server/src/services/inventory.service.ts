import { Types } from 'mongoose';
import { InventoryModel } from '../models/inventory.model.js';
import { logger } from '../utils/logger.js';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { WarehouseNodeModel } from '../models/warehouseNode.model.js';

interface InventoryQuery {
  page?: string;
  limit?: string;
  sort?: string;
  productId?: string;
  locationId?: string;
  branchIds?: string[];
}

export const listInventory = async (query: InventoryQuery) => {
  const { page, limit, sort, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.productId) filter.productId = new Types.ObjectId(query.productId);
  if (query.locationId) filter.locationId = new Types.ObjectId(query.locationId);

  // RBAC: Filter by Branch
  if (query.branchIds && query.branchIds.length > 0) {
    const allowedBins = await WarehouseNodeModel.find({
      branchId: { $in: query.branchIds.map(id => new Types.ObjectId(id)) }
    }).select('_id').lean();
    const binIds = allowedBins.map(b => b._id);

    if (filter.locationId) {
      // Intersection of requested and allowed
      if (!binIds.some(id => id.toString() === filter.locationId?.toString())) {
        return buildPagedResponse([], 0, { page, limit, sort, skip });
      }
    } else {
      filter.locationId = { $in: binIds };
    }
  }

  const [total, items] = await Promise.all([
    InventoryModel.countDocuments(filter),
    InventoryModel.find(filter).sort(sort).skip(skip).limit(limit).lean()
  ]);

  const locationIds = [...new Set(items.map((item) => item.locationId.toString()))];
  const locationRows = await WarehouseNodeModel.find({ _id: { $in: locationIds } })
    .select('name code')
    .lean();
  const locationMap = new Map(
    locationRows.map((loc) => [loc._id.toString(), { id: loc._id.toString(), name: loc.name, code: loc.code }])
  );

  const data = items.map((item) => ({
    id: item._id.toString(),
    productId: item.productId.toString(),
    locationId: item.locationId.toString(),
    location: locationMap.get(item.locationId.toString()) ?? null,
    quantity: item.quantity,
    status: (item as any).status ?? 'available',
    batch: item.batch ?? null,
    expDate: item.expDate?.toISOString() ?? null,
    updatedAt: item.updatedAt
  }));

  return buildPagedResponse(data, total, { page, limit, sort, skip });
};

const ensureLocationExists = async (locationId: string | Types.ObjectId) => {
  const location = await WarehouseNodeModel.findOne({
    _id: new Types.ObjectId(locationId),
    type: 'bin'
  });
  if (!location) {
    throw notFound('Location not found');
  }
  return location;
};

const checkCapacity = async (location: any, delta: number) => {
  if (!location.capacity || location.capacity <= 0) return;

  const result = await InventoryModel.aggregate([
    { $match: { locationId: location._id } },
    { $group: { _id: null, total: { $sum: '$quantity' } } }
  ]);
  const currentTotal = result[0]?.total || 0;

  if (currentTotal + delta > location.capacity) {
    throw conflict(`Location capability exceeded. Max: ${location.capacity}, Current: ${currentTotal}, Adding: ${delta}`);
  }
};

const checkStocktakeLock = async (locationId: string | Types.ObjectId) => {
  const { StocktakeModel } = await import('../models/stocktake.model.js');
  const activeStocktake = await StocktakeModel.findOne({
    status: 'draft',
    'items.locationId': new Types.ObjectId(locationId)
  }).lean();
  if (activeStocktake) {
    throw conflict(`Vị trí ${locationId} đang bị khóa để kiểm kê (${activeStocktake.code}). Vui lòng hoàn tất hoặc hủy phiếu kiểm kê trước.`);
  }
};

export const adjustInventory = async (
  productId: string | Types.ObjectId,
  locationId: string | Types.ObjectId,
  delta: number,
  options?: { batch?: string | null; expDate?: Date | null; allowNegative?: boolean; status?: 'available' | 'reserved' | 'pending' | 'special' | 'quarantined'; ignoreLock?: boolean }
) => {
  if (!delta) return null;

  // Stocktake Locking Check
  if (!options?.ignoreLock) {
    await checkStocktakeLock(locationId);
  }

  const location = await ensureLocationExists(locationId);

  if (delta > 0) {
    await checkCapacity(location, delta);
  }

  const filter: Record<string, unknown> = {
    productId: new Types.ObjectId(productId),
    locationId: new Types.ObjectId(locationId),
    status: options?.status ?? 'available',
    batch: options?.batch ?? null
  };

  // Atomic Update Logic
  if (delta < 0 && !options?.allowNegative) {
    // Decrement: Ensure sufficient stock atomically
    const doc = await InventoryModel.findOneAndUpdate(
      {
        ...filter,
        quantity: { $gte: Math.abs(delta) } // Atomic check requirement
      },
      {
        $inc: { quantity: delta },
        // Set fields if they don't exist (though find query implies existence for decrement)
        $setOnInsert: {
          expDate: options?.expDate ?? null,
        }
      },
      { new: true }
    );

    if (!doc) {
      // Could be insufficient stock OR record doesn't exist
      const existing = await InventoryModel.findOne(filter);
      if (!existing || existing.quantity < Math.abs(delta)) {
        throw conflict('Insufficient stock');
      }
      throw conflict('Concurrent update conflict or Insufficient stock');
    }

    // Check low stock asynchronously
    checkLowStock(productId.toString()).catch(err => logger.warn('Low stock check failed', err));
    return doc;

  } else {
    // Increment or Allow Negative: Upsert
    const doc = await InventoryModel.findOneAndUpdate(
      filter,
      {
        $inc: { quantity: delta },
        $set: options?.expDate ? { expDate: options.expDate } : {},
        $setOnInsert: { created_at: new Date() } // Mongoose handles timestamps usually, but just in case
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Double check constraints if we allowed negative but result is unexpectedly weird? 
    // (Not strictly needed if allowNegative is true)

    checkLowStock(productId.toString()).catch(err => logger.warn('Low stock check failed', err));
    return doc;
  }
};

/**
 * Check if product stock is below minimum and send notifications
 */
export const checkLowStock = async (productId: string) => {
  try {
    const { ProductModel } = await import('../models/product.model.js');
    const product = await ProductModel.findById(new Types.ObjectId(productId));
    if (!product || !product.minStock) return;

    // Calculate total stock across all locations
    const totalQty = await InventoryModel.aggregate([
      { $match: { productId: new Types.ObjectId(productId) } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    const currentStock = totalQty[0]?.total || 0;

    if (currentStock < product.minStock) {
      // 1. Send notification
      const { UserModel } = await import('../models/user.model.js');
      const managers = await UserModel.find({ role: { $in: ['Admin', 'Manager'] } });
      const { createNotification } = await import('./notification.service.js');

      for (const manager of managers) {
        await createNotification({
          userId: (manager as any)._id.toString(),
          type: 'warning',
          title: 'Cảnh báo tồn kho thấp',
          message: `Sản phẩm ${product.name} (${product.sku}) còn ${currentStock}/${product.minStock}. Cần nhập thêm hàng.`
        });
      }

      // 2. AUTO-REPLENISHMENT: Create Draft Receipt
      try {
        const { ReceiptModel } = await import('../models/receipt.model.js');
        const existingDraft = await ReceiptModel.findOne({
          status: 'draft',
          'lines.productId': product._id,
          notes: { $regex: /Auto-replenishment/ }
        });

        if (!existingDraft) {
          const replenishQty = product.minStock * 2; // Replenishment strategy: 2x minStock
          const supplierId = product.supplierIds && product.supplierIds.length > 0 ? product.supplierIds[0] : null;

          await ReceiptModel.create({
            code: `AUTO-REP-${Date.now().toString().slice(-6)}`,
            date: new Date(),
            supplierId: supplierId,
            status: 'draft',
            lines: [{
              productId: product._id,
              qty: replenishQty,
              priceIn: (product as any).priceIn || 0
            }],
            notes: `[SYSTEM] Auto-replenishment for low stock (${currentStock}/${product.minStock})`
          });
          logger.info(`Auto-replenishment draft created for ${product.sku}`);
        }
      } catch (err) {
        logger.error('Auto-replenishment creation failed', err);
      }
    }
  } catch (e) {
    logger.warn('Failed to check low stock:', e);
  }
};

export const moveInventory = async (
  payload: { productId: string; fromLocation: string; toLocation: string; qty: number }
) => {
  if (payload.qty <= 0) {
    throw badRequest('Quantity must be greater than zero');
  }
  await adjustInventory(payload.productId, payload.fromLocation, -payload.qty);
  await adjustInventory(payload.productId, payload.toLocation, payload.qty);
  return true;
};

export const ensureStock = async (
  items: { productId: string; locationId: string; qty: number; batch?: string }[]
) => {
  for (const item of items) {
    const stock = await InventoryModel.findOne({
      productId: new Types.ObjectId(item.productId),
      locationId: new Types.ObjectId(item.locationId),
      status: 'available',
      batch: item.batch ?? null
    }).lean();
    if (!stock || stock.quantity < item.qty) {
      throw conflict('Insufficient stock', {
        productId: item.productId,
        locationId: item.locationId,
        required: item.qty,
        available: stock?.quantity ?? 0
      });
    }
  }
};

/**
 * Get expired inventory items
 */
export const getExpiredInventory = async () => {
  const now = new Date();

  const expiredItems = await InventoryModel.find({
    expDate: { $lt: now },
    quantity: { $gt: 0 }
  })
    .populate('productId', 'sku name')
    .populate('locationId', 'name code')
    .lean();

  return expiredItems.map(item => ({
    id: item._id.toString(),
    product: item.productId,
    location: item.locationId,
    batch: item.batch,
    expDate: item.expDate,
    quantity: item.quantity,
    daysExpired: Math.floor((now.getTime() - (item.expDate?.getTime() || 0)) / (1000 * 60 * 60 * 24))
  }));
};

/**
 * Get soon-to-expire inventory (within X days)
 */
export const getSoonToExpireInventory = async (daysThreshold = 30) => {
  const now = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  const soonToExpire = await InventoryModel.find({
    expDate: {
      $gte: now,
      $lte: thresholdDate
    },
    quantity: { $gt: 0 }
  })
    .populate('productId', 'sku name')
    .populate('locationId', 'name code')
    .lean();

  return soonToExpire.map(item => ({
    id: item._id.toString(),
    product: item.productId,
    location: item.locationId,
    batch: item.batch,
    expDate: item.expDate,
    quantity: item.quantity,
    daysUntilExpiry: Math.floor(((item.expDate?.getTime() || 0) - now.getTime()) / (1000 * 60 * 60 * 24))
  }));
};

/**
 * Send expiry alerts to managers
 */
export const sendExpiryAlerts = async () => {
  const expired = await getExpiredInventory();
  const soonToExpire = await getSoonToExpireInventory(7);

  if (expired.length === 0 && soonToExpire.length === 0) {
    return { sent: 0, message: 'No expiry alerts needed' };
  }

  const { UserModel } = await import('../models/user.model.js');
  const managers = await UserModel.find({
    role: { $in: ['Admin', 'Manager'] }
  });

  const { createNotification } = await import('./notification.service.js');
  let sentCount = 0;

  for (const manager of managers) {
    if (expired.length > 0) {
      await createNotification({
        userId: (manager as any)._id.toString(),
        type: 'error',
        title: 'Hàng hóa đã hết hạn',
        message: `Có ${expired.length} sản phẩm đã hết hạn. Cần xử lý ngay!`
      });
      sentCount++;
    }

    if (soonToExpire.length > 0) {
      await createNotification({
        userId: (manager as any)._id.toString(),
        type: 'warning',
        title: 'Cảnh báo sắp hết hạn',
        message: `Có ${soonToExpire.length} sản phẩm sắp hết hạn trong 7 ngày.`
      });
      sentCount++;
    }
  }

  return {
    sent: sentCount,
    expired: expired.length,
    soonToExpire: soonToExpire.length
  };
};

/**
 * Suggest best picking locations using FEFO (First Expired First Out)
 */
export const suggestPicking = async (productId: string, qty: number) => {
  const { getSetting } = await import('./setting.service.js');
  const minExpiryDays = await getSetting('inventory.minRemainingShelfLife', 30);
  const expiryThreshold = new Date();
  expiryThreshold.setDate(expiryThreshold.getDate() + minExpiryDays);

  const stock = await InventoryModel.find({
    productId: new Types.ObjectId(productId),
    status: 'available',
    quantity: { $gt: 0 },
    $or: [
      { expDate: { $gt: expiryThreshold } },
      { expDate: null }
    ]
  })
    .sort({ expDate: 1, createdAt: 1 }) // FEFO + FIFO
    .lean();

  const suggestions = [];
  let remaining = qty;

  for (const item of stock) {
    if (remaining <= 0) break;
    const take = Math.min(item.quantity, remaining);
    suggestions.push({
      locationId: item.locationId,
      batch: item.batch,
      qty: take
    });
    remaining -= take;
  }

  if (remaining > 0) {
    throw badRequest(`Không đủ hàng tồn tại kho để xuất (Thiếu ${remaining} đơn vị)`);
  }

  return suggestions;
};

/**
 * Move quantity from 'available' to 'reserved'
 */
export const reserveStock = async (productId: string, locationId: string, qty: number, batch?: string) => {
  await checkStocktakeLock(locationId);
  // 1. Check & Deduct from Available
  const doc = await InventoryModel.findOneAndUpdate(
    { productId: new Types.ObjectId(productId), locationId: new Types.ObjectId(locationId), status: 'available', batch: batch ?? null },
    { $inc: { quantity: -qty } },
    { new: true }
  );
  if (!doc || doc.quantity < 0) {
    if (doc) await InventoryModel.updateOne({ _id: doc._id }, { $inc: { quantity: qty } }); // rollback
    throw conflict(`Không đủ hàng 'có sẵn' để giữ tại vị trí ${locationId}`);
  }

  // 2. Add to Reserved
  const resDoc = await InventoryModel.findOneAndUpdate(
    { productId: new Types.ObjectId(productId), locationId: new Types.ObjectId(locationId), status: 'reserved', batch: batch ?? null },
    { $inc: { quantity: qty } },
    { upsert: true, new: true }
  );

  return { available: doc, reserved: resDoc };
};

/**
 * Move back from 'reserved' to 'available'
 */
export const releaseStock = async (productId: string, locationId: string, qty: number, batch?: string) => {
  await checkStocktakeLock(locationId);
  const doc = await InventoryModel.findOneAndUpdate(
    { productId: new Types.ObjectId(productId), locationId: new Types.ObjectId(locationId), status: 'reserved', batch: batch ?? null },
    { $inc: { quantity: -qty } },
    { new: true }
  );
  if (!doc || doc.quantity < 0) {
    if (doc) await InventoryModel.updateOne({ _id: doc._id }, { $inc: { quantity: qty } });
    throw badRequest(`Không thể giải phóng hàng giữ (Lỗi số lượng reserved)`);
  }

  const avDoc = await InventoryModel.findOneAndUpdate(
    { productId: new Types.ObjectId(productId), locationId: new Types.ObjectId(locationId), status: 'available', batch: batch ?? null },
    { $inc: { quantity: qty } },
    { upsert: true, new: true }
  );

  return { reserved: doc, available: avDoc };
};

export const exportInventoryExcel = async (query: InventoryQuery) => {
  const filter: Record<string, unknown> = {};
  if (query.productId) filter.productId = new Types.ObjectId(query.productId);
  if (query.locationId) filter.locationId = new Types.ObjectId(query.locationId);

  const items = await InventoryModel.find(filter)
    .populate('productId', 'sku name')
    .populate('locationId', 'name code')
    .lean();

  return items.map((item: any) => ({
    sku: item.productId?.sku || 'N/A',
    name: item.productId?.name || 'N/A',
    location: item.locationId?.code || 'N/A',
    quantity: item.quantity,
    status: item.status,
    batch: item.batch || '',
    expDate: item.expDate ? new Date(item.expDate).toLocaleDateString('vi-VN') : ''
  }));
};
/**
 * Move quantity from 'quarantined' to 'available' after QC approval
 */
export const releaseQuarantine = async (productId: string, locationId: string, qty: number, batch?: string) => {
  await checkStocktakeLock(locationId);

  // 1. Deduct from Quarantined
  const doc = await InventoryModel.findOneAndUpdate(
    { productId: new Types.ObjectId(productId), locationId: new Types.ObjectId(locationId), status: 'quarantined', batch: batch ?? null },
    { $inc: { quantity: -qty } },
    { new: true }
  );

  if (!doc || doc.quantity < 0) {
    if (doc) await InventoryModel.updateOne({ _id: doc._id }, { $inc: { quantity: qty } }); // rollback
    throw badRequest(`Không đủ hàng trong diện 'kiểm soát chất lượng' (quarantined) tại vị trí này`);
  }

  // 2. Add to Available
  await adjustInventory(productId, locationId, qty, { status: 'available', batch });

  logger.info(`Released ${qty} of ${productId} from quarantine at ${locationId}`);
  return true;
};
