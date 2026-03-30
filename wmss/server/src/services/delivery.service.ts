import { Types } from 'mongoose';
import { DeliveryModel } from '../models/delivery.model.js';
import { logger } from '../utils/logger.js';
import { PartnerModel } from '../models/partner.model.js';
import { ProductModel } from '../models/product.model.js';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';
import { adjustInventory, ensureStock, reserveStock, releaseStock } from './inventory.service.js';
import { notifyResourceUpdate } from './socket.service.js';
import type { DeliveryStatus } from '@wms/shared';
import { getSetting } from './setting.service.js';

const allowedTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
  draft: ['approved', 'cancelled', 'rejected'],
  approved: ['prepared', 'cancelled', 'rejected'],
  prepared: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  rejected: []
};

const validateDeliveryRules = async (deliveryData: any, customer: any, isUpdate = false) => {
  const customerType = customer.customerType || 'Individual';
  const maxQty = await getSetting(`delivery.limit.${customerType.toLowerCase()}`, customerType === 'Corporate' ? 1000 : 50);
  const slaDays = await getSetting(`delivery.sla.${customerType.toLowerCase()}`, customerType === 'Corporate' ? 7 : 2);

  // 1. Total quantity validation
  const totalQty = deliveryData.lines.reduce((sum: number, line: any) => sum + line.qty, 0);
  if (totalQty > maxQty) {
    throw badRequest(`Total quantity (${totalQty}) exceeds the limit for ${customerType} customers (${maxQty})`);
  }

  // 2. SLA validation: Expected Date - Export Date
  const exportDate = new Date(deliveryData.date);
  const expectedDate = new Date(deliveryData.expectedDate);
  const diffDays = (expectedDate.getTime() - exportDate.getTime()) / (1000 * 3600 * 24);

  if (expectedDate.getTime() < exportDate.getTime()) {
    throw badRequest('Expected delivery date must be on or after export date');
  }

  if (diffDays > slaDays && !deliveryData.notes?.includes('[EXCEPTION]')) {
    throw badRequest(`Delivery window (${Math.ceil(diffDays)} days) exceeds SLA limit of ${slaDays} days for ${customer.type} customers. Manager must add "[EXCEPTION]" to notes to override.`);
  }
};

type ListQuery = {
  page?: string;
  limit?: string;
  sort?: string;
  status?: DeliveryStatus;
  customerId?: string;
  query?: string;
};

export const listDeliveries = async (query: ListQuery) => {
  const { page, limit, sort, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.customerId) filter.customerId = new Types.ObjectId(query.customerId);
  if (query.query) filter.code = new RegExp(query.query, 'i');

  const [total, items] = await Promise.all([
    DeliveryModel.countDocuments(filter),
    DeliveryModel.find(filter)
      .populate('customerId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return buildPagedResponse(
    items.map((item: any) => {
      const totalAmount = (item.lines || []).reduce(
        (sum: number, line: any) => sum + (Number(line.qty) || 0) * (Number(line.priceOut) || 0),
        0
      );
      return {
        id: item._id.toString(),
        code: item.code,
        customer: item.customerId,
        customerId: item.customerId?._id?.toString?.() ?? item.customerId?.toString?.(),
        customerName: item.customerId?.name,
        date: item.date,
        expectedDate: item.expectedDate,
        status: item.status,
        lines: item.lines,
        notes: item.notes,
        totalAmount
      };
    }),
    total,
    { page, limit, sort, skip }
  );
};

export const getDelivery = async (id: string) => {
  const delivery = await DeliveryModel.findById(new Types.ObjectId(id))
    .populate('customerId', 'name code address contact')
    .populate('lines.productId', 'sku name unit')
    .lean();
  if (!delivery) {
    throw notFound('Delivery not found');
  }

  const customer = delivery.customerId as any;
  const lines = (delivery.lines || []).map((line: any) => {
    const product = line.productId as any;
    const productId = product?._id?.toString?.() ?? product?.toString?.() ?? line.productId?.toString?.();
    return {
      ...line,
      productId,
      sku: product?.sku ?? line.sku,
      productName: product?.name ?? line.productName
    };
  });

  const total = lines.reduce(
    (sum: number, line: any) => sum + (Number(line.qty) || 0) * (Number(line.priceOut) || 0),
    0
  );

  return {
    id: delivery._id.toString(),
    code: delivery.code,
    customerId: customer?._id?.toString?.() ?? delivery.customerId?.toString?.(),
    customer,
    customerName: customer?.name,
    date: delivery.date,
    expectedDate: delivery.expectedDate,
    status: delivery.status,
    lines,
    notes: delivery.notes,
    rejectedNote: delivery.rejectedNote,
    total,
    carrier: delivery.carrier,
    trackingNumber: delivery.trackingNumber,
    shippingFee: delivery.shippingFee
  };
};

export const createDelivery = async (
  payload: {
    code: string;
    customerId: string;
    date: Date;
    expectedDate: Date;
    lines: { productId: string; qty: number; priceOut: number; locationId: string; batch?: string }[];
    notes?: string;
  },
  actorId: string
) => {
  const customer = await PartnerModel.findOne({
    _id: new Types.ObjectId(payload.customerId),
    type: 'customer'
  }).lean();
  if (!customer) {
    throw badRequest('Customer not found');
  }
  const existing = await DeliveryModel.findOne({ code: payload.code }).lean();
  if (existing) {
    throw conflict('Delivery code already exists');
  }
  const finalLines = [];
  for (const line of payload.lines) {
    const product = await ProductModel.findById(new Types.ObjectId(line.productId)).lean();
    if (!product) {
      throw notFound(`Sản phẩm ${line.productId} không tồn tại`);
    }
    if (line.qty <= 0) {
      throw badRequest('Số lượng phải lớn hơn 0');
    }

    if (!line.locationId) {
      throw badRequest('Location is required for delivery lines');
    }
    finalLines.push({
      productId: new Types.ObjectId(line.productId),
      qty: line.qty,
      priceOut: line.priceOut,
      locationId: new Types.ObjectId(line.locationId),
      batch: line.batch?.trim() || undefined
    });
  }

  await ensureStock(finalLines.map((line) => ({
    productId: line.productId.toString(),
    locationId: line.locationId.toString(),
    qty: line.qty,
    batch: line.batch
  })));

  // Validate additional constraints (Qty limit, SLA)
  await validateDeliveryRules({ ...payload, lines: finalLines }, customer);

  const delivery = await DeliveryModel.create({
    ...payload,
    customerId: customer._id,
    lines: finalLines
  });
  await recordAudit({
    action: 'delivery.created',
    entity: 'Delivery',
    entityId: delivery._id,
    actorId,
    payload: {
      code: delivery.code,
      status: delivery.status
    }
  });

  notifyResourceUpdate('delivery', 'create', delivery);
  notifyResourceUpdate('dashboard', 'refresh');

  return delivery.toObject();
};

export const updateDelivery = async (
  id: string,
  payload: Partial<{
    date: Date;
    lines: { productId: string; qty: number; priceOut: number; locationId: string; batch?: string }[];
    notes?: string;
  }>,
  actorId: string
) => {
  const delivery = await DeliveryModel.findById(new Types.ObjectId(id));
  if (!delivery) {
    throw notFound('Delivery not found');
  }
  if (delivery.status !== 'draft') {
    throw badRequest('Only draft deliveries can be updated');
  }
  if (payload.date) delivery.date = payload.date;
  if (payload.notes !== undefined) delivery.notes = payload.notes;
  if (payload.lines) {
    const finalLines = [];
    for (const line of payload.lines) {
      if (line.qty <= 0) {
        throw badRequest('Số lượng phải lớn hơn 0');
      }
      const product = await ProductModel.findById(new Types.ObjectId(line.productId)).lean();
      if (!product) {
        throw notFound('Không tìm thấy sản phẩm');
      }

      if (!line.locationId) {
        throw badRequest('Location is required for delivery lines');
      }
      finalLines.push({
        productId: new Types.ObjectId(line.productId),
        qty: line.qty,
        priceOut: line.priceOut,
        locationId: new Types.ObjectId(line.locationId),
        batch: line.batch?.trim() || undefined
      });
    }
    await ensureStock(finalLines.map((line) => ({
      productId: line.productId.toString(),
      locationId: line.locationId.toString(),
      qty: line.qty,
      batch: line.batch
    })));
    delivery.lines = finalLines;
  }
  await delivery.save();
  await recordAudit({
    action: 'delivery.updated',
    entity: 'Delivery',
    entityId: delivery._id,
    actorId,
    payload
  });

  notifyResourceUpdate('delivery', 'update', delivery);

  return delivery.toObject();
};

const ensureTransition = (current: DeliveryStatus, target: DeliveryStatus) => {
  const allowed = allowedTransitions[current] ?? [];
  if (!allowed.includes(target)) {
    throw badRequest(`Transition from ${current} to ${target} is not allowed`);
  }
};

export const transitionDelivery = async (
  id: string,
  target: DeliveryStatus,
  actorId: string,
  note?: string
) => {
  const delivery = await DeliveryModel.findById(new Types.ObjectId(id));
  if (!delivery) {
    throw notFound('Delivery not found');
  }
  const oldStatus = delivery.status;
  ensureTransition(oldStatus, target);

  if (target === 'rejected') {
    const trimmed = typeof note === 'string' ? note.trim() : '';
    (delivery as any).rejectedNote = trimmed || undefined;
  }

  if (['approved', 'prepared'].includes(target)) {
    for (const line of delivery.lines) {
      if (!line.locationId) {
        throw badRequest('Location is required to progress delivery');
      }
    }

    // Reservation logic on Approval
    if (target === 'approved' && oldStatus === 'draft') {
      for (const line of delivery.lines) {
        await reserveStock(line.productId.toString(), line.locationId!.toString(), line.qty, line.batch ?? undefined);
      }

      // AUTO-WAYBILL GENERATION
      try {
        const { createWaybill } = await import('./shipping.service.js');
        const waybill = await createWaybill(delivery);
        delivery.trackingNumber = waybill.trackingNumber;
        delivery.carrier = waybill.carrier;
        delivery.shippingFee = waybill.shippingFee;
        logger.info(`Waybill created for ${delivery.code}: ${delivery.trackingNumber} via ${delivery.carrier}`);
      } catch (shipErr) {
        logger.warn(`Failed to generate waybill for ${delivery.code}:`, shipErr);
      }

      // Re-validate constraints on approval
      const customer = await PartnerModel.findById(delivery.customerId).lean();
      if (customer) {
        await validateDeliveryRules(delivery.toObject(), customer);
      }
    }
  }

  if (target === 'prepared' && oldStatus === 'approved') {
    for (const line of delivery.lines) {
      await adjustInventory(line.productId.toString(), line.locationId!.toString(), -line.qty, { status: 'reserved', batch: line.batch });
    }
  }

  if (target === 'cancelled' && ['approved', 'prepared', 'delivered'].includes(oldStatus)) {
    for (const line of delivery.lines) {
      if (oldStatus === 'approved') {
        await releaseStock(line.productId.toString(), line.locationId!.toString(), line.qty, line.batch ?? undefined);
      } else {
        await adjustInventory(line.productId.toString(), line.locationId!.toString(), line.qty, { status: 'available', batch: line.batch });
      }
    }
  }

  if (target === 'completed') {
    const { SerialModel } = await import('../models/serial.model.js');
    for (const line of delivery.lines) {
      if (!line.locationId) {
        throw badRequest('Location is required to complete delivery');
      }

      const product = await ProductModel.findById(line.productId);
      if (!product) throw notFound(`Product ${line.productId} not found`);

      if (product.manageBySerial) {
        const serials = line.serials || [];
        if (serials.length !== line.qty) {
          throw badRequest(`Sản phẩm ${product.name} yêu cầu ${line.qty} số serial khi xuất, nhưng chỉ chọn được ${serials.length}`);
        }

        // Validate serials exist and are in_stock at this location
        const foundSerials = await SerialModel.find({
          serialNumber: { $in: serials },
          productId: product._id,
          locationId: line.locationId,
          status: 'in_stock'
        });

        if (foundSerials.length !== serials.length) {
          throw badRequest(`Một số Serial không hợp lệ hoặc không có trong kho tại vị trí này.`);
        }

        // Update status
        await SerialModel.updateMany(
          { serialNumber: { $in: serials } },
          { $set: { status: 'sold', deliveryId: delivery._id } }
        );
      }

    }

    // Auto-create Revenue Transaction
    const totalAmount = delivery.lines.reduce((sum, line) => sum + (line.qty * line.priceOut), 0);

    const { createTransaction } = await import('./transaction.service.js');
    await createTransaction({
      partnerId: delivery.customerId.toString(),
      type: 'income',
      amount: totalAmount,
      status: 'completed',
      referenceId: (delivery as any)._id.toString(),
      referenceType: 'Delivery',
      note: `Auto-generated revenue for Delivery ${delivery.code}`
    }, actorId);

    // AUTO-EMAIL INVOICE
    try {
      const customer = await PartnerModel.findById(delivery.customerId).lean();
      if (customer && (customer as any).email) {
        const { generateInvoicePdf } = await import('./report.service.js');
        const { sendInvoiceEmail } = await import('./email.service.js');

        const pdfBuffer = await generateInvoicePdf((delivery as any)._id.toString());
        await sendInvoiceEmail((customer as any).email, delivery.code, pdfBuffer);
      }
    } catch (emailError) {
      console.warn('Failed to send auto-invoice email:', emailError);
    }
  }

  delivery.status = target;
  await delivery.save();
  await recordAudit({
    action: `delivery.${target}`,
    entity: 'Delivery',
    entityId: delivery._id,
    actorId,
    payload: { status: target, rejectedNote: (delivery as any).rejectedNote }
  });

  notifyResourceUpdate('delivery', 'update', delivery);
  notifyResourceUpdate('dashboard', 'refresh');
  if (target === 'completed' || target === 'prepared') {
    notifyResourceUpdate('inventory', 'update');
  }

  return delivery.toObject();
};

export const deleteDelivery = async (id: string, actorId: string) => {
  const delivery = await DeliveryModel.findById(new Types.ObjectId(id));
  if (!delivery) {
    throw notFound('Delivery not found');
  }
  if (delivery.status !== 'draft') {
    throw badRequest('Only draft deliveries can be deleted');
  }
  await DeliveryModel.deleteOne({ _id: delivery._id });
  await recordAudit({
    action: 'delivery.deleted',
    entity: 'Delivery',
    entityId: delivery._id,
    actorId,
    payload: { code: delivery.code }
  });

  notifyResourceUpdate('delivery', 'delete', { id });
  notifyResourceUpdate('dashboard', 'refresh');

  return true;
};

export const exportDeliveriesExcel = async (query: ListQuery & { startDate?: string; endDate?: string }) => {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.customerId) filter.customerId = new Types.ObjectId(query.customerId);

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) (filter.date as any).$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      (filter.date as any).$lte = end;
    }
  }

  const items = await DeliveryModel.find(filter)
    .populate('customerId', 'name')
    .sort({ date: -1 })
    .lean();

  return items.map((item: any) => ({
    code: item.code,
    customer: item.customerId?.name || 'N/A',
    date: new Date(item.date).toLocaleDateString('vi-VN'),
    expectedDate: new Date(item.expectedDate).toLocaleDateString('vi-VN'),
    status: item.status,
    totalLines: item.lines.length,
    totalQty: item.lines.reduce((sum: number, l: any) => sum + l.qty, 0),
    notes: item.notes || ''
  }));
};
