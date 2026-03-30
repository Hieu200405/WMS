import { Types } from 'mongoose';
import { WarehouseNodeModel, type WarehouseNodeDocument, type WarehouseNode } from '../models/warehouseNode.model.js';
import { buildPagedResponse, parsePagination } from '../utils/pagination.js';
import { badRequest, conflict, notFound } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';
import { WAREHOUSE_NODE_TYPES, type WarehouseNodeType } from '@wms/shared';
import { InventoryModel } from '../models/inventory.model.js';



export const getWarehouseVisualization = async (nodeId: string) => {
  const root = await WarehouseNodeModel.findById(new Types.ObjectId(nodeId)).lean();
  if (!root) throw notFound('Node not found');

  const branchId = (root as any).branchId || root._id;
  const nodes = await WarehouseNodeModel.find({ branchId }).lean();

  const nodeMap = new Map<string, any>();
  nodes.forEach((node) => {
    nodeMap.set(node._id.toString(), node);
  });
  if (!nodeMap.has(root._id.toString())) {
    nodeMap.set(root._id.toString(), root);
  }

  const childrenMap = new Map<string, string[]>();
  nodeMap.forEach((node) => {
    const parentId = node.parentId?.toString();
    if (!parentId) return;
    const existing = childrenMap.get(parentId);
    if (existing) {
      existing.push(node._id.toString());
    } else {
      childrenMap.set(parentId, [node._id.toString()]);
    }
  });

  const binIds: Types.ObjectId[] = [];
  nodeMap.forEach((node) => {
    if (node.type === 'bin') binIds.push(node._id);
  });

  const inventoryStats = await InventoryModel.aggregate([
    { $match: { locationId: { $in: binIds } } },
    { $group: { _id: '$locationId', totalQty: { $sum: '$quantity' }, itemsCount: { $sum: 1 } } }
  ]);

  const statsMap = new Map<string, { totalQty: number; itemsCount: number }>();
  inventoryStats.forEach(stat => {
    statsMap.set(stat._id.toString(), { totalQty: stat.totalQty, itemsCount: stat.itemsCount });
  });

  const totalsCache = new Map<string, { totalQty: number; itemsCount: number }>();
  const calcTotals = (id: string): { totalQty: number; itemsCount: number } => {
    const cached = totalsCache.get(id);
    if (cached) return cached;
    const node = nodeMap.get(id);
    if (!node) return { totalQty: 0, itemsCount: 0 };
    if (node.type === 'bin') {
      const stats = statsMap.get(id) || { totalQty: 0, itemsCount: 0 };
      totalsCache.set(id, stats);
      return stats;
    }
    const childIds = childrenMap.get(id) || [];
    const totals = childIds.reduce<{ totalQty: number; itemsCount: number }>(
      (acc, childId) => {
        const childTotals = calcTotals(childId);
        return {
          totalQty: acc.totalQty + childTotals.totalQty,
          itemsCount: acc.itemsCount + childTotals.itemsCount
        };
      },
      { totalQty: 0, itemsCount: 0 }
    );
    totalsCache.set(id, totals);
    return totals;
  };

  const children = (childrenMap.get(root._id.toString()) || [])
    .map((id) => nodeMap.get(id))
    .filter(Boolean);

  return {
    ...root,
    children: children.map(child => {
      const stats = calcTotals(child._id.toString());
      return {
        ...child,
        currentQty: stats.totalQty,
        itemsCount: stats.itemsCount,
        utilization: (child.capacity && child.capacity > 0)
          ? Math.round((stats.totalQty / child.capacity) * 100)
          : 0
      };
    })
  };
};

const typeRank = new Map<WarehouseNodeType, number>(
  WAREHOUSE_NODE_TYPES.map((type, index) => [type, index])
);

const validateParentChain = async (
  type: WarehouseNodeType,
  parentId?: string | null
): Promise<WarehouseNodeDocument | null> => {
  if (!parentId) {
    if (type !== 'warehouse') {
      throw badRequest('Only warehouses can exist without parent');
    }
    return null;
  }
  const parent = await WarehouseNodeModel.findById(new Types.ObjectId(parentId)).exec();
  if (!parent) {
    throw notFound('Parent node not found');
  }
  const parentRank = typeRank.get(parent.type as WarehouseNodeType) ?? 0;
  const currentRank = typeRank.get(type) ?? 0;

  // Strict hierarchy check: Child must be exactly one level below Parent
  if (currentRank !== parentRank + 1) {
    throw badRequest(`Invalid hierarchy: ${type} cannot be a direct child of ${parent.type}. Expected chain: Warehouse -> Zone -> Row -> Rack -> Bin`);
  }
  return parent;
};

const sumChildCapacities = async (parentId: Types.ObjectId, excludeId?: Types.ObjectId) => {
  const children = await WarehouseNodeModel.find({
    parentId,
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  }).select('capacity').lean();

  return children.reduce((total, child: any) => {
    if (child.capacity && child.capacity > 0) return total + child.capacity;
    return total;
  }, 0);
};

const ensureParentCapacityAllows = async (
  parent: WarehouseNodeDocument,
  childCapacity?: number,
  excludeChildId?: Types.ObjectId
) => {
  if (!parent.capacity || parent.capacity <= 0) return;

  const existingTotal = await sumChildCapacities(parent._id as Types.ObjectId, excludeChildId);
  const nextTotal = existingTotal + (childCapacity && childCapacity > 0 ? childCapacity : 0);
  if (nextTotal > parent.capacity) {
    throw badRequest(
      `Total child capacity (${nextTotal}) exceeds parent capacity (${parent.capacity})`
    );
  }
};

type ListQuery = {
  page?: string;
  limit?: string;
  sort?: string;
  query?: string;
  type?: WarehouseNodeType;
  parentId?: string;
  branchIds?: string[];
};

export const listWarehouseNodes = async (query: ListQuery) => {
  const { page, limit, sort, skip } = parsePagination(query);
  const filter: Record<string, unknown> = {};
  if (query.type) filter.type = query.type;
  if (query.parentId) filter.parentId = new Types.ObjectId(query.parentId);

  // RBAC: Filter by Branch
  if (query.branchIds && query.branchIds.length > 0) {
    filter.branchId = { $in: query.branchIds.map(id => new Types.ObjectId(id)) };
  }
  if (query.query) {
    const regex = new RegExp(query.query, 'i');
    filter.$or = [{ name: regex }, { barcode: regex }, { code: regex }];
  }

  const [total, nodes] = await Promise.all([
    WarehouseNodeModel.countDocuments(filter),
    WarehouseNodeModel.find(filter).sort(sort).skip(skip).limit(limit).lean()
  ]);

  return buildPagedResponse(
    nodes.map((node) => ({
      id: node._id.toString(),
      type: node.type,
      name: node.name,
      code: node.code,
      parentId: node.parentId?.toString() ?? null,
      barcode: node.barcode,
      capacity: (node as any).capacity ?? 0,
      warehouseType: (node as any).warehouseType ?? null,
      address: (node as any).address ?? null,
      city: (node as any).city ?? null,
      province: (node as any).province ?? null,
      lat: (node as any).lat ?? null,
      lng: (node as any).lng ?? null,
      notes: (node as any).notes ?? null
    })),
    total,
    { page, limit, sort, skip }
  );
};

export const getWarehouseTree = async (branchIds?: string[]) => {
  const filter: any = {};
  if (branchIds && branchIds.length > 0) {
    filter.branchId = { $in: branchIds.map(id => new Types.ObjectId(id)) };
  }
  const nodes = await WarehouseNodeModel.find(filter).lean();
  const map = new Map<string, any>();
  nodes.forEach((node) => {
    map.set(node._id.toString(), {
      id: node._id.toString(),
      type: node.type,
      name: node.name,
      code: node.code,
      barcode: node.barcode,
      warehouseType: (node as any).warehouseType ?? null,
      parentId: node.parentId?.toString() ?? null,
      capacity: (node as any).capacity ?? 0,
      // Pass location info in tree
      address: (node as any).address,
      city: (node as any).city,
      province: (node as any).province,
      lat: (node as any).lat,
      lng: (node as any).lng,
      notes: (node as any).notes,
      children: [] as any[]
    });
  });
  const roots: any[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

export const createWarehouseNode = async (
  payload: {
    type: WarehouseNodeType;
    name: string;
    code: string;
    parentId?: string;
    barcode?: string;
    capacity?: number;
    warehouseType?: string | null;
    address?: string;
    city?: string;
    province?: string;
    lat?: number;
    lng?: number;
    notes?: string;
  },
  actorId: string
) => {
  const existing = await WarehouseNodeModel.findOne({ code: payload.code }).lean();
  if (existing) {
    throw conflict('Warehouse code already exists');
  }
  const parent = await validateParentChain(payload.type, payload.parentId);
  if (payload.type === 'warehouse' && !payload.warehouseType) {
    throw badRequest('warehouseType is required for warehouse nodes');
  }
  if (payload.type !== 'warehouse' && payload.warehouseType) {
    // Clean up
    delete (payload as any).warehouseType;
  }

  // Auto-generate barcode if missing, using hierarchical pattern if parent exists
  if (!payload.barcode) {
    if (parent) {
      const parentPrefix = parent.barcode || parent.code;
      // Simple concatenation: PARENT-CHILD
      // Use clean code part only?
      // Let's us code.
      (payload as any).barcode = `${parentPrefix}-${payload.code}`;
    } else {
      (payload as any).barcode = payload.code;
    }
  }

  // Auto-set branchId for location-based RBAC
  let branchId = null;
  if (parent) {
    branchId = (parent as any).branchId || parent._id;
  }

  if (parent) {
    await ensureParentCapacityAllows(parent, payload.capacity);
  }

  const node = await WarehouseNodeModel.create({
    ...payload,
    parentId: parent ? (parent._id as Types.ObjectId) : null,
    branchId
  });

  if (payload.type === 'warehouse') {
    node.branchId = node._id as any;
    await node.save();
  }
  await recordAudit({
    action: 'warehouse.created',
    entity: 'WarehouseNode',
    entityId: node._id,
    actorId,
    payload
  });
  return node.toObject();
};

export const updateWarehouseNode = async (
  id: string,
  payload: Partial<{
    name: string;
    barcode: string;
    parentId: string | null;
    warehouseType?: string | null;
    capacity?: number;
    address?: string;
    city?: string;
    province?: string;
    lat?: number;
    lng?: number;
    notes?: string;
  }>,
  actorId: string
) => {
  const node = await WarehouseNodeModel.findById(new Types.ObjectId(id));
  if (!node) {
    throw notFound('Warehouse node not found');
  }
  let parent: WarehouseNodeDocument | null = null;
  if (payload.parentId !== undefined) {
    parent = await validateParentChain(node.type as WarehouseNodeType, payload.parentId);
    node.parentId = parent ? (parent._id as Types.ObjectId) : null;
  }
  if (payload.name) node.name = payload.name;
  if (typeof payload.barcode !== 'undefined') node.barcode = payload.barcode;
  if (typeof payload.capacity !== 'undefined') node.capacity = payload.capacity;

  if (typeof payload.address !== 'undefined') node.address = payload.address;
  if (typeof payload.city !== 'undefined') node.city = payload.city;
  if (typeof payload.province !== 'undefined') node.province = payload.province;
  if (typeof payload.lat !== 'undefined') node.lat = payload.lat;
  if (typeof payload.lng !== 'undefined') node.lng = payload.lng;
  if (typeof payload.notes !== 'undefined') node.notes = payload.notes;

  if (typeof payload.warehouseType !== 'undefined') {
    // only allow warehouseType on warehouse nodes
    if (node.type === 'warehouse') {
      node.warehouseType = payload.warehouseType as any;
    }
  }

  const parentIdToCheck = payload.parentId !== undefined
    ? payload.parentId
    : node.parentId?.toString();
  if (parentIdToCheck) {
    if (!parent) {
      parent = await WarehouseNodeModel.findById(new Types.ObjectId(parentIdToCheck));
    }
    if (parent) {
      const effectiveCapacity = typeof payload.capacity === 'number'
        ? payload.capacity
        : (node.capacity || 0);
      await ensureParentCapacityAllows(parent, effectiveCapacity, node._id as Types.ObjectId);
    }
  }

  if (typeof payload.capacity === 'number' && payload.capacity > 0) {
    const childTotal = await sumChildCapacities(node._id as Types.ObjectId);
    if (childTotal > payload.capacity) {
      throw badRequest(
        `Total child capacity (${childTotal}) exceeds parent capacity (${payload.capacity})`
      );
    }
  }
  await node.save();
  await recordAudit({
    action: 'warehouse.updated',
    entity: 'WarehouseNode',
    entityId: node._id,
    actorId,
    payload
  });
  return node.toObject();
};

export const deleteWarehouseNode = async (id: string, actorId: string) => {
  const hasChildren = await WarehouseNodeModel.exists({ parentId: new Types.ObjectId(id) });
  if (hasChildren) {
    throw badRequest('Cannot delete node with children');
  }
  const node = await WarehouseNodeModel.findByIdAndDelete(new Types.ObjectId(id));
  if (!node) {
    throw notFound('Warehouse node not found');
  }
  await recordAudit({
    action: 'warehouse.deleted',
    entity: 'WarehouseNode',
    entityId: node._id,
    actorId,
    payload: { code: node.code }
  });
  return true;
};

export const resolveDefaultBin = async () => {
  const node = await WarehouseNodeModel.findOne({ type: 'bin' }).sort({ createdAt: 1 }).lean();
  if (!node) {
    throw notFound('Default bin not configured');
  }
  return node._id.toString();
};

export const suggestPutAway = async (productId: string, qty: number): Promise<string | null> => {
  const { ProductModel } = await import('../models/product.model.js');
  const product = await ProductModel.findById(productId).lean();
  if (!product) return null;

  // 1. Prioritize Preferred Product Bins
  const preferredBin = await WarehouseNodeModel.findOne({
    type: 'bin',
    preferredProductIds: new Types.ObjectId(productId)
  }).lean();
  if (preferredBin && await hasCapacity(preferredBin as any, qty)) {
    return preferredBin._id.toString();
  }

  // 2. Filter by Allowed Categories
  if (product.categoryId) {
    const categoryBins = await WarehouseNodeModel.find({
      type: 'bin',
      allowedCategories: new Types.ObjectId(product.categoryId as any)
    }).lean();

    for (const bin of categoryBins) {
      if (await hasCapacity(bin as any, qty)) return bin._id.toString();
    }
  }

  // 3. Fallback: Any Bin with capacity
  const allBins = await WarehouseNodeModel.find({ type: 'bin' }).lean();
  for (const bin of allBins) {
    if (await hasCapacity(bin as any, qty)) return bin._id.toString();
  }

  return null;
};

const hasCapacity = async (bin: WarehouseNode, qty: number): Promise<boolean> => {
  if (!bin.capacity || bin.capacity === 0) return true;

  const result = await InventoryModel.aggregate([
    { $match: { locationId: (bin as any)._id } },
    { $group: { _id: null, total: { $sum: '$quantity' } } }
  ]);
  const currentQty = result[0]?.total || 0;
  return (currentQty + qty) <= bin.capacity;
};
