import { useState, useEffect } from 'react';
import { PDFButton } from '../../components/PDFButton.jsx';
import { apiClient } from '../../services/apiClient.js';
import { useTranslation } from 'react-i18next';

export function PdfTestPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/products');
        setProducts(res.data || []);
      } catch (error) {
        console.error('Failed to fetch products', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const productColumns = [
    { key: 'sku', header: t('pdf.columns.sku') },
    { key: 'name', header: t('pdf.columns.name') },
    { key: 'category', header: t('pdf.columns.category') },
    { key: 'unit', header: t('pdf.columns.unit') },
    { key: 'priceOut', header: t('pdf.columns.priceOut') },
  ];

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredProducts = products.filter(p => {
    if (!startDate && !endDate) return true;
    const date = new Date(p.createdAt);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    // Reset hours for accurate dates comparison
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });

  const productRows = filteredProducts.map(p => ({
    sku: p.sku,
    name: p.name,
    category: p.categoryId?.name || p.category || '',
    unit: p.unit,
    priceOut: typeof p.priceOut === 'number'
      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.priceOut)
      : p.priceOut,
    createdAt: new Date(p.createdAt).toLocaleDateString()
  }));

  const productColumnsWithDate = [
    ...productColumns,
    { key: 'createdAt', header: t('pdf.columns.createdAt') }
  ];

  // Standardized dummy columns for reference
  const dummyColumns = [
    { key: 'name', header: t('pdf.columns.name') },
    { key: 'note', header: t('receipts.note') },
    { key: 'qty', header: t('inventory.quantity') },
  ];

  const dummyRows = [
    { name: 'Nguyễn Văn A', note: 'Kiểm tra hàng hóa', qty: 1000 },
    { name: 'Trần Thị B', note: 'Gửi trả', qty: 250 },
    { name: 'Lê Văn C', note: 'Nhập kho', qty: 540 },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2 text-slate-900 dark:text-slate-100">{t('pdf.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400">{t('pdf.description')}</p>
      </div>

      {/* Real Data Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('pdf.productList')}</h2>
              <p className="text-sm text-slate-500">{t('pdf.realData')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">{t('pdf.from')}:</span>
                <input
                  type="date"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 text-sm py-1.5 px-3 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">{t('pdf.to')}:</span>
                <input
                  type="date"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 text-sm py-1.5 px-3 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <PDFButton
                title={`${t('pdf.productList')} ${startDate ? `(${t('pdf.from')} ${startDate})` : ''} ${endDate ? `(${t('pdf.to')} ${endDate})` : ''}`}
                fileName={`products-report-${startDate || 'all'}-${endDate || 'all'}.pdf`}
                columns={productColumnsWithDate}
                rows={productRows}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500">{t('pdf.loading')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    {productColumnsWithDate.map(col => (
                      <th key={col.key} className="py-2 font-medium text-slate-500">{col.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productRows.length > 0 ? (
                    productRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                        {productColumnsWithDate.map(col => {
                          const value = row[col.key];
                          return (
                            <td key={col.key} className="py-2 text-slate-700 dark:text-slate-300">
                              {typeof value === 'object' && value !== null
                                ? (value.name || JSON.stringify(value))
                                : value}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={productColumnsWithDate.length} className="py-8 text-center text-slate-500 italic">
                        {t('pdf.noData')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="mt-2 text-xs text-center text-slate-400 italic">
                {t('pdf.showing', { count: Math.min(10, productRows.length), total: productRows.length })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dummy Data Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('pdf.testData')}</h2>
            <p className="text-sm text-slate-500">{t('pdf.testDesc')}</p>
          </div>
          <PDFButton
            title={t('pdf.sampleReport')}
            fileName="sample-report.pdf"
            columns={dummyColumns}
            rows={dummyRows}
          />
        </div>
      </div>
    </div>
  );
}

export default PdfTestPage;
