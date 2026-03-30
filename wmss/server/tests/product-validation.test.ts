import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import { ProductModel } from '../src/models/product.model.js';
import { CategoryModel } from '../src/models/category.model.js';

describe('Product Model Validation (Enterprise Grade)', () => {
    let categoryId: mongoose.Types.ObjectId;

    beforeEach(async () => {
        // Clear collections to ensure clean state
        await ProductModel.deleteMany({});
        await CategoryModel.deleteMany({});

        // Create a dummy category for relationships
        const category = await CategoryModel.create({ name: 'Valid Cat', code: 'C-001' });
        categoryId = category._id;
    });

    it('should create a valid product successfully', async () => {
        const validProduct = {
            sku: 'P-VALID-001',
            name: 'Valid Product',
            categoryId,
            unit: 'pcs',
            priceIn: 100,
            priceOut: 150,
            minStock: 10
        };
        const product = await ProductModel.create(validProduct);
        expect(product._id).toBeDefined();
        expect(product.sku).toBe(validProduct.sku);
    });

    it('should fail when required fields are missing', async () => {
        const product = new ProductModel({
            // Missing sku, name, unit, etc.
            categoryId
        });

        try {
            await product.validate();
            fail('Should have thrown validation error');
        } catch (err: any) {
            expect(err.errors.sku).toBeDefined();
            expect(err.errors.name).toBeDefined();
            expect(err.errors.unit).toBeDefined();
            expect(err.errors.priceIn).toBeDefined();
        }
    });

    it('should fail when numeric fields are negative', async () => {
        const invalidProduct = new ProductModel({
            sku: 'P-NEG',
            name: 'Negative',
            categoryId,
            unit: 'pcs',
            priceIn: -10,
            priceOut: -5,
            minStock: -1
        });

        try {
            await invalidProduct.validate();
            fail('Should have thrown validation error for negative numbers');
        } catch (err: any) {
            expect(err.errors.priceIn).toBeDefined();
            expect(err.errors.priceOut).toBeDefined();
            expect(err.errors.minStock).toBeDefined();
        }
    });

    it('should enforce unique SKU constraint', async () => {
        const p1 = {
            sku: 'UNIQUE-SKU',
            name: 'Product 1',
            categoryId,
            unit: 'box',
            priceIn: 10,
            priceOut: 20,
            minStock: 5
        };
        await ProductModel.create(p1);

        const p2 = { ...p1, name: 'Product 2' }; // Same SKU

        await expect(ProductModel.create(p2)).rejects.toThrow(/duplicate key/);
    });

    it('should trim string fields', async () => {
        const p = await ProductModel.create({
            sku: '  TRIM-ME  ',
            name: '  Trimmed Name  ',
            categoryId,
            unit: '  pcs  ',
            priceIn: 10,
            priceOut: 20,
            minStock: 5
        });

        expect(p.sku).toBe('TRIM-ME');
        expect(p.name).toBe('Trimmed Name');
        expect(p.unit).toBe('pcs');
    });
});
