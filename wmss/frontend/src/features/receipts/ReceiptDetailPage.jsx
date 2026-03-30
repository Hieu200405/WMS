import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { apiClient } from '../../services/apiClient.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { InfoCard } from '../../components/InfoCard.jsx';
import { PDFExport } from '../../components/PDFButton.jsx';
import { AuditLogViewer } from '../../components/AuditLogViewer.jsx';

export function ReceiptDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient(`/receipts/${id}`);
        setReceipt(res.data);

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  if (!receipt) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('app.back')}
        </button>
        <p className="text-sm text-rose-500">Receipt not found.</p>
      </div>
    );
  }

  const supplierName = receipt.supplier?.name ?? receipt.supplierName ?? receipt.supplierId;
  const hasBatch = (receipt.lines || []).some((line) => line.batch);
  const hasExpiry = (receipt.lines || []).some((line) => line.expDate);
  const metadata = {
    'Trạng thái': receipt.status,
    'Ghi chú': receipt.notes,
    'Tổng cộng': formatCurrency(receipt.total)
  };
  if (receipt.rejectedNote) {
    metadata['Lý do từ chối'] = receipt.rejectedNote;
  }

  // Prepare PDF data
  const pdfColumns = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Tên sản phẩm' },
    { key: 'quantity', header: 'Số lượng', export: (val) => val?.toLocaleString('vi-VN') },
    { key: 'price', header: 'Đơn giá', export: (val) => formatCurrency(val) },
    { key: 'total', header: 'Thành tiền', export: (val) => formatCurrency(val) }
  ];

  const pdfRows = receipt.lines.map(line => ({
    sku: line.sku || '-',
    name: line.name || line.productName || 'Product',
    quantity: line.quantity || line.qty,
    price: line.price || line.priceIn,
    total: (line.quantity || line.qty) * (line.price || line.priceIn)
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('app.back')}
        </button>
        <div className="flex items-center gap-3">
          <PDFExport
            title="PHIẾU NHẬP KHO"
            fileName={`phieu-nhap-${receipt.code || receipt.id}.pdf`}
            columns={pdfColumns}
            rows={pdfRows}
            documentType="receipt"
            documentNumber={receipt.code || receipt.id}
            documentDate={receipt.date}
            companyInfo={{
              name: 'Hệ Thống Quản Lý Kho',
              address: 'Địa chỉ công ty',
              phone: '0123-456-789',
              email: 'contact@wms.local'
            }}
            partnerInfo={receipt.supplier ? {
              name: receipt.supplier.name,
              address: receipt.supplier.address,
              phone: receipt.supplier.contact
            } : null}
            metadata={metadata}
            showSignature={true}
          />
          <StatusBadge status={receipt.status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InfoCard title="Receipt ID" value={receipt.code || receipt.id} />
        <InfoCard title={t('receipts.date')} value={formatDate(receipt.date)} />
        <InfoCard title={t('receipts.supplier')} value={supplierName} />
        <InfoCard title={t('app.total')} value={formatCurrency(receipt.total)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t('app.lineItems')}
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/40 dark:text-slate-300">
              <tr>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">{t('products.name')}</th>
                {hasBatch ? <th className="px-4 py-2">Lô</th> : null}
                {hasExpiry ? <th className="px-4 py-2">Hạn sử dụng</th> : null}
                <th className="px-4 py-2 text-right">Số lượng</th>
                <th className="px-4 py-2 text-right">{t('products.priceIn')}</th>
                <th className="px-4 py-2 text-right">{t('app.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {receipt.lines.map((line, idx) => (
                <tr key={line.id || idx}>
                  <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">{line.sku || '-'}</td>
                  <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">{line.name || line.productName || 'Product'}</td>
                  {hasBatch ? (
                    <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">{line.batch || '-'}</td>
                  ) : null}
                  {hasExpiry ? (
                    <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">
                      {line.expDate ? formatDate(line.expDate) : '-'}
                    </td>
                  ) : null}
                  <td className="px-4 py-2 text-right text-sm text-slate-600 dark:text-slate-300">
                    {line.quantity || line.qty}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-slate-600 dark:text-slate-300">
                    {formatCurrency(line.price || line.priceIn)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-slate-700 dark:text-slate-200">
                    {formatCurrency((line.quantity || line.qty) * (line.price || line.priceIn))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {receipt.notes ? <InfoCard title={t('Ghi chú')} value={receipt.notes} /> : null}
        {receipt.rejectedNote ? <InfoCard title="Lý do từ chối" value={receipt.rejectedNote} /> : null}
      </div>
    </div>
  );
}

