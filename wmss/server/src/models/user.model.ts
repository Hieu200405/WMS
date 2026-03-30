import mongoose, { Schema, model, type Document, type Model } from 'mongoose';
import { USER_ROLES, type UserRole } from '@wms/shared';

export interface User {
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  branchIds?: mongoose.Types.ObjectId[];
  refreshToken?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument extends User, Document { }

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    role: { type: String, enum: USER_ROLES, required: true, default: 'Staff' },
    isActive: { type: Boolean, required: true, default: true },
    branchIds: [{ type: Schema.Types.ObjectId, ref: 'WarehouseNode' }],
    refreshToken: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String }
  },
  { timestamps: true }
);

// userSchema.index({ email: 1 }, { unique: true });

export const UserModel: Model<UserDocument> = (mongoose.models.User as Model<UserDocument>) || model<UserDocument>('User', userSchema);
