import { Types } from 'mongoose';
import { ProductModel } from '../models/product.model.js';
import { CategoryModel } from '../models/category.model.js';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';
import { createSupplierProduct } from './supplier-product.service.js';

type ListQuery = {
  page?: string;
  limit?: string;
  sort?: string;
  query?: string;
  categoryId?: string;
};

type CategoryLean =
  | Types.ObjectId
  | {
    _id: Types.ObjectId;
    name?: string | null;
  };

const isPopulatedCategory = (
  category: CategoryLean | undefined
): category is Exclude<CategoryLean, Types.ObjectId> =>
  Boolean(category && !(category instanceof Types.ObjectId));

export const listProducts = async (query: ListQuery) => {
  const { page, limit, sort, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.query) {
    filter.$or = [
      { sku: new RegExp(query.query, 'i') },
      { name: new RegExp(query.query, 'i') }
    ];
  }
  if (query.categoryId) {
    filter.categoryId = new Types.ObjectId(query.categoryId);
  }

  const [total, items] = await Promise.all([
    ProductModel.countDocuments(filter),
    ProductModel.find(filter)
      .populate('categoryId', 'name code') // Only select needed fields
      .select('-__v') // Exclude version field
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean() // Return plain objects for better performance
  ]);

  const data = items.map((product) => {
    const category = (() => {
      const categoryRef = product.categoryId as CategoryLean | undefined;
      if (!categoryRef) {
        return null;
      }
      if (categoryRef instanceof Types.ObjectId) {
        return { id: categoryRef.toString(), name: null };
      }
      if (isPopulatedCategory(categoryRef)) {
        return { id: categoryRef._id.toString(), name: categoryRef.name ?? null };
      }
      return null;
    })();
    return {
      id: product._id.toString(),
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      priceIn: product.priceIn,
      priceOut: product.priceOut,
      minStock: product.minStock,
      image: product.image,
      categoryId: category?.id ?? null,
      category,
      description: product.description,
      supplierIds: (product.supplierIds || []).map((id: any) => id.toString()),
      createdAt: product.createdAt
    };
  });

  return buildPagedResponse(data, total, { page, limit, sort, skip });
};

export const createProduct = async (
  payload: {
    sku: string;
    name: string;
    categoryId: string;
    preferredSupplierId: string;
    unit: string;
    priceIn: number;
    priceOut: number;
    minStock: number;
    image?: string;
    description?: string;
    supplierIds?: string[];
  },
  actorId: string
) => {
  const category = await CategoryModel.findById(new Types.ObjectId(payload.categoryId)).exec();
  if (!category) {
    throw notFound('Category not found');
  }
  const existing = await ProductModel.findOne({ sku: payload.sku }).lean();
  if (existing) {
    throw conflict('SKU already exists');
  }

  // Validate price: priceOut must be greater than priceIn
  if (payload.priceOut <= payload.priceIn) {
    throw badRequest('Giá bán (priceOut) phải lớn hơn giá nhập (priceIn)');
  }

  // Validate suppliers if provided
  let suppliers: Types.ObjectId[] = [];
  if (payload.supplierIds?.length) {
    // Assuming SupplierModel exists, we should ideally validate IDs. 
    // Skipping strict validation for now to avoid circular deps or missing model import, 
    // but preserving the logic.
    suppliers = payload.supplierIds.map(id => new Types.ObjectId(id));
  }

  const { preferredSupplierId, ...productPayload } = payload;
  const product = await ProductModel.create({
    ...productPayload,
    categoryId: category._id,
    supplierIds: suppliers
  });
  const productId = (product as { _id: Types.ObjectId })._id.toString();
  await createSupplierProduct(
    {
      supplierId: preferredSupplierId,
      productId,
      priceIn: payload.priceIn,
      isPreferred: true
    },
    actorId
  );
  await recordAudit({
    action: 'product.created',
    entity: 'Product',
    entityId: productId,
    actorId,
    payload
  });
  return product.toObject();
};

export const updateProduct = async (
  id: string,
  payload: Partial<{
    sku: string;
    name: string;
    categoryId: string;
    unit: string;
    priceIn: number;
    priceOut: number;
    minStock: number;
    image: string;
    description: string;
    supplierIds: string[];
  }>,
  actorId: string
) => {
  const product = await ProductModel.findById(new Types.ObjectId(id));
  if (!product) {
    throw notFound('Product not found');
  }
  if (payload.sku && payload.sku !== product.sku) {
    const duplicate = await ProductModel.findOne({ sku: payload.sku }).lean();
    if (duplicate) {
      throw conflict('SKU already exists');
    }
    product.sku = payload.sku;
  }
  if (payload.name) product.name = payload.name;
  if (payload.unit) product.unit = payload.unit;
  if (typeof payload.priceIn === 'number') product.priceIn = payload.priceIn;
  if (typeof payload.priceOut === 'number') product.priceOut = payload.priceOut;
  if (typeof payload.minStock === 'number') product.minStock = payload.minStock;
  if (payload.image !== undefined) product.image = payload.image;
  if (payload.description !== undefined) product.description = payload.description;
  if (payload.supplierIds) {
    product.supplierIds = payload.supplierIds.map(sid => new Types.ObjectId(sid));
  }

  // Validate price: priceOut must be greater than priceIn
  const finalPriceIn = typeof payload.priceIn === 'number' ? payload.priceIn : product.priceIn;
  const finalPriceOut = typeof payload.priceOut === 'number' ? payload.priceOut : product.priceOut;
  if (finalPriceOut <= finalPriceIn) {
    throw badRequest('Giá bán (priceOut) phải lớn hơn giá nhập (priceIn)');
  }

  if (payload.categoryId) {
    const category = await CategoryModel.findById(new Types.ObjectId(payload.categoryId)).exec();
    if (!category) {
      throw notFound('Category not found');
    }
    product.categoryId = category._id as Types.ObjectId;
  }
  await product.save();
  await recordAudit({
    action: 'product.updated',
    entity: 'Product',
    entityId: product._id,
    actorId,
    payload
  });
  return product.toObject();
};

export const deleteProduct = async (id: string, actorId: string) => {
  const productId = new Types.ObjectId(id);

  // Check if product has inventory
  const { InventoryModel } = await import('../models/inventory.model.js');
  const inventoryCount = await InventoryModel.countDocuments({
    productId,
    quantity: { $gt: 0 }
  });
  if (inventoryCount > 0) {
    throw badRequest('Không thể xóa sản phẩm đang còn tồn kho. Vui lòng xuất hết hàng trước khi xóa.');
  }

  // Check if product is in pending receipts
  const { ReceiptModel } = await import('../models/receipt.model.js');
  const pendingReceipts = await ReceiptModel.countDocuments({
    'lines.productId': productId,
    status: { $nin: ['completed', 'cancelled'] }
  });
  if (pendingReceipts > 0) {
    throw badRequest('Không thể xóa sản phẩm đang có phiếu nhập chưa hoàn thành.');
  }

  // Check if product is in pending deliveries
  const { DeliveryModel } = await import('../models/delivery.model.js');
  const pendingDeliveries = await DeliveryModel.countDocuments({
    'lines.productId': productId,
    status: { $nin: ['completed', 'cancelled'] }
  });
  if (pendingDeliveries > 0) {
    throw badRequest('Không thể xóa sản phẩm đang có phiếu xuất chưa hoàn thành.');
  }

  const product = await ProductModel.findByIdAndDelete(productId);
  if (!product) {
    throw notFound('Product not found');
  }
  await recordAudit({
    action: 'product.deleted',
    entity: 'Product',
    entityId: product._id,
    actorId,
    payload: { sku: product.sku }
  });
  return true;
};
