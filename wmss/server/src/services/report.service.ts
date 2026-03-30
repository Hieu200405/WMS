import { Types, type PipelineStage } from 'mongoose';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { InventoryModel } from '../models/inventory.model.js';
import { ProductModel } from '../models/product.model.js';
import { ReceiptModel } from '../models/receipt.model.js';
import { DeliveryModel } from '../models/delivery.model.js';
import { StocktakeModel } from '../models/stocktake.model.js';
import { AdjustmentModel } from '../models/adjustment.model.js';
import { ReturnModel } from '../models/return.model.js';
import { IncidentModel } from '../models/incident.model.js';
import { FinancialTransactionModel } from '../models/transaction.model.js';

import { notFound } from '../utils/errors.js';

const toObject = (doc: unknown) => JSON.parse(JSON.stringify(doc));

// Date filter options for reports
export interface DateFilterOptions {
  startDate?: Date;
  endDate?: Date;
}

export const getDashboardStats = async (options: DateFilterOptions = {}) => {
  const { startDate, endDate } = options;

  // Build date filter for queries
  const dateFilter: any = {};
  if (startDate) dateFilter.$gte = startDate;
  if (endDate) {
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    dateFilter.$lte = endOfDay;
  }
  // 1. Basic Counts
  const [
    productsCount,
    pendingReceipts,
    pendingDeliveries,
    openIncidents,
    totalInventoryValueResult
  ] = await Promise.all([
    ProductModel.countDocuments(),
    ReceiptModel.countDocuments({ status: { $nin: ['completed', 'rejected'] } }),
    DeliveryModel.countDocuments({ status: { $ne: 'completed' } }),
    IncidentModel.countDocuments({ status: { $ne: 'resolved' } }),
    InventoryModel.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$quantity', '$product.priceIn'] } }
        }
      }
    ])
  ]);

  const totalInventoryValue = totalInventoryValueResult[0]?.totalValue || 0;

  // 2. Revenue/Expense Chart
  // Only filter by date if explicitly provided - NO FALLBACK to default range
  const ftMatchFilter: any = {};
  if (startDate || endDate) {
    ftMatchFilter.date = {};
    if (startDate) ftMatchFilter.date.$gte = startDate;
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      ftMatchFilter.date.$lte = endOfDay;
    }
  }

  // Use FinancialTransactionModel for accurate financial data
  const ftPipeline: any[] = [];
  if (Object.keys(ftMatchFilter).length > 0) {
    ftPipeline.push({ $match: ftMatchFilter });
  }

  const ftData = await FinancialTransactionModel.aggregate([
    ...(Object.keys(ftMatchFilter).length > 0 ? [{ $match: ftMatchFilter }] : []),
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$date' } },
          type: '$type'
        },
        total: { $sum: '$amount' }
      }
    }
  ]);

  const chartDataMap = new Map<string, { name: string; income: number; expense: number }>();

  // Build chart data directly from database results - no pre-generation
  // This ensures empty data when filter has no matches
  ftData.forEach((item: any) => {
    const key = item._id.month;
    if (!chartDataMap.has(key)) {
      chartDataMap.set(key, { name: key, income: 0, expense: 0 });
    }
    const entry = chartDataMap.get(key)!;
    if (item._id.type === 'revenue' || item._id.type === 'income') entry.income += item.total;
    if (item._id.type === 'expense' || item._id.type === 'payment') entry.expense += item.total;
  });

  const revenueChart = Array.from(chartDataMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // 3. Inventory Status for Pie Chart
  const inventoryStatus = await InventoryModel.aggregate([
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $project: {
        status: {
          $switch: {
            branches: [
              { case: { $eq: ['$quantity', 0] }, then: 'Out of Stock' },
              { case: { $lt: ['$quantity', '$product.minStock'] }, then: 'Low Stock' }
            ],
            default: 'Available'
          }
        }
      }
    },
    {
      $group: {
        _id: '$status',
        value: { $sum: 1 }
      }
    }
  ]);

  // 4. ABC Analysis Summary
  const abcAnalysis = await import('./abc-analysis.service.js').then(s => s.calculateABCAnalysis());

  // 5. Expiry Status
  const { getSoonToExpireInventory } = await import('./inventory.service.js');
  const expiringSoonItems = await getSoonToExpireInventory(30);

  // 6. AI Predictive Insights (Simulated via Sales Velocity)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSales = await DeliveryModel.aggregate([
    { $match: { status: 'completed', date: { $gte: thirtyDaysAgo } } },
    { $unwind: '$lines' },
    { $group: { _id: '$lines.productId', totalSold: { $sum: '$lines.qty' } } }
  ]);

  const salesMap = new Map(recentSales.map(s => [s._id.toString(), s.totalSold]));

  const criticalItems = [];
  const inventories = await InventoryModel.aggregate([
    { $group: { _id: '$productId', totalQty: { $sum: '$quantity' } } }
  ]);

  for (const inv of inventories) {
    const sold = salesMap.get(inv._id.toString()) || 0;
    if (sold > 0) {
      const velocity = sold / 30; // units per day
      const daysLeft = inv.totalQty / velocity;
      if (daysLeft < 10) { // Predicted run-out within 10 days
        const product = await ProductModel.findById(inv._id).select('name sku').lean();
        criticalItems.push({
          name: product?.name,
          sku: product?.sku,
          daysLeft: Math.round(daysLeft),
          velocity: velocity.toFixed(2)
        });
      }
    }
  }

  return {
    counts: {
      products: productsCount,
      pendingReceipts,
      pendingDeliveries,
      openIncidents,
      expiringSoon: expiringSoonItems.length
    },
    totalInventoryValue,
    revenueChart,
    inventoryStatus: inventoryStatus.map((item: any) => ({ name: item._id, value: item.value })),
    abcAnalysis: [
      { name: 'Loại A (Giá trị cao)', value: abcAnalysis.summary.A },
      { name: 'Loại B (Trung bình)', value: abcAnalysis.summary.B },
      { name: 'Loại C (Giá trị thấp)', value: abcAnalysis.summary.C }
    ],
    predictiveInsights: criticalItems
  };
};

export const getInventoryReport = async () => {
  const rows = await InventoryModel.aggregate([
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$productId',
        sku: { $first: '$product.sku' },
        name: { $first: '$product.name' },
        totalQty: { $sum: '$quantity' },
        minStock: { $first: '$product.minStock' }
      }
    },
    {
      $project: {
        _id: 0,
        productId: '$_id',
        sku: 1,
        name: 1,
        totalQty: 1,
        minStock: 1,
        status: {
          $cond: [{ $lt: ['$totalQty', '$minStock'] }, 'belowMin', 'ok']
        }
      }
    }
  ]);
  return rows.map(toObject);
};

const groupByDate = (field: string): PipelineStage[] => [
  {
    $addFields: {
      totalQty: { $sum: '$lines.qty' }
    }
  },
  {
    $group: {
      _id: {
        $dateToString: { format: '%Y-%m-%d', date: `$${field}` }
      },
      totalQty: { $sum: '$totalQty' },
      documents: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 as const } }
];

export const getInboundReport = async (options: DateFilterOptions = {}) => {
  const { startDate, endDate } = options;

  // Build match stage for date filtering
  const matchStage: any[] = [];
  if (startDate || endDate) {
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter.$lte = endOfDay;
    }
    matchStage.push({ $match: { date: dateFilter } });
  }

  const rows = await ReceiptModel.aggregate([...matchStage, ...groupByDate('date')]);
  return rows.map((row) => ({
    date: row._id,
    totalQty: row.totalQty,
    documents: row.documents
  }));
};

export const getOutboundReport = async (options: DateFilterOptions = {}) => {
  const { startDate, endDate } = options;

  // Build match stage for date filtering
  const matchStage: any[] = [];
  if (startDate || endDate) {
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter.$lte = endOfDay;
    }
    matchStage.push({ $match: { date: dateFilter } });
  }

  const rows = await DeliveryModel.aggregate([...matchStage, ...groupByDate('date')]);
  return rows.map((row) => ({
    date: row._id,
    totalQty: row.totalQty,
    documents: row.documents
  }));
};

export const getStocktakeReport = async (options: DateFilterOptions = {}) => {
  const { startDate, endDate } = options;

  // Build match stage for date filtering
  const matchStage: any[] = [];
  if (startDate || endDate) {
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter.$lte = endOfDay;
    }
    matchStage.push({ $match: { date: dateFilter } });
  }

  const rows = await StocktakeModel.aggregate([
    ...matchStage,
    {
      $project: {
        code: 1,
        status: 1,
        date: 1,
        discrepancies: {
          $sum: {
            $map: {
              input: '$items',
              as: 'item',
              in: { $abs: { $subtract: ['$$item.countedQty', '$$item.systemQty'] } }
            }
          }
        }
      }
    },
    { $sort: { date: -1 as const } }
  ]);
  return rows.map(toObject);
};

const fontDir = path.resolve(process.cwd(), 'src/assets/fonts');

const fontRegularPath = path.join(fontDir, 'NotoSans-Regular.ttf');
const fontBoldPath = path.join(fontDir, 'NotoSans-Bold.ttf');

export const createPdfBuffer = async (title: string, data: any) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Helper for Vietnamese fonts
    const useFont = (isBold = false) => {
      try {
        if (isBold && fs.existsSync(fontBoldPath)) return doc.font(fontBoldPath);
        if (fs.existsSync(fontRegularPath)) return doc.font(fontRegularPath);
      } catch { }
      return doc;
    };

    // 1. Header
    useFont(true).fontSize(20).text('WMS MANAGEMENT SYSTEM', { align: 'center' });
    doc.fontSize(10).text(new Date().toLocaleString('vi-VN'), { align: 'center' });
    doc.moveDown(2);

    // 2. Title
    useFont(true).fontSize(16).text(title, { underline: true });
    doc.moveDown();

    // 3. Content
    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      const colWidth = (doc.page.width - 80) / headers.length;
      let y = doc.y;

      // Draw Table Header
      useFont(true).fontSize(10);
      headers.forEach((h, i) => {
        doc.text(h.toUpperCase(), 40 + i * colWidth, y, { width: colWidth, align: 'left' });
      });

      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(0.5);

      // Draw Rows
      useFont(false).fontSize(9);
      data.forEach((row: any) => {
        // Check if we need a new page
        if (doc.y > doc.page.height - 60) {
          doc.addPage();
          y = 40;
        }

        const startY = doc.y;
        let maxHeight = 0;

        headers.forEach((h, i) => {
          const val = row[h];
          const text = typeof val === 'object' ? JSON.stringify(val) : String(val);
          doc.text(text, 40 + i * colWidth, startY, { width: colWidth - 10, align: 'left' });
          if (doc.y - startY > maxHeight) maxHeight = doc.y - startY;
        });

        doc.y = startY + Math.max(maxHeight, 15);
        doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#eeeeee').stroke();
        doc.y += 5;
      });
    } else {
      // Single object or empty
      useFont(false).fontSize(12);
      doc.text(JSON.stringify(data, null, 2));
    }

    // 4. Footer
    const pageCount = (doc as any)._pageBuffer ? (doc as any)._pageBuffer.length : 1;
    doc.fontSize(8).text(
      `Trang 1 / ${pageCount} - Tài liệu nội bộ WMS`,
      40,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();
  });
};

export const generateInvoicePdf = async (deliveryId: string) => {
  const delivery = await DeliveryModel.findById(new Types.ObjectId(deliveryId))
    .populate('customerId', 'name address phone email')
    .populate('lines.productId', 'name sku unit')
    .lean();

  if (!delivery) throw notFound('Delivery not found');

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const useFont = (isBold = false) => {
      try {
        if (isBold && fs.existsSync(fontBoldPath)) return doc.font(fontBoldPath);
        if (fs.existsSync(fontRegularPath)) return doc.font(fontRegularPath);
      } catch { }
      return doc;
    };

    // 1. Company Header
    useFont(true).fontSize(24).text('WMS INVOICE', { align: 'right' });
    doc.fontSize(10).text('Công ty TNHH WMS Việt Nam', 40, 40);
    doc.text('Địa chỉ: 123 Đường ABC, Quận 1, TP. HCM', 40, 55);
    doc.text('Hotline: 1900 1234', 40, 70);
    doc.moveDown(3);

    // 2. Info Grid
    const yInfo = doc.y;
    useFont(true).fontSize(12).text('BÊN MUA HÀNG (CUSTOMER):', 40, yInfo);
    useFont(false).text((delivery.customerId as any).name || 'Khách lẻ', 40, yInfo + 15);
    doc.text((delivery.customerId as any).address || '-', 40, yInfo + 30);
    doc.text((delivery.customerId as any).phone || '-', 40, yInfo + 45);

    useFont(true).text('THÔNG TIN ĐƠN HÀNG:', 350, yInfo);
    useFont(false).text(`Mã hóa đơn: ${delivery.code}`, 350, yInfo + 15);
    doc.text(`Ngày xuất: ${new Date(delivery.date).toLocaleDateString('vi-VN')}`, 350, yInfo + 30);
    doc.text(`Trạng thái: ${delivery.status.toUpperCase()}`, 350, yInfo + 45);
    doc.moveDown(4);

    // 3. Table Header
    let yTable = doc.y;
    const cols = { sku: 40, name: 140, qty: 350, price: 420, total: 500 };
    doc.rect(40, yTable, 515, 20).fill('#f1f5f9');
    doc.fillColor('#000000');
    useFont(true).fontSize(10);
    doc.text('SKU', cols.sku + 5, yTable + 5);
    doc.text('SẢN PHẨM', cols.name, yTable + 5);
    doc.text('SL', cols.qty, yTable + 5);
    doc.text('ĐƠN GIÁ', cols.price, yTable + 5);
    doc.text('THÀNH TIỀN', cols.total, yTable + 5);

    yTable += 25;
    useFont(false);
    let totalAll = 0;

    delivery.lines.forEach((line: any) => {
      const lineTotal = line.qty * line.priceOut;
      totalAll += lineTotal;

      doc.text(line.productId.sku, cols.sku + 5, yTable, { width: 90 });
      doc.text(line.productId.name, cols.name, yTable, { width: 200 });
      doc.text(line.qty.toString(), cols.qty, yTable);
      doc.text(line.priceOut.toLocaleString('vi-VN'), cols.price, yTable);
      doc.text(lineTotal.toLocaleString('vi-VN'), cols.total, yTable);

      yTable += 25;
      if (line.serials && line.serials.length > 0) {
        doc.fillColor('#666666').fontSize(8).text(`Serials: ${line.serials.join(', ')}`, cols.name, yTable - 10);
        doc.fillColor('#000000').fontSize(10);
        yTable += 10;
      }
      doc.moveTo(40, yTable - 5).lineTo(555, yTable - 5).strokeColor('#eeeeee').stroke();
    });

    // 4. Summary
    doc.moveDown(2);
    const ySum = doc.y + 20;
    doc.moveTo(350, ySum).lineTo(555, ySum).strokeColor('#000000').stroke();
    useFont(true).fontSize(12).text('TỔNG THANH TOÁN:', 350, ySum + 10);
    doc.text(`${totalAll.toLocaleString('vi-VN')} VND`, 500, ySum + 10, { align: 'right' });

    // 5. Signature
    doc.moveDown(4);
    const ySign = doc.y;
    doc.text('Người lập phiếu', 80, ySign);
    doc.text('Khách hàng ký nhận', 400, ySign);
    doc.fontSize(8).text('(Ký, ghi rõ họ tên)', 80, ySign + 15);
    doc.fontSize(8).text('(Ký, ghi rõ họ tên)', 400, ySign + 15);

    doc.end();
  });
};
