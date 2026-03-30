import { Types } from 'mongoose';
import { AuditLogModel } from '../models/auditLog.model.js';

interface AuditInput {
  action: string;
  entity: string;
  entityId?: unknown;
  actorId?: string | null;
  payload?: Record<string, unknown> | null;
}

const normalizeEntityId = (entityId: unknown): Types.ObjectId | string => {
  if (entityId instanceof Types.ObjectId) {
    return entityId;
  }
  if (typeof entityId === 'string') {
    return entityId;
  }
  if (entityId && typeof (entityId as { toString(): string }).toString === 'function') {
    return (entityId as { toString(): string }).toString();
  }
  return 'unknown';
};

export const recordAudit = async ({ action, entity, entityId, actorId, payload }: AuditInput) => {
  await AuditLogModel.create({
    action,
    entity,
    entityId: normalizeEntityId(entityId ?? 'unknown'),
    actorId: actorId ? new Types.ObjectId(actorId) : null,
    payload: payload ?? null
  });
};

/**
 * List audit logs with pagination and filtering
 */
export const listAuditLogs = async (query: {
  page?: string;
  limit?: string;
  entity?: string;
  action?: string;
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
}) => {
  const { parsePagination, buildPagedResponse } = await import('../utils/pagination.js');
  const { page, limit, skip } = parsePagination(query);

  const filter: Record<string, unknown> = {};

  if (query.entity) {
    filter.entity = query.entity;
  }

  if (query.action) {
    filter.action = new RegExp(query.action, 'i');
  }

  if (query.actorId) {
    filter.actorId = new Types.ObjectId(query.actorId);
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) {
      (filter.createdAt as Record<string, unknown>).$gte = query.startDate;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      (filter.createdAt as Record<string, unknown>).$lte = end;
    }
  }

  const [total, items] = await Promise.all([
    AuditLogModel.countDocuments(filter),
    AuditLogModel.find(filter)
      .populate('actorId', 'username email')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean()
  ]);

  return buildPagedResponse(
    items.map((item) => ({
      id: item._id.toString(),
      action: item.action,
      entity: item.entity,
      entityId: item.entityId,
      actor: item.actorId,
      payload: item.payload,
      createdAt: item.createdAt
    })),
    total,
    { page, limit, skip, sort: '-createdAt' }
  );
};

export const exportAuditLogs = async (query: {
  entity?: string;
  action?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const filter: Record<string, unknown> = {};

  if (query.entity) filter.entity = query.entity;
  if (query.action) filter.action = new RegExp(query.action, 'i');
  if (query.actorId) filter.actorId = new Types.ObjectId(query.actorId);

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) (filter.createdAt as any).$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      (filter.createdAt as any).$lte = end;
    }
  }

  const items = await AuditLogModel.find(filter)
    .populate('actorId', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  return items.map((item: any) => ({
    time: new Date(item.createdAt).toLocaleString('vi-VN'),
    action: item.action,
    entity: item.entity,
    actor: item.actorId?.name || item.actorId?.email || 'System',
    details: JSON.stringify(item.payload || {})
  }));
};
