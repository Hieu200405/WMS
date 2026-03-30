import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';
import {
  INCIDENT_TYPES,
  INCIDENT_ACTIONS,
  INCIDENT_STATUS,
  type IncidentType,
  type IncidentAction,
  type IncidentStatus
} from '@wms/shared';

export type IncidentRefType = 'receipt' | 'delivery';

export interface IncidentLine {
  productId: Types.ObjectId;
  quantity: number;
}

export interface Incident {
  type: IncidentType;
  refType: IncidentRefType;
  refId: Types.ObjectId;
  status: IncidentStatus;
  lines: IncidentLine[];
  note?: string;
  action: IncidentAction;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentDocument extends Incident, Document {}

const incidentLineSchema = new Schema<IncidentLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const incidentSchema = new Schema<IncidentDocument>(
  {
    type: { type: String, enum: INCIDENT_TYPES, required: true },
    refType: { type: String, enum: ['receipt', 'delivery'], required: true },
    refId: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: INCIDENT_STATUS, required: true, default: 'open' },
    lines: { type: [incidentLineSchema], default: [] },
    note: { type: String, trim: true },
    action: { type: String, enum: INCIDENT_ACTIONS, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

incidentSchema.index({ refType: 1, refId: 1 });

export const IncidentModel: Model<IncidentDocument> = (mongoose.models.Incident as Model<IncidentDocument>) || model<IncidentDocument>('Incident', incidentSchema);
