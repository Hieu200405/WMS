import { Types } from 'mongoose';
import { ReturnModel, type ReturnDocument } from '../models/return.model.js';
import { ProductModel } from '../models/product.model.js';
import { DisposalModel } from '../models/disposal.model.js';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';
import { adjustInventory } from './inventory.service.js';
import { resolveDefaultBin } from './warehouse.service.js';
import { env } from '../config/env.js';
import type { ReturnStatus } from '@wms/shared';
import { DeliveryModel } from '../models/delivery.model.js';
import { ReceiptModel } from '../models/receipt.model.js';
import { WarehouseNodeModel } from '../models/warehouseNode.model.js';

const allowedTransitions: Record<ReturnStatus, ReturnStatus[]> = {
  draft: ['approved'],
  approved: ['inspected', 'completed'],
  inspected: ['completed'],
  completed: []
};

const ensureBinLocation = async (locationId: string) => {
  const location = await WarehouseNodeModel.findOne({
    _id: new Types.ObjectId(locationId),
    type: 'bin'
  }).lean();
  if (!location) {
    throw badRequest('Location not found');
  }
  return location;
};

type ListQuery = {
  page?: string;
  limit?: string;
  sort?: string;
  status?: ReturnStatus;
  query?: string;
  from?: 'customer' | 'supplier';
};

export const listReturns = async (query: ListQuery) => {
  const { page, limit, sort, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.from) filter.from = query.from;
  if (query.query) filter.code = new RegExp(query.query, 'i');
  const [total, items] = await Promise.all([
    ReturnModel.countDocuments(filter),
    ReturnModel.find(filter).sort(sort).skip(skip).limit(limit).lean()
  ]);
  const customerRefIds = items
    .filter((item) => item.from === 'customer' && item.refId)
    .map((item) => item.refId as Types.ObjectId);
  const supplierRefIds = items
    .filter((item) => item.from === 'supplier' && item.refId)
    .map((item) => item.refId as Types.ObjectId);
  const [deliveryRefs, receiptRefs] = await Promise.all([
    customerRefIds.length
      ? DeliveryModel.find({ _id: { $in: customerRefIds } })
        .select('code customerId date')
        .populate('customerId', 'name')
        .lean()
      : Promise.resolve([]),
    supplierRefIds.length
      ? ReceiptModel.find({ _id: { $in: supplierRefIds } })
        .select('code supplierId date')
        .populate('supplierId', 'name')
        .lean()
      : Promise.resolve([])
  ]);
  const deliveryMap = new Map(
    deliveryRefs.map((ref: any) => [ref._id.toString(), ref])
  );
  const receiptMap = new Map(
    receiptRefs.map((ref: any) => [ref._id.toString(), ref])
  );
  return buildPagedResponse(
    items.map((item) => ({
      refId: item.refId?.toString() ?? null,
      refCode:
        item.from === 'customer'
          ? deliveryMap.get(item.refId?.toString() ?? '')?.code ?? null
          : receiptMap.get(item.refId?.toString() ?? '')?.code ?? null,
      refDate:
        item.from === 'customer'
          ? deliveryMap.get(item.refId?.toString() ?? '')?.date ?? null
          : receiptMap.get(item.refId?.toString() ?? '')?.date ?? null,
      refCustomerName:
        item.from === 'customer'
          ? deliveryMap.get(item.refId?.toString() ?? '')?.customerId?.name ?? null
          : receiptMap.get(item.refId?.toString() ?? '')?.supplierId?.name ?? null,
      createdAt: item.createdAt,
      id: item._id.toString(),
      code: item.code,
      from: item.from,
      status: item.status,
      items: item.items,
      disposalId: item.disposalId?.toString() ?? null
    })),
    total,
    { page, limit, sort, skip }
  );
};


const validateReturnQuantities = async (
  refId: string,
  from: 'customer' | 'supplier',
  newItems: { productId: string; qty: number }[]
) => {
  // 1. Fetch Original Document
  let originalLines: { productId: Types.ObjectId; qty: number }[] = [];

  if (from === 'customer') {
    const doc = await DeliveryModel.findById(new Types.ObjectId(refId)).lean();
    if (!doc) throw notFound('Original Delivery not found');
    // Check delivery must be completed before creating return
    if (doc.status !== 'completed') {
      throw badRequest('Chỉ được tạo phiếu trả hàng cho phiếu xuất đã hoàn tất. Vui lòng hoàn tất phiếu xuất trước.');
    }
    originalLines = doc.lines.map(l => ({ productId: l.productId, qty: l.qty }));
  } else {
    const doc = await ReceiptModel.findById(new Types.ObjectId(refId)).lean();
    if (!doc) throw notFound('Original Receipt not found');
    // Check receipt must be completed before creating return
    if (doc.status !== 'completed') {
      throw badRequest('Chỉ được tạo phiếu trả hàng cho phiếu nhập đã hoàn tất. Vui lòng hoàn tất phiếu nhập trước.');
    }
    originalLines = doc.lines.map(l => ({ productId: l.productId, qty: l.qty }));
  }

  // 2. Fetch History of Returns for this Ref
  const previousReturns = await ReturnModel.find({
    refId: new Types.ObjectId(refId),
    status: { $ne: 'rejected' } // Count all valid returns
  }).lean();

  // 3. Calculate already returned qty per product
  const returnedMap = new Map<string, number>();
  previousReturns.forEach(ret => {
    ret.items.forEach(item => {
      const pid = item.productId.toString();
      returnedMap.set(pid, (returnedMap.get(pid) || 0) + item.qty);
    });
  });

  // 4. Validate new items
  for (const item of newItems) {
    const pid = item.productId;
    const originalLine = originalLines.find(l => l.productId.toString() === pid);

    if (!originalLine) {
      throw badRequest(`Product ${pid} was not part of the original transaction`);
    }

    const purchasedQty = originalLine.qty;
    const previouslyReturned = returnedMap.get(pid) || 0;
    const currentReturn = item.qty;

    if (previouslyReturned + currentReturn > purchasedQty) {
      throw badRequest(
        `Return quantity (${currentReturn}) + Previous returns (${previouslyReturned}) exceeds purchased quantity (${purchasedQty}) for product ${pid}`
      );
    }
  }
};

export const createReturn = async (
  payload: {
    code: string;
    from: 'customer' | 'supplier';
    refId?: string;
    items: { productId: string; locationId: string; batch?: string | null; qty: number; reason: string; expDate?: Date }[];
  },
  actorId: string
) => {
  const existing = await ReturnModel.findOne({ code: payload.code }).lean();
  if (existing) {
    throw conflict('Return code already exists');
  }

  if (payload.refId) {
    await validateReturnQuantities(payload.refId, payload.from, payload.items);
  }

  for (const item of payload.items) {
    if (item.qty <= 0) {
      throw badRequest('Quantity must be positive');
    }
    const batch = item.batch?.trim();
    item.batch = batch || null;
    const product = await ProductModel.findById(new Types.ObjectId(item.productId)).lean();
    if (!product) {
      throw notFound('Product not found');
    }
    await ensureBinLocation(item.locationId);
  }
  const returnDoc = await ReturnModel.create({
    ...payload,
    refId: payload.refId ? new Types.ObjectId(payload.refId) : undefined
  });
  await recordAudit({
    action: 'return.created',
    entity: 'Return',
    entityId: returnDoc._id,
    actorId,
    payload: { code: returnDoc.code, from: returnDoc.from }
  });
  return returnDoc.toObject();
};

export const updateReturn = async (
  id: string,
  payload: Partial<{
    items: { productId: string; locationId: string; batch?: string | null; qty: number; reason: string; expDate?: Date }[];
  }>,
  actorId: string
) => {
  const returnDoc = await ReturnModel.findById(new Types.ObjectId(id));
  if (!returnDoc) {
    throw notFound('Return not found');
  }
  if (returnDoc.status !== 'draft') {
    throw badRequest('Only draft returns can be updated');
  }
  if (payload.items) {
    for (const item of payload.items) {
      if (item.qty <= 0) {
        throw badRequest('Quantity must be positive');
      }
      const product = await ProductModel.findById(new Types.ObjectId(item.productId)).lean();
      if (!product) {
        throw notFound('Product not found');
      }
      await ensureBinLocation(item.locationId);
    }
    returnDoc.items = payload.items.map((item) => ({
      productId: new Types.ObjectId(item.productId),
      locationId: new Types.ObjectId(item.locationId),
      batch: item.batch?.trim() || null,
      qty: item.qty,
      reason: item.reason,
      expDate: item.expDate
    }));
  }
  await returnDoc.save();
  await recordAudit({
    action: 'return.updated',
    entity: 'Return',
    entityId: returnDoc._id,
    actorId,
    payload
  });
  return returnDoc.toObject();
};

const ensureTransition = (current: ReturnStatus, target: ReturnStatus) => {
  const allowed = allowedTransitions[current] ?? [];
  if (!allowed.includes(target)) {
    throw badRequest(`Transition from ${current} to ${target} is not allowed`);
  }
};

const createDisposalForExpired = async (
  returnDoc: ReturnDocument,
  items: { productId: string; locationId: string; batch: string | null; qty: number; reason: string; price: number }[],
  actorId: string
) => {
  if (!items.length) {
    return null;
  }
  const totalValue = items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const boardRequired = totalValue > env.highValueDisposalThreshold;
  const disposal = await DisposalModel.create({
    code: `DSP-${returnDoc.code}`,
    reason: 'expired',
    totalValue,
    boardRequired,
    boardMembers: boardRequired ? [] : undefined,
    status: boardRequired ? 'draft' : 'approved',
    items: items.map((item) => ({
      productId: new Types.ObjectId(item.productId),
      locationId: new Types.ObjectId(item.locationId),
      qty: item.qty,
      value: item.price * item.qty
    }))
  });
  await recordAudit({
    action: 'disposal.autoCreated',
    entity: 'Disposal',
    entityId: disposal._id,
    actorId,
    payload: { returnId: returnDoc._id }
  });
  return disposal;
};

export const transitionReturn = async (
  id: string,
  target: ReturnStatus,
  actorId: string
) => {
  const returnDoc = await ReturnModel.findById(new Types.ObjectId(id));
  if (!returnDoc) {
    throw notFound('Return not found');
  }
  ensureTransition(returnDoc.status as ReturnStatus, target);

  if (target === 'completed') {
    const defaultBin = await resolveDefaultBin();
    const itemsToDispose: { productId: string; locationId: string; batch: string | null; qty: number; reason: string; price: number }[] = [];

    for (const item of returnDoc.items) {
      const product = await ProductModel.findById(item.productId);
      if (!product) throw notFound('Product not found');

      if (!item.locationId) {
        item.locationId = new Types.ObjectId(defaultBin);
      }
      const locationId = item.locationId?.toString?.() ?? defaultBin;
      const batch = item.batch ?? null;
      const isExpired = item.expDate ? item.expDate < new Date() : false;
      const restockableQty = item.restockQty ?? (isExpired ? 0 : item.qty);
      const disposalQty = item.disposeQty ?? (isExpired ? item.qty : 0);

      if (returnDoc.from === 'customer') {
        // 1. Phục hồi tồn kho khả dụng
        if (restockableQty > 0) {
          await adjustInventory(item.productId.toString(), locationId, restockableQty, { status: 'available', batch });
        }
        // 2. Tạm nhập hàng lỗi/hết hạn để chờ hủy
        if (disposalQty > 0) {
          await adjustInventory(item.productId.toString(), locationId, disposalQty, { status: 'quarantined', batch });
          itemsToDispose.push({
            productId: item.productId.toString(),
            locationId,
            batch,
            qty: disposalQty,
            reason: item.reason || 'damaged/expired',
            price: product.priceIn
          });
        }
      } else {
        // Trả hàng về NCC (Supplier Return) - Xuất kho
        await adjustInventory(item.productId.toString(), locationId, -item.qty, { batch });
      }
    }

    if (itemsToDispose.length) {
      const disposal = await createDisposalForExpired(returnDoc, itemsToDispose, actorId);
      returnDoc.disposalId = disposal ? (disposal._id as Types.ObjectId) : null;
    }
  }

  returnDoc.status = target;
  await returnDoc.save();
  await recordAudit({
    action: `return.${target}`,
    entity: 'Return',
    entityId: returnDoc._id,
    actorId,
    payload: { status: target, disposalId: returnDoc.disposalId }
  });

  if (target === 'completed') {
    try {
      const { createTransaction } = await import('./transaction.service.js');
      let partnerId = null;
      let amount = 0;

      for (const item of returnDoc.items) {
        const p = await ProductModel.findById(item.productId);
        if (p) amount += item.qty * (returnDoc.from === 'customer' ? p.priceOut : p.priceIn);
      }

      if (returnDoc.refId) {
        if (returnDoc.from === 'customer') {
          const { DeliveryModel } = await import('../models/delivery.model.js');
          const d = await DeliveryModel.findById(returnDoc.refId);
          if (d) partnerId = d.customerId;
        } else {
          const { ReceiptModel } = await import('../models/receipt.model.js');
          const r = await ReceiptModel.findById(returnDoc.refId);
          if (r) partnerId = r.supplierId;
        }
      }

      if (partnerId && amount > 0) {
        await createTransaction({
          partnerId: partnerId.toString(),
          type: returnDoc.from === 'customer' ? 'refund' : 'income',
          amount: amount,
          status: 'completed',
          referenceId: (returnDoc as any)._id.toString(),
          referenceType: 'Return',
          note: `Auto-generated for Return ${returnDoc.code}`
        }, actorId);
      }
    } catch (e) {
      console.error("Auto-transaction failed", e);
    }
  }

  return returnDoc.toObject();
};

/**
 * QC Inspection - Inspect return items and mark as approved/rejected
 */
export const inspectReturn = async (
  id: string,
  payload: {
    items: Array<{
      index: number;
      qcStatus: 'approved' | 'rejected';
      qcNotes?: string;
      restockQty?: number;
      disposeQty?: number;
    }>;
    qcNotes?: string;
  },
  actorId: string
) => {
  const returnDoc = await ReturnModel.findById(new Types.ObjectId(id));
  if (!returnDoc) {
    throw notFound('Return not found');
  }

  if (returnDoc.status !== 'approved') {
    throw badRequest('Only approved returns can be inspected');
  }

  // Update each item with QC results
  payload.items.forEach((itemUpdate) => {
    if (itemUpdate.index >= 0 && itemUpdate.index < returnDoc.items.length) {
      const item = returnDoc.items[itemUpdate.index];
      item.qcStatus = itemUpdate.qcStatus;
      item.qcNotes = itemUpdate.qcNotes;
      item.restockQty = itemUpdate.restockQty || 0;
      item.disposeQty = itemUpdate.disposeQty || 0;
    }
  });

  // Update return-level QC info
  returnDoc.qcInspectedBy = new Types.ObjectId(actorId);
  returnDoc.qcInspectedAt = new Date();
  returnDoc.qcNotes = payload.qcNotes;

  await returnDoc.save();

  await recordAudit({
    action: 'return.inspected',
    entity: 'Return',
    entityId: returnDoc._id,
    actorId,
    payload: { qcResults: payload.items }
  });

  return returnDoc.toObject();
};

/**
 * Auto-Restock - Create adjustment and update inventory for approved items
 */
export const restockReturn = async (id: string, actorId: string) => {
  const returnDoc = await ReturnModel.findById(new Types.ObjectId(id));
  if (!returnDoc) {
    throw notFound('Return not found');
  }

  if (!returnDoc.qcInspectedBy) {
    throw badRequest('Return must be inspected before restocking');
  }

  // Get approved items for restock
  const approvedItems = returnDoc.items.filter(
    (item) => item.qcStatus === 'approved' && (item.restockQty || 0) > 0
  );

  if (approvedItems.length === 0) {
    throw badRequest('No approved items to restock');
  }

  // Create adjustment
  const { AdjustmentModel } = await import('../models/adjustment.model.js');
  const defaultBin = await resolveDefaultBin();

  const adjustment = await AdjustmentModel.create({
    code: `ADJ-RET-${returnDoc.code}`,
    reason: 'mismatch',
    lines: approvedItems.map((item) => ({
      productId: item.productId,
      locationId: new Types.ObjectId(item.locationId || defaultBin),
      batch: item.batch ?? null,
      delta: item.restockQty || 0
    })),
    status: 'draft',
    createdBy: new Types.ObjectId(actorId)
  });

  // Apply adjustment to inventory
  for (const line of adjustment.lines) {
    await adjustInventory(
      line.productId.toString(),
      line.locationId.toString(),
      line.delta,
      { batch: line.batch ?? null }
    );
  }

  // Mark adjustment as completed
  adjustment.status = 'completed';
  await adjustment.save();

  // Link adjustment to return
  returnDoc.adjustmentId = adjustment._id as Types.ObjectId;
  await returnDoc.save();

  await recordAudit({
    action: 'return.restocked',
    entity: 'Return',
    entityId: returnDoc._id,
    actorId,
    payload: { adjustmentId: adjustment._id }
  });

  return {
    return: returnDoc.toObject(),
    adjustment: adjustment.toObject()
  };
};

/**
 * Process Refund - Create refund transaction for customer returns
 */
export const processRefund = async (
  id: string,
  refundAmount: number,
  actorId: string
) => {
  const returnDoc = await ReturnModel.findById(new Types.ObjectId(id))
    .populate('refId');

  if (!returnDoc) {
    throw notFound('Return not found');
  }

  if (returnDoc.from !== 'customer') {
    throw badRequest('Only customer returns can be refunded');
  }

  if (!returnDoc.refId) {
    throw badRequest('Return must have reference to original delivery');
  }

  // Get customer ID from original delivery
  const { DeliveryModel } = await import('../models/delivery.model.js');
  const delivery = await DeliveryModel.findById(returnDoc.refId);

  if (!delivery) {
    throw notFound('Original delivery not found');
  }

  const customerId = delivery.customerId;

  // Create refund transaction
  const { createTransaction } = await import('./transaction.service.js');
  const refundTxn = await createTransaction(
    {
      partnerId: customerId.toString(),
      type: 'refund',
      amount: refundAmount,
      status: 'completed',
      referenceId: id,
      referenceType: 'Return',
      note: `Refund for return ${returnDoc.code}`
    },
    actorId
  );

  // Link refund to return
  returnDoc.refundTransactionId = (refundTxn as any)._id;
  await returnDoc.save();

  await recordAudit({
    action: 'return.refunded',
    entity: 'Return',
    entityId: returnDoc._id,
    actorId,
    payload: { refundAmount, transactionId: (refundTxn as any)._id }
  });

  return {
    return: returnDoc.toObject(),
    refund: refundTxn
  };
};

export const deleteReturn = async (id: string, actorId: string) => {
  const returnDoc = await ReturnModel.findById(new Types.ObjectId(id));
  if (!returnDoc) {
    throw notFound('Return not found');
  }
  if (returnDoc.status !== 'draft') {
    throw badRequest('Only draft returns can be deleted');
  }
  await ReturnModel.deleteOne({ _id: returnDoc._id });
  await recordAudit({
    action: 'return.deleted',
    entity: 'Return',
    entityId: returnDoc._id,
    actorId,
    payload: { code: returnDoc.code }
  });
  return true;
};


