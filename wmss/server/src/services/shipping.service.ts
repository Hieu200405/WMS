import { logger } from '../utils/logger.js';
import { DeliveryDocument } from '../models/delivery.model.js';

export interface WaybillResult {
    trackingNumber: string;
    carrier: string;
    shippingFee: number;
}

/**
 * Simulate integration with external shipping carriers (GHTK, GHN, Viettel Post)
 */
export const createWaybill = async (delivery: DeliveryDocument): Promise<WaybillResult> => {
    logger.info(`[SHIPPING] Creating waybill for delivery ${delivery.code} via ${delivery.carrier || 'Default Carrier'}`);

    // 1. Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // 2. Logic to choose carrier if not provided
    const carrier = delivery.carrier || 'GHTK';

    // 3. Simple weight-based fee calculation (Simulated)
    const weight = delivery.weight || 500; // default 500g
    const baseFee = 20000;
    const shippingFee = baseFee + (Math.floor(weight / 1000) * 5000);

    // 4. Generate random tracking number
    const prefix = carrier.substring(0, 3).toUpperCase();
    const trackingNumber = `${prefix}${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    return {
        trackingNumber,
        carrier,
        shippingFee
    };
};

export const cancelWaybill = async (trackingNumber: string): Promise<boolean> => {
    logger.info(`[SHIPPING] Cancelling waybill ${trackingNumber}`);
    // Simulate API call
    return true;
};

export const getShippingLabel = async (trackingNumber: string): Promise<string> => {
    // In a real app, this returns a PDF URL or Base64 from the carrier
    return `https://shipping-api.sim/label/${trackingNumber}.pdf`;
};
