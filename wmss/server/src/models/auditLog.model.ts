import mongoose, { Schema, model, type Document, type Model, Types } from 'mongoose';

export interface AuditLog {
  actorId: Types.ObjectId | null;
  action: string;
  entity: string;
  entityId: Types.ObjectId | string;
  payload?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AuditLogDocument extends AuditLog, Document {}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: Schema.Types.Mixed, required: true },
    payload: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

export const AuditLogModel: Model<AuditLogDocument> = (mongoose.models.AuditLog as Model<AuditLogDocument>) || model<AuditLogDocument>('AuditLog', auditLogSchema);
