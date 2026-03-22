export const USER_ROLES = ['Admin', 'Manager', 'Staff'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PARTNER_TYPES = ['supplier', 'customer'] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const WAREHOUSE_NODE_TYPES = ['warehouse', 'zone', 'aisle', 'rack', 'bin'] as const;
export type WarehouseNodeType = (typeof WAREHOUSE_NODE_TYPES)[number];

export const RECEIPT_STATUS = ['draft', 'approved', 'supplierConfirmed', 'completed', 'rejected'] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUS)[number];

export const DELIVERY_STATUS = ['draft', 'approved', 'prepared', 'delivered', 'completed', 'cancelled', 'rejected'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUS)[number];

export const STOCKTAKE_STATUS = ['pass', 'diff'] as const;
export type StocktakeStatus = (typeof STOCKTAKE_STATUS)[number];

export const RETURN_STATUS = ['draft', 'approved', 'inspected', 'completed'] as const;
export type ReturnStatus = (typeof RETURN_STATUS)[number];

export const DISPOSAL_STATUS = ['draft', 'approved', 'completed'] as const;
export type DisposalStatus = (typeof DISPOSAL_STATUS)[number];

export const INCIDENT_TYPES = ['shortage', 'late', 'damaged', 'rejected'] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_ACTIONS = ['replenish', 'return', 'refund'] as const;
export type IncidentAction = (typeof INCIDENT_ACTIONS)[number];

export const INCIDENT_STATUS = ['open', 'inProgress', 'resolved'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUS)[number];

export const ADJUSTMENT_REASONS = ['loss', 'mismatch', 'damaged', 'stocktakeError'] as const;
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

export const RETURN_FROM = ['customer', 'supplier'] as const;
export type ReturnFrom = (typeof RETURN_FROM)[number];

export const DISPOSAL_REASONS = ['expired', 'damaged', 'lost'] as const;
export type DisposalReason = (typeof DISPOSAL_REASONS)[number];

export const FINANCIAL_TRANSACTION_TYPES = ['payment', 'liability', 'refund', 'income', 'expense'] as const;
export type FinancialTransactionType = (typeof FINANCIAL_TRANSACTION_TYPES)[number];

export const FINANCIAL_TRANSACTION_STATUS = ['pending', 'completed', 'cancelled'] as const;
export type FinancialTransactionStatus = (typeof FINANCIAL_TRANSACTION_STATUS)[number];

