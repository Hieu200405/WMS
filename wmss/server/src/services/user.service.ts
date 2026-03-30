import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { UserModel } from '../models/user.model.js';
import type { UserDocument } from '../models/user.model.js';
import { env } from '../config/env.js';
import { badRequest, notFound } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';
import type { UserRole } from '@wms/shared';

interface ListQuery {
  page?: string;
  limit?: string;
  sort?: string;
  query?: string;
}

export const listUsers = async (query: ListQuery) => {
  const { page, limit, sort, skip } = parsePagination(query);
  const filter = query.query
    ? {
      $or: [
        { email: new RegExp(query.query, 'i') },
        { fullName: new RegExp(query.query, 'i') }
      ]
    }
    : {};
  const [total, data] = await Promise.all([
    UserModel.countDocuments(filter),
    UserModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
  ]);
  return buildPagedResponse(
    data.map((user) => ({
      id: (user._id as Types.ObjectId).toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    })),
    total,
    { page, limit, sort, skip }
  );
};

export const getUserById = async (id: string) => {
  const user = await UserModel.findById(new Types.ObjectId(id)).lean();
  if (!user) {
    throw notFound('User not found');
  }
  return {
    id: (user._id as Types.ObjectId).toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive
  };
};

interface UpdateUserInput {
  email?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
  actorId: string;
}

export const updateUser = async (id: string, input: UpdateUserInput) => {
  const user = (await UserModel.findById(new Types.ObjectId(id))) as UserDocument | null;
  if (!user) {
    throw notFound('User not found');
  }

  console.log(`[UserService] Updating user ${id}`, { inputEmail: input.email, currentEmail: user.email });

  if (input.email) {
    const normalizedEmail = input.email.trim().toLowerCase();
    if (normalizedEmail !== user.email.toLowerCase()) {
      console.log(`[UserService] Changing email from ${user.email} to ${normalizedEmail}`);
      const exists = await UserModel.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (exists) {
        throw badRequest('Email already in use');
      }
      user.email = normalizedEmail;
      user.markModified('email');
    }
  }

  if (input.fullName) user.fullName = input.fullName;
  if (input.role) user.role = input.role;
  if (typeof input.isActive === 'boolean') user.isActive = input.isActive;
  if (input.password) {
    if (input.password.length < 8) {
      throw badRequest('Password must be at least 8 characters');
    }
    user.passwordHash = await bcrypt.hash(input.password, env.saltRounds);
  }
  await user.save();
  await recordAudit({
    action: 'user.updated',
    entity: 'User',
    entityId: user._id as Types.ObjectId,
    actorId: input.actorId,
    payload: {
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      isActive: input.isActive
    }
  });
  return getUserById(id);
};

export const deleteUser = async (id: string, actorId: string) => {
  const user = await UserModel.findByIdAndDelete(new Types.ObjectId(id));
  if (!user) {
    throw notFound('User not found');
  }
  await recordAudit({
    action: 'user.deleted',
    entity: 'User',
    entityId: id,
    actorId,
    payload: { email: user.email }
  });
  return true;
};
