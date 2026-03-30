import { Types } from 'mongoose';
import { IncidentModel } from '../models/incident.model.js';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { notFound } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';
import type { IncidentAction, IncidentStatus, IncidentType } from '@wms/shared';

interface ListQuery {
  page?: string;
  limit?: string;
  sort?: string;
  type?: IncidentType;
  refType?: 'receipt' | 'delivery';
  status?: IncidentStatus;
}

export const listIncidents = async (query: ListQuery) => {
  const { page, limit, sort, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.type) filter.type = query.type;
  if (query.refType) filter.refType = query.refType;
  if (query.status) filter.status = query.status;
  const [total, items] = await Promise.all([
    IncidentModel.countDocuments(filter),
    IncidentModel.find(filter).sort(sort).skip(skip).limit(limit).lean()
  ]);
  return buildPagedResponse(
    items.map((item) => ({
      id: item._id.toString(),
      type: item.type,
      refType: item.refType,
      refId: item.refId.toString(),
      status: item.status,
      lines: item.lines,
      note: item.note,
      action: item.action,
      createdBy: item.createdBy.toString(),
      createdAt: item.createdAt
    })),
    total,
    { page, limit, sort, skip }
  );
};

export const createIncident = async (
  payload: {
    type: IncidentType;
    refType: 'receipt' | 'delivery';
    refId: string;
    lines: { productId: string; quantity: number }[];
    note?: string;
    action: IncidentAction;
  },
  actorId: string
) => {
  const incident = await IncidentModel.create({
    ...payload,
    refId: new Types.ObjectId(payload.refId),
    status: 'open',
    lines: payload.lines.map((line) => ({
      productId: new Types.ObjectId(line.productId),
      quantity: line.quantity
    })),
    createdBy: new Types.ObjectId(actorId)
  });
  await recordAudit({
    action: 'incident.created',
    entity: 'Incident',
    entityId: incident._id,
    actorId,
    payload
  });
  return incident.toObject();
};

export const updateIncident = async (
  id: string,
  payload: {
    note?: string;
    action?: IncidentAction;
    status?: IncidentStatus;
    lines?: { productId: string; quantity: number }[];
  },
  actorId: string
) => {
  const incident = await IncidentModel.findById(new Types.ObjectId(id));
  if (!incident) {
    throw notFound('Incident not found');
  }
  if (payload.note !== undefined) incident.note = payload.note;
  if (payload.action) incident.action = payload.action;
  if (payload.status) incident.status = payload.status;
  if (payload.lines) {
    incident.lines = payload.lines.map((line) => ({
      productId: new Types.ObjectId(line.productId),
      quantity: line.quantity
    }));
  }
  await incident.save();
  await recordAudit({
    action: 'incident.updated',
    entity: 'Incident',
    entityId: incident._id,
    actorId,
    payload
  });
  return incident.toObject();
};

export const deleteIncident = async (id: string, actorId: string) => {
  const incident = await IncidentModel.findByIdAndDelete(new Types.ObjectId(id));
  if (!incident) {
    throw notFound('Incident not found');
  }
  await recordAudit({
    action: 'incident.deleted',
    entity: 'Incident',
    entityId: incident._id,
    actorId,
    payload: { refId: incident.refId }
  });
  return true;
};
