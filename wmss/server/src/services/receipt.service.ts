import { Types } from 'mongoose';
import { ReceiptModel } from '../models/receipt.model.js';
import { logger } from '../utils/logger.js';
import { PartnerModel } from '../models/partner.model.js';
import { ProductModel } from '../models/product.model.js';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';
import { adjustInventory } from './inventory.service.js';
import { notifyResourceUpdate } from './socket.service.js';
import type { ReceiptStatus } from '@wms/shared';
import { WarehouseNodeModel } from '../models/warehouseNode.model.js';
import { InventoryModel } from '../models/inventory.model.js';

const allowedTransitions: Record<ReceiptStatus, ReceiptStatus[]> = {
  draft: ['approved', 'rejected'],
  approved: ['supplierConfirmed', 'rejected'],
  supplierConfirmed: ['completed'],
  completed: [],
  rejected: []
};

type ListQuery = {
  page?: string;
  limit?: string;
  sort?: string;
  status?: ReceiptStatus;
  supplierId?: string;
  query?: string;
};

export const listReceipts = async (query: ListQuery) => {
  const { page, limit, sort, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.supplierId) filter.supplierId = new Types.ObjectId(query.supplierId);
  if (query.query) filter.code = new RegExp(query.query, 'i');
  const [total, items] = await Promise.all([
    ReceiptModel.countDocuments(filter),
    ReceiptModel.find(filter)
      .populate('supplierId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
  ]);
  return buildPagedResponse(
    items.map((item) => ({
      id: item._id.toString(),
      code: item.code,
      supplier: item.supplierId,
      date: item.date,
      status: item.status,
      lines: item.lines,
      notes: item.notes,
      attachments: item.attachments
    })),
    total,
    { page, limit, sort, skip }
  );
};

export const getReceipt = async (id: string) => {
  const receipt = await ReceiptModel.findById(new Types.ObjectId(id))
    .populate('supplierId', 'name code address contact')
    .populate('lines.productId', 'sku name unit')
    .lean();
  if (!receipt) {
    throw notFound('Receipt not found');
  }

  const supplier = receipt.supplierId as any;
  const lines = (receipt.lines || []).map((line: any) => {
    const product = line.productId as any;
    const productId = product?._id?.toString?.() ?? product?.toString?.() ?? line.productId?.toString?.();
    return {
      ...line,
      locationId: line.locationId?.toString?.() ?? line.locationId ?? undefined,
      productId,
      sku: product?.sku ?? line.sku,
      productName: product?.name ?? line.productName
    };
  });

  const total = lines.reduce(
    (sum: number, line: any) => sum + (Number(line.qty) || 0) * (Number(line.priceIn) || 0),
    0
  );

  return {
    id: receipt._id.toString(),
    code: receipt.code,
    supplierId: supplier?._id?.toString?.() ?? receipt.supplierId?.toString?.(),
    supplier,
    supplierName: supplier?.name,
    date: receipt.date,
    status: receipt.status,
    lines,
    notes: receipt.notes,
    rejectedNote: receipt.rejectedNote,
    attachments: receipt.attachments,
    total
  };
};

const validateLocations = async (lines: { locationId?: string }[]) => {
  const rawIds = lines.map((line) => line.locationId).filter(Boolean) as string[];
  const uniqueIds = [...new Set(rawIds)];
  if (uniqueIds.length === 0) return;

  const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));
  const locations = await WarehouseNodeModel.find({ _id: { $in: objectIds } })
    .select('type')
    .lean();
  if (locations.length !== uniqueIds.length) {
    throw notFound('Location not found');
  }
  const invalid = locations.find((loc) => loc.type !== 'bin');
  if (invalid) {
    throw badRequest('Location must be a bin');
  }
};

const ensureCapacityAvailable = async (
  lines: { locationId?: string; qty: number }[]
) => {
  const requestedByLocation = new Map<string, number>();
  lines.forEach((line) => {
    if (!line.locationId) return;
    const current = requestedByLocation.get(line.locationId) || 0;
    requestedByLocation.set(line.locationId, current + line.qty);
  });

  const locationIds = [...requestedByLocation.keys()];
  if (locationIds.length === 0) {
    throw badRequest('Location is required for receipt lines');
  }

  const locations = await WarehouseNodeModel.find({ _id: { $in: locationIds } })
    .select('capacity')
    .lean();
  const capacityMap = new Map(
    locations.map((loc) => [loc._id.toString(), loc.capacity || 0])
  );

  for (const [locationId, requestQty] of requestedByLocation.entries()) {
    const capacity = capacityMap.get(locationId) || 0;
    if (capacity <= 0) continue;

    const total = await InventoryModel.aggregate([
      { $match: { locationId: new Types.ObjectId(locationId) } },
      { $group: { _id: null, totalQty: { $sum: '$quantity' } } }
    ]);
    const currentQty = total[0]?.totalQty || 0;
    if (currentQty + requestQty > capacity) {
      throw conflict(
        `Location capacity exceeded. Max: ${capacity}, Current: ${currentQty}, Adding: ${requestQty}`
      );
    }
  }
};

const validateExpiryDates = (
  lines: { expDate?: Date; productId: string }[],
  receiptDate: Date
) => {
  const receiptTime = receiptDate.getTime();
  for (const line of lines) {
    if (!line.expDate) continue;
    if (line.expDate.getTime() < receiptTime) {
      throw badRequest(`Expiry date must be on or after receipt date for product ${line.productId}`);
    }
  }
};

export const createReceipt = async (
  payload: {
    code: string;
    supplierId: string;
    date: Date;
    lines: { productId: string; qty: number; priceIn: number; locationId?: string; batch?: string; expDate?: Date }[];
    notes?: string;
    attachments?: string[];
  },
  actorId: string
) => {
  const supplier = await PartnerModel.findOne({
    _id: new Types.ObjectId(payload.supplierId),
    type: 'supplier'
  }).lean();
  if (!supplier) {
    throw badRequest('Supplier not found');
  }
  const existing = await ReceiptModel.findOne({ code: payload.code }).lean();
  if (existing) {
    throw conflict('Receipt code already exists');
  }
  for (const line of payload.lines) {
    const product = await ProductModel.findById(new Types.ObjectId(line.productId)).lean();
    if (!product) {
      throw notFound('Product not found');
    }
    if (line.qty <= 0) {
      throw badRequest('Quantity must be positive');
    }
  }
  await validateLocations(payload.lines);
  await ensureCapacityAvailable(payload.lines);
  validateExpiryDates(payload.lines, payload.date);

  const lines = await Promise.all(payload.lines.map(async (line) => {
    let locationId = line.locationId;
    if (!locationId) {
      const suggested = await import('./warehouse.service.js').then(s => s.suggestPutAway(line.productId, line.qty));
      if (suggested) locationId = suggested;
    }
    return {
      productId: new Types.ObjectId(line.productId),
      qty: line.qty,
      priceIn: line.priceIn,
      locationId: locationId ? new Types.ObjectId(locationId) : undefined,
      batch: line.batch?.trim() || undefined,
      expDate: line.expDate
    };
  }));
  const receipt = await ReceiptModel.create({
    ...payload,
    lines,
    supplierId: supplier._id,
    attachments: payload.attachments ?? []
  });
  await recordAudit({
    action: 'receipt.created',
    entity: 'Receipt',
    entityId: receipt._id,
    actorId,
    payload: {
      code: receipt.code,
      status: receipt.status,
      totalLines: receipt.lines.length
    }
  });

  notifyResourceUpdate('receipt', 'create', receipt);
  notifyResourceUpdate('dashboard', 'refresh'); // Update counters

  return receipt.toObject();
};

export const updateReceipt = async (
  id: string,
  payload: Partial<{
    date: Date;
    lines: { productId: string; qty: number; priceIn: number; locationId?: string; batch?: string; expDate?: Date }[];
    notes?: string;
    attachments?: string[];
  }>,
  actorId: string
) => {
  const receipt = await ReceiptModel.findById(new Types.ObjectId(id));
  if (!receipt) {
    throw notFound('Receipt not found');
  }
  if (receipt.status !== 'draft') {
    throw badRequest('Only draft receipts can be updated');
  }
  if (payload.date) receipt.date = payload.date;
  if (payload.notes !== undefined) receipt.notes = payload.notes;
  if (payload.attachments) receipt.attachments = payload.attachments;
  if (payload.lines) {
    await validateLocations(payload.lines);
    await ensureCapacityAvailable(payload.lines);
    const effectiveDate = payload.date ?? receipt.date;
    validateExpiryDates(payload.lines, effectiveDate);
    for (const line of payload.lines) {
      if (line.qty <= 0) {
        throw badRequest('Quantity must be positive');
      }
      const product = await ProductModel.findById(new Types.ObjectId(line.productId)).lean();
      if (!product) {
        throw notFound('Product not found');
      }
    }
    receipt.lines = await Promise.all(payload.lines.map(async (line) => {
      let locationId = line.locationId;
      if (!locationId) {
        const suggested = await import('./warehouse.service.js').then(s => s.suggestPutAway(line.productId, line.qty));
        if (suggested) locationId = suggested;
      }
      return {
        productId: new Types.ObjectId(line.productId),
        qty: line.qty,
        priceIn: line.priceIn,
        locationId: locationId ? new Types.ObjectId(locationId) : undefined,
        batch: line.batch?.trim() || undefined,
        expDate: line.expDate
      };
    }));
  }
  await receipt.save();
  await recordAudit({
    action: 'receipt.updated',
    entity: 'Receipt',
    entityId: receipt._id,
    actorId,
    payload
  });

  notifyResourceUpdate('receipt', 'update', receipt);

  return receipt.toObject();
};

const ensureTransition = (current: ReceiptStatus, target: ReceiptStatus) => {
  const allowed = allowedTransitions[current] ?? [];
  if (!allowed.includes(target)) {
    throw badRequest(`Transition from ${current} to ${target} is not allowed`);
  }
};

export const transitionReceipt = async (
  id: string,
  target: ReceiptStatus,
  actorId: string,
  note?: string
) => {
  const receipt = await ReceiptModel.findById(new Types.ObjectId(id));
  if (!receipt) {
    throw notFound('Receipt not found');
  }
  ensureTransition(receipt.status, target);

  if (target === 'rejected') {
    const trimmed = typeof note === 'string' ? note.trim() : '';
    receipt.rejectedNote = trimmed || undefined;
  }

  if (target === 'completed') {
    const { ProductModel } = await import('../models/product.model.js');
    const { SerialModel } = await import('../models/serial.model.js');

    for (const line of receipt.lines) {
      if (!line.locationId) {
        throw badRequest('Location is required to complete receipt');
      }
    }

    for (const line of receipt.lines) {
      const product = await ProductModel.findById(line.productId);
      if (!product) throw notFound(`Product ${line.productId} not found`);

      const locationId = line.locationId?.toString() as string;

      // If product managed by serial, validate and create serials
      if (product.manageBySerial) {
        const serials = line.serials || [];
        if (serials.length !== line.qty) {
          throw badRequest(`Sản phẩm ${product.name} yêu cầu ${line.qty} số serial, nhưng chỉ nhận được ${serials.length}`);
        }

        // Check for duplicate serials in DB
        const existing = await SerialModel.find({ serialNumber: { $in: serials } }).lean();
        if (existing.length > 0) {
          throw conflict(`Các số serial sau đã tồn tại: ${existing.map(s => s.serialNumber).join(', ')}`);
        }

        // Create serials
        await SerialModel.insertMany(serials.map(sn => ({
          serialNumber: sn,
          productId: product._id,
          locationId: new Types.ObjectId(locationId),
          status: 'in_stock',
          batch: line.batch,
          receiptId: receipt._id
        })));
      }

      const inventoryStatus = product.requiresQC ? 'quarantined' : 'available';
      await adjustInventory(line.productId.toString(), locationId, line.qty, {
        status: inventoryStatus,
        batch: line.batch,
        expDate: line.expDate
      });

      if (product.requiresQC) {
        logger.info(`Product ${product.sku} requires QC. Added to quarantined stock.`);
      }

      // --- CROSS-DOCKING SUGGESTION ---
      try {
        const { DeliveryModel } = await import('../models/delivery.model.js');
        const pendingDeliveries = await DeliveryModel.find({
          status: { $in: ['draft', 'approved'] },
          'lines.productId': line.productId
        }).lean();

        if (pendingDeliveries.length > 0) {
          const { createNotification } = await import('./notification.service.js');
          const { UserModel } = await import('../models/user.model.js');
          const managers = await UserModel.find({ role: { $in: ['Admin', 'Manager'] } });

          for (const manager of managers) {
            await createNotification({
              userId: (manager as any)._id.toString(),
              type: 'info',
              title: 'Gợi ý Cross-docking',
              message: `Sản phẩm ${product.name} vừa được nhập kho (${line.qty}) hiện đang có ${pendingDeliveries.length} đơn hàng chờ xuất. Cân nhắc chuyển thẳng ra khu vực xuất hàng.`
            });
          }
        }
      } catch (cdErr) {
        logger.warn('Cross-docking check failed:', cdErr);
      }
    }

    // Auto-create Payment/Expense Transaction
    // Calculate total amount
    const totalAmount = receipt.lines.reduce((sum, line) => sum + (line.qty * line.priceIn), 0);

    // We assume 'completed' means we have incurred this expense. 
    // Ideally user decides if it's 'paid' or 'pending', but for MVP we log it as an expense.
    const { createTransaction } = await import('./transaction.service.js');
    await createTransaction({
      partnerId: receipt.supplierId.toString(),
      type: 'expense',
      amount: totalAmount,
      status: 'completed', // or pending payment
      referenceId: (receipt as any)._id.toString(),
      referenceType: 'Receipt',
      note: `Auto-generated expense for Receipt ${receipt.code}`
    }, actorId);

    // Auto-create Incident for shortages
    const shortageLines = receipt.lines.filter(line => {
      const actualQty = (line as any).actualQuantity ?? line.qty;
      return actualQty < line.qty;
    });

    if (shortageLines.length > 0) {
      try {
        const { IncidentModel } = await import('../models/incident.model.js');
        await IncidentModel.create({
          type: 'shortage',
          refType: 'receipt',
          refId: receipt._id,
          status: 'open',
          lines: shortageLines.map(line => ({
            productId: line.productId,
            quantity: line.qty - ((line as any).actualQuantity ?? line.qty)
          })),
          note: `Tự động tạo từ phiếu nhập ${receipt.code}: Phát hiện thiếu hàng`,
          action: 'replenish',
          createdBy: new Types.ObjectId(actorId)
        });

        // Send shortage notification
        const { createNotification } = await import('./notification.service.js');
        await createNotification({
          userId: actorId,
          type: 'warning',
          title: 'Phát hiện thiếu hàng',
          message: `Phiếu nhập ${receipt.code} có ${shortageLines.length} sản phẩm thiếu. Đã tạo phiếu sự cố tự động.`
        });
      } catch (e) {
        console.warn('Failed to create shortage incident:', e);
      }
    }
  }

  receipt.status = target;
  await receipt.save();

  await recordAudit({
    action: `receipt.${target}`,
    entity: 'Receipt',
    entityId: receipt._id,
    actorId,
    payload: { status: target, rejectedNote: receipt.rejectedNote }
  });

  // Create notification
  const { createNotification } = await import('./notification.service.js');
  await createNotification({
    userId: actorId,
    type: 'success',
    title: 'Receipt Completed',
    message: `Receipt ${receipt.code} has been fully processed and added to inventory.`,
  });

  notifyResourceUpdate('receipt', 'update', receipt);
  notifyResourceUpdate('dashboard', 'refresh');
  if (target === 'completed') {
    notifyResourceUpdate('inventory', 'update');
  }

  return receipt.toObject();
};

export const deleteReceipt = async (id: string, actorId: string) => {
  const receipt = await ReceiptModel.findById(new Types.ObjectId(id));
  if (!receipt) {
    throw notFound('Receipt not found');
  }
  if (receipt.status !== 'draft') {
    throw badRequest('Only draft receipts can be deleted');
  }
  await ReceiptModel.deleteOne({ _id: receipt._id });
  await recordAudit({
    action: 'receipt.deleted',
    entity: 'Receipt',
    entityId: receipt._id,
    actorId,
    payload: { code: receipt.code }
  });

  notifyResourceUpdate('receipt', 'delete', { id });
  notifyResourceUpdate('dashboard', 'refresh');

  return true;
};

export const exportReceiptsExcel = async (query: ListQuery & { startDate?: string; endDate?: string }) => {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.supplierId) filter.supplierId = new Types.ObjectId(query.supplierId);

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) (filter.date as any).$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      (filter.date as any).$lte = end;
    }
  }

  const items = await ReceiptModel.find(filter)
    .populate('supplierId', 'name')
    .sort({ date: -1 })
    .lean();

  return items.map((item: any) => ({
    code: item.code,
    supplier: item.supplierId?.name || 'N/A',
    date: new Date(item.date).toLocaleDateString('vi-VN'),
    status: item.status,
    totalLines: item.lines.length,
    totalQty: item.lines.reduce((sum: number, l: any) => sum + l.qty, 0),
    notes: item.notes || ''
  }));
};
