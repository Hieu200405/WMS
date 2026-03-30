import { Types } from 'mongoose';
import { SupplierProductModel } from '../models/supplier-product.model.js';
import { ProductModel } from '../models/product.model.js';
import { PartnerModel } from '../models/partner.model.js';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { conflict, notFound, badRequest } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';

interface ListQuery {
    page?: string;
    limit?: string;
    sort?: string;
    productId?: string;
    supplierId?: string;
    status?: string;
}

export const listSupplierProducts = async (query: ListQuery) => {
    const { page, limit, sort, skip } = parsePagination(query);
    const filter: Record<string, unknown> = {};

    if (query.productId) filter.productId = new Types.ObjectId(query.productId);
    if (query.supplierId) filter.supplierId = new Types.ObjectId(query.supplierId);
    if (query.status) filter.status = query.status;

    const [total, items] = await Promise.all([
        SupplierProductModel.countDocuments(filter),
        SupplierProductModel.find(filter)
            .populate('supplierId', 'name code')
            .populate('productId', 'name sku unit')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean()
    ]);

    return buildPagedResponse(
        items.map((item) => ({
            id: item._id.toString(),
            ...item,
            supplierId: item.supplierId, // Populated
            productId: item.productId    // Populated
        })),
        total,
        { page, limit, sort, skip }
    );
};

export const createSupplierProduct = async (
    payload: any,
    actorId: string
) => {
    // Check existence
    const existing = await SupplierProductModel.findOne({
        supplierId: payload.supplierId,
        productId: payload.productId
    });

    if (existing) {
        throw conflict('This supplier is already assigned to this product');
    }

    // Validate Supplier Type
    const supplier = await PartnerModel.findById(payload.supplierId);
    if (!supplier || supplier.type !== 'supplier') {
        throw badRequest('Invalid supplier ID');
    }

    // Handle Preferred Logic
    if (payload.isPreferred) {
        await SupplierProductModel.updateMany(
            { productId: payload.productId, isPreferred: true },
            { $set: { isPreferred: false } }
        );
    }

    const sp = await SupplierProductModel.create(payload);

    if (payload.isPreferred && typeof payload.priceIn === 'number') {
        await ProductModel.updateOne(
            { _id: sp.productId },
            { $set: { priceIn: payload.priceIn } }
        );
    }

    await recordAudit({
        action: 'supplier_product.created',
        entity: 'SupplierProduct',
        entityId: sp._id,
        actorId,
        payload
    });
    return sp.toObject();
};

export const updateSupplierProduct = async (
    id: string,
    payload: any,
    actorId: string
) => {
    const sp = await SupplierProductModel.findById(new Types.ObjectId(id));
    if (!sp) throw notFound('Record not found');

    // Handle Preferred Logic Update
    if (payload.isPreferred && !sp.isPreferred) {
        await SupplierProductModel.updateMany(
            { productId: sp.productId, isPreferred: true },
            { $set: { isPreferred: false } }
        );
    }

    Object.assign(sp, payload);
    await sp.save();

    if (sp.isPreferred && typeof sp.priceIn === 'number') {
        await ProductModel.updateOne(
            { _id: sp.productId },
            { $set: { priceIn: sp.priceIn } }
        );
    }

    await recordAudit({
        action: 'supplier_product.updated',
        entity: 'SupplierProduct',
        entityId: sp._id,
        actorId,
        payload
    });
    return sp.toObject();
};

export const deleteSupplierProduct = async (id: string, actorId: string) => {
    const sp = await SupplierProductModel.findByIdAndDelete(new Types.ObjectId(id));
    if (!sp) throw notFound('Record not found');

    await recordAudit({
        action: 'supplier_product.deleted',
        entity: 'SupplierProduct',
        entityId: sp._id,
        actorId,
        payload: { id }
    });
    return true;
};
