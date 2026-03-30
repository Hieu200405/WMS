import { Types } from 'mongoose';
import { DisposalModel } from '../models/disposal.model.js';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';
import { adjustInventory } from './inventory.service.js';
import { env } from '../config/env.js';
import type { DisposalStatus } from '@wms/shared';

const allowedTransitions: Record<DisposalStatus, DisposalStatus[]> = {
  draft: ['approved'],
  approved: ['completed'],
  completed: []
};

interface ListQuery {
  page?: string;
  limit?: string;
  sort?: string;
  status?: DisposalStatus;
  query?: string;
}

export const listDisposals = async (query: ListQuery) => {
  const { page, limit, sort, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.query) filter.code = new RegExp(query.query, 'i');
  const [total, items] = await Promise.all([
    DisposalModel.countDocuments(filter),
    DisposalModel.find(filter).sort(sort).skip(skip).limit(limit).lean()
  ]);
  return buildPagedResponse(
    items.map((item) => ({
      id: item._id.toString(),
      code: item.code,
      status: item.status,
      reason: item.reason,
      createdAt: item.createdAt,
      totalValue: item.totalValue,
      boardRequired: item.boardRequired,
      boardMembers: item.boardMembers,
      minutesFileUrl: item.minutesFileUrl,
      items: item.items
    })),
    total,
    { page, limit, sort, skip }
  );
};

const computeTotalValue = (
  items: { productId: string; locationId: string; batch?: string | null; qty: number; value?: number }[],
  fallbackPrice = 0
) =>
  items.reduce((sum, item) => sum + item.qty * (item.value ?? fallbackPrice), 0);

export const createDisposal = async (
  payload: {
    code: string;
    reason: string;
    boardMembers?: string[];
    minutesFileUrl?: string;
    items: { productId: string; locationId: string; batch?: string | null; qty: number; value?: number }[];
    totalValue?: number;
    boardRequired?: boolean;
  },
  actorId: string
) => {
  const exists = await DisposalModel.findOne({ code: payload.code }).lean();
  if (exists) {
    throw conflict('Disposal code already exists');
  }
  if (!payload.items.length) {
    throw badRequest('Disposal items required');
  }
  const totalValue = payload.totalValue ?? computeTotalValue(payload.items);
  const boardRequired = payload.boardRequired ?? totalValue > env.highValueDisposalThreshold;
  const disposal = await DisposalModel.create({
    code: payload.code,
    reason: payload.reason,
    totalValue,
    boardRequired,
    boardMembers: payload.boardMembers ?? [],
    minutesFileUrl: payload.minutesFileUrl,
    createdBy: new Types.ObjectId(actorId),
    items: payload.items.map((item) => {
      const entry = {
        productId: new Types.ObjectId(item.productId),
        locationId: new Types.ObjectId(item.locationId),
        batch: item.batch ?? null,
        qty: item.qty
      };
      return item.value != null ? { ...entry, value: item.value } : entry;
    })
  });
  await recordAudit({
    action: 'disposal.created',
    entity: 'Disposal',
    entityId: disposal._id,
    actorId,
    payload: { code: disposal.code }
  });
  return disposal.toObject();
};

export const updateDisposal = async (
  id: string,
  payload: Partial<{
    boardMembers: string[];
    minutesFileUrl: string;
    items: { productId: string; locationId: string; batch?: string | null; qty: number; value?: number }[];
    totalValue: number;
    boardRequired: boolean;
  }>,
  actorId: string
) => {
  const disposal = await DisposalModel.findById(new Types.ObjectId(id));
  if (!disposal) {
    throw notFound('Disposal not found');
  }
  if (disposal.status !== 'draft') {
    throw badRequest('Only draft disposals can be updated');
  }
  if (payload.boardMembers) disposal.boardMembers = payload.boardMembers;
  if (typeof payload.minutesFileUrl === 'string') disposal.minutesFileUrl = payload.minutesFileUrl;
  if (payload.items) {
    disposal.items = payload.items.map((item) => {
      const entry = {
        productId: new Types.ObjectId(item.productId),
        locationId: new Types.ObjectId(item.locationId),
        batch: item.batch ?? null,
        qty: item.qty
      };
      return item.value != null ? { ...entry, value: item.value } : entry;
    });
    disposal.totalValue = payload.totalValue ?? computeTotalValue(payload.items);
    disposal.boardRequired =
      typeof payload.boardRequired === 'boolean'
        ? payload.boardRequired
        : disposal.totalValue > env.highValueDisposalThreshold;
  }
  await disposal.save();
  await recordAudit({
    action: 'disposal.updated',
    entity: 'Disposal',
    entityId: disposal._id,
    actorId,
    payload
  });
  return disposal.toObject();
};

const ensureTransition = (current: DisposalStatus, target: DisposalStatus) => {
  const allowed = allowedTransitions[current] ?? [];
  if (!allowed.includes(target)) {
    throw badRequest(`Transition from ${current} to ${target} is not allowed`);
  }
};

export const transitionDisposal = async (
  id: string,
  target: DisposalStatus,
  actorId: string
) => {
  const disposal = await DisposalModel.findById(new Types.ObjectId(id));
  if (!disposal) {
    throw notFound('Disposal not found');
  }
  ensureTransition(disposal.status as DisposalStatus, target);

  if (target === 'approved' && disposal.boardRequired) {
    if (!disposal.boardMembers?.length || !disposal.minutesFileUrl) {
      throw badRequest('Board approval requires members and minutes file');
    }
  }

  if (target === 'completed') {
    for (const item of disposal.items) {
      await adjustInventory(item.productId.toString(), item.locationId.toString(), -item.qty, {
        batch: item.batch ?? null
      });
    }

    // Auto-create Expense Transaction (Loss)
    // We need a Partner to assign this loss to. Ideally an "Internal/Loss" partner.
    // We'll attempt to find one, or skip if strictly required.
    try {
      const { PartnerModel } = await import('../models/partner.model.js');
      // Find existing 'Internal' or create dummy or use first available (not creating dummy to avoid side effects)
      // For MVP, letting it be associated with the first admin found? No, that's User.
      // Let's just try to find a partner named "System" or "Internal".
      const internalPartner = await PartnerModel.findOne({ name: { $in: ['System', 'Internal', 'Loss'] } });

      if (internalPartner) {
        const { createTransaction } = await import('./transaction.service.js');
        await createTransaction({
          partnerId: (internalPartner as any)._id.toString(),
          type: 'expense',
          amount: disposal.totalValue,
          status: 'completed',
          referenceId: (disposal as any)._id.toString(),
          referenceType: 'Manual', // Disposal not in enum list yet in Transaction, using Manual or need update
          note: `Disposal Loss: ${disposal.reason}`
        }, actorId);
      }
    } catch (e) {
      console.warn('Skipped disposal transaction:', e);
    }
  }

  disposal.status = target;
  await disposal.save();
  await recordAudit({
    action: `disposal.${target}`,
    entity: 'Disposal',
    entityId: disposal._id,
    actorId,
    payload: { status: target }
  });
  return disposal.toObject();
};

/**
 * Approve disposal with enhanced workflow
 * Only Admin/Manager can approve
 */
export const approveDisposal = async (
  id: string,
  payload: {
    approvalNotes?: string;
    attachments?: string[];
    photos?: string[];
  },
  actorId: string
) => {
  const disposal = await DisposalModel.findById(new Types.ObjectId(id));
  if (!disposal) {
    throw notFound('Disposal not found');
  }

  if (disposal.status !== 'draft') {
    throw badRequest('Only draft disposals can be approved');
  }

  // Check permission - Only Admin/Manager
  const { UserModel } = await import('../models/user.model.js');
  const user = await UserModel.findById(new Types.ObjectId(actorId));
  if (!user || !['Admin', 'Manager'].includes(user.role)) {
    const { forbidden } = await import('../utils/errors.js');
    throw forbidden('Only Admin or Manager can approve disposals');
  }

  // Check board requirements
  if (disposal.boardRequired) {
    if (!disposal.boardMembers?.length || !disposal.minutesFileUrl) {
      throw badRequest('Board approval requires members and minutes file');
    }
  }

  // Update disposal with approval info
  disposal.status = 'approved';
  disposal.approvedBy = new Types.ObjectId(actorId);
  disposal.approvedAt = new Date();
  disposal.approvalNotes = payload.approvalNotes;
  disposal.attachments = payload.attachments || [];
  disposal.photos = payload.photos || [];

  await disposal.save();

  await recordAudit({
    action: 'disposal.approved',
    entity: 'Disposal',
    entityId: disposal._id,
    actorId,
    payload
  });

  return disposal.toObject();
};

export const deleteDisposal = async (id: string, actorId: string) => {
  const disposal = await DisposalModel.findById(new Types.ObjectId(id));
  if (!disposal) {
    throw notFound('Disposal not found');
  }
  if (disposal.status !== 'draft') {
    throw badRequest('Only draft disposals can be deleted');
  }
  await DisposalModel.deleteOne({ _id: disposal._id });
  await recordAudit({
    action: 'disposal.deleted',
    entity: 'Disposal',
    entityId: disposal._id,
    actorId,
    payload: { code: disposal.code }
  });
  return true;
};
