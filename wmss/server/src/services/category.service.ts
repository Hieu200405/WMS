import { Types } from 'mongoose';
import { CategoryModel } from '../models/category.model.js';
import { ProductModel } from '../models/product.model.js';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { conflict, notFound, badRequest } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';

interface ListQuery {
  page?: string;
  limit?: string;
  sort?: string;
  query?: string;
}

export const listCategories = async (query: ListQuery) => {
  const { page, limit, sort, skip } = parsePagination(query);
  const filter = query.query
    ? {
      $or: [
        { name: new RegExp(query.query, 'i') },
        { code: new RegExp(query.query, 'i') }
      ]
    }
    : {};
  const [total, items] = await Promise.all([
    CategoryModel.countDocuments(filter),
    CategoryModel.find(filter).sort(sort).skip(skip).limit(limit).lean()
  ]);
  return buildPagedResponse(
    items.map((item) => ({
      id: item._id.toString(),
      code: item.code,
      name: item.name,
      description: item.description,
      isActive: item.isActive,
      createdAt: item.createdAt
    })),
    total,
    { page, limit, sort, skip }
  );
};

export const createCategory = async (
  payload: { code: string; name: string; description?: string; isActive?: boolean },
  actorId: string
) => {
  const existing = await CategoryModel.findOne({
    $or: [{ code: payload.code.toUpperCase() }, { name: payload.name }]
  }).lean();
  if (existing) {
    throw conflict('Category code or name already exists');
  }
  const category = await CategoryModel.create(payload);
  await recordAudit({
    action: 'category.created',
    entity: 'Category',
    entityId: category._id,
    actorId,
    payload
  });
  return category.toObject();
};

export const updateCategory = async (
  id: string,
  payload: { code?: string; name?: string; description?: string; isActive?: boolean },
  actorId: string
) => {
  const category = await CategoryModel.findById(new Types.ObjectId(id));
  if (!category) {
    throw notFound('Category not found');
  }

  if (payload.code && payload.code !== category.code) {
    const duplicate = await CategoryModel.findOne({ code: payload.code.toUpperCase() }).lean();
    if (duplicate) throw conflict('Category code already exists');
    category.code = payload.code;
  }

  if (payload.name && payload.name !== category.name) {
    category.name = payload.name;
  }

  if (typeof payload.description !== 'undefined') category.description = payload.description;
  if (typeof payload.isActive !== 'undefined') category.isActive = payload.isActive;

  await category.save();
  await recordAudit({
    action: 'category.updated',
    entity: 'Category',
    entityId: category._id,
    actorId,
    payload
  });
  return category.toObject();
};

export const deleteCategory = async (id: string, actorId: string) => {
  // Check dependency
  const productCount = await ProductModel.countDocuments({ categoryId: new Types.ObjectId(id) });
  if (productCount > 0) {
    throw badRequest(`Cannot delete category. It is used by ${productCount} products.`);
  }

  const category = await CategoryModel.findByIdAndDelete(new Types.ObjectId(id));
  if (!category) {
    throw notFound('Category not found');
  }
  await recordAudit({
    action: 'category.deleted',
    entity: 'Category',
    entityId: category._id,
    actorId,
    payload: { code: category.code, name: category.name }
  });
  return true;
};
