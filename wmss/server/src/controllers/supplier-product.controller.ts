import type { Request, Response } from 'express';
import {
    listSupplierProducts,
    createSupplierProduct,
    updateSupplierProduct,
    deleteSupplierProduct
} from '../services/supplier-product.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req: Request, res: Response) => {
    const result = await listSupplierProducts(req.query as any);
    res.json(result);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
    const result = await createSupplierProduct(
        req.body,
        req.user!.id
    );
    res.status(201).json(result);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
    const result = await updateSupplierProduct(
        req.params.id,
        req.body,
        req.user!.id
    );
    res.json(result);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
    await deleteSupplierProduct(req.params.id, req.user!.id);
    res.status(204).send();
});
