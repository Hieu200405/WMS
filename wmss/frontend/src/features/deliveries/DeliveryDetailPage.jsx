import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Truck } from 'lucide-react';
import { apiClient } from '../../services/apiClient.js';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { InfoCard } from '../../components/InfoCard.jsx';
import { PDFExport } from '../../components/PDFButton.jsx';
import { AuditLogViewer } from '../../components/AuditLogViewer.jsx';

export function DeliveryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState(null);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient(`/deliveries/${id}`);
        setDelivery(res.data);

        if (res.data.customerId) {
          try {
            const custRes = await apiClient(`/partners?type=customer&id=${res.data.customerId}`);
            if (Array.isArray(custRes.data)) {
              setCustomer(custRes.data.find(c => c.id === res.data.customerId));
            }
          } catch (e) { console.error('Failed to load customer', e); }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  if (!delivery) {
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
        <p className="text-sm text-rose-500">Delivery not found.</p>
      </div>
    );
  }

  const customerName = customer?.name ?? delivery.customerName ?? delivery.customerId;

  // Prepare PDF data
  const pdfColumns = [
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Tên sản phẩm' },
    { key: 'quantity', header: 'Số lượng', export: (val) => val?.toLocaleString('vi-VN') },
    { key: 'price', header: 'Đơn giá', export: (val) => formatCurrency(val) },
    { key: 'total', header: 'Thành tiền', export: (val) => formatCurrency(val) }
  ];

  const pdfRows = delivery.lines.map(line => ({
    sku: line.sku || '-',
    name: line.name || line.productName || 'Product',
    quantity: line.quantity || line.qty,
    price: line.price || line.priceOut,
    total: (line.quantity || line.qty) * (line.price || line.priceOut)
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
            title="PHIẾU XUẤT KHO"
            fileName={`phieu-xuat-${delivery.code || delivery.id}.pdf`}
            columns={pdfColumns}
            rows={pdfRows}
            documentType="delivery"
            documentNumber={delivery.code || delivery.id}
            documentDate={delivery.date}
            companyInfo={{
              name: 'Hệ Thống Quản Lý Kho',
              address: 'Địa chỉ công ty',
              phone: '0123-456-789',
              email: 'contact@wms.local'
            }}
            partnerInfo={customer ? {
              name: customer.name,
              address: customer.address,
              phone: customer.contact
            } : null}
            metadata={{
              'Trạng thái': delivery.status,
              'Ngày giao dự kiến': delivery.expectedDate ? formatDate(delivery.expectedDate) : '',
              'Ghi chú': delivery.notes || delivery.note,
              'Lý do từ chối': delivery.rejectedNote || '',
              'Tổng tiền': formatCurrency(delivery.total)
            }}
            showSignature={true}
          />
          <StatusBadge status={delivery.status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InfoCard title="Code" value={delivery.code || delivery.id} />
        <InfoCard title={t('deliveries.date')} value={formatDate(delivery.date)} />
        <InfoCard title="Expected Date" value={delivery.expectedDate ? formatDate(delivery.expectedDate) : '-'} />
        <InfoCard title={t('deliveries.customer')} value={customerName} />
        <InfoCard title={t('app.total')} value={formatCurrency(delivery.total)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Truck className="h-5 w-5 text-indigo-500" />
            Thông tin vận chuyển (Logistics)
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Đơn vị vận chuyển</p>
              <p className="font-medium text-slate-900 dark:text-white">{delivery.carrier || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Mã vận đơn (Waybill)</p>
              <p className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{delivery.trackingNumber || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Phí vận chuyển</p>
              <p className="font-medium text-slate-900 dark:text-white">{formatCurrency(delivery.shippingFee)}</p>
            </div>
            <div>
              <p className="text-slate-500">Dịch vụ</p>
              <p className="font-medium text-slate-900 dark:text-white">Giao hàng tiêu chuẩn</p>
            </div>
          </div>
        </div>
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
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">{t('products.priceOut')}</th>
                <th className="px-4 py-2 text-right">{t('app.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {delivery.lines.map((line, idx) => (
                <tr key={line.id || idx}>
                  <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">{line.sku || '-'}</td>
                  <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">{line.name || line.productName || 'Product'}</td>
                  <td className="px-4 py-2 text-right text-sm text-slate-600 dark:text-slate-300">
                    {line.quantity || line.qty}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-slate-600 dark:text-slate-300">
                    {formatCurrency(line.price || line.priceOut)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-slate-700 dark:text-slate-200">
                    {formatCurrency((line.quantity || line.qty) * (line.price || line.priceOut))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      <div className="grid gap-4 md:grid-cols-2">
        {delivery.notes || delivery.note ? (
          <InfoCard title={t('Ghi chú')} value={delivery.notes || delivery.note} />
        ) : null}
        {delivery.rejectedNote ? (
          <InfoCard title="Lý do từ chối" value={delivery.rejectedNote} />
        ) : null}
      </div>
    </div>
  );
}
