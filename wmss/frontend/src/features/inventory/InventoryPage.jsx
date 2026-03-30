import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../../components/DataTable.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { apiClient } from '../../services/apiClient.js';
import { formatNumber } from '../../utils/formatters.js';
import toast from 'react-hot-toast';
import { FileSpreadsheet } from 'lucide-react';
import { ReplenishmentModal } from './ReplenishmentModal.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';

export function InventoryPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [openProductId, setOpenProductId] = useState(null);

  // Replenishment State
  const [replenishModalOpen, setReplenishModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [invRes, prodRes, catRes] = await Promise.all([
          apiClient('/inventory'),
          apiClient('/products'),
          apiClient('/categories')
        ]);
        setInventory(invRes.data || []);
        setProducts(prodRes.data || []);
        setCategories(catRes.data || []);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);

  const inventorySummary = useMemo(() => {
    const map = new Map();
    inventory.forEach((item) => {
      if (item.quantity <= 0) return;
      const entry = map.get(item.productId) || {
        id: item.productId,
        productId: item.productId,
        totalQty: 0,
        statuses: new Set(),
        items: []
      };
      entry.totalQty += item.quantity;
      entry.statuses.add((item.status || 'available').toLowerCase());
      entry.items.push(item);
      map.set(item.productId, entry);
    });
    return Array.from(map.values()).map((entry) => ({
      id: entry.id,
      productId: entry.productId,
      totalQty: entry.totalQty,
      status: entry.statuses.size === 1 ? Array.from(entry.statuses)[0] : 'mixed',
      items: entry.items
    }));
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventorySummary.filter((item) => {
      if (!categoryFilter) return true;
      const product = productMap.get(item.productId);
      return product?.categoryId === categoryFilter;
    });
  }, [inventorySummary, categoryFilter, productMap]);

  const handleExport = async () => {
    try {
      const blob = await apiClient('/inventory/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Inventory-Report-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (e) {
      toast.error('Failed to export inventory');
    }
  };

  const handleCheckReplenishment = async () => {
    const toastId = toast.loading(t('inventory.messages.checking'));
    try {
      const res = await apiClient('/inventory/replenishment/check');
      setSuggestions(res.data || []);
      setReplenishModalOpen(true);
      toast.dismiss(toastId);
      if (res.data?.length === 0) {
        toast.success(t('inventory.messages.sufficient'));
      }
    } catch (err) {
      toast.error(t('inventory.messages.checkError') + ': ' + err.message, { id: toastId });
    }
  };

  const handleExecReplenishment = async (selectedSuggestions) => {
    try {
      await apiClient('/inventory/replenishment/exec', {
        method: 'POST',
        body: { suggestions: selectedSuggestions }
      });
      toast.success(t('inventory.messages.createSuccess', { count: selectedSuggestions.length }));
      // Optionally refresh inventory if anything changed immediately? 
      // Receipts are drafts so inventory wont change yet.
    } catch (err) {
      toast.error(t('inventory.messages.createError') + ': ' + err.message);
      throw err;
    }
  };

  return (
    <div className="space-y-8 animate-in">
      <PageHeader
        title={t('navigation.inventory')}
        description={t('inventory.subtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={categoryFilter}
              className="input !py-2 !h-11 !rounded-2xl !bg-slate-100/50 dark:!bg-slate-900/50 min-w-[150px]"
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">{t('inventory.allCategories')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleExport}
              className="btn border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 !h-11 !rounded-2xl"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t('app.exportExcel')}
            </button>
          </div>
        }
      />

      <DataTable
        data={filteredInventory}
        loading={loading}
        columns={[
          {
            key: 'productId',
            header: t('inventory.product'),
            render: (value) => {
              const product = productMap.get(value);
              if (!product) return value;
              return (
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{product.name}</div>
                  <div className="text-xs text-slate-500">{product.sku}</div>
                </div>
              );
            },
          },
          {
            key: 'totalQty',
            header: t('inventory.quantity'),
            headerAlign: 'right',
            render: (value) => <div className="text-right font-medium">{formatNumber(value)}</div>,
          },
          {
            key: 'status',
            header: t('app.status'),
            render: (value) => <StatusBadge status={value} />,
          },
          {
            key: 'actions',
            header: t('inventory.location'),
            sortable: false,
            render: (_, row) => (
              <div className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenProductId((current) => (current === row.productId ? null : row.productId));
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t('inventory.viewLocation')}
                </button>
                {openProductId === row.productId ? (
                  <div className="absolute right-0 z-20 mt-2 w-96 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('inventory.locationList')}</div>
                    <div className="max-h-64 space-y-2 overflow-auto">
                      {row.items.map((item, idx) => {
                        const loc = item.location || { name: item.locationId, code: '' };
                        const exp = item.expDate ? new Date(item.expDate).toLocaleDateString() : '-';
                        return (
                          <div key={`${item.locationId}-${idx}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                            <div className="font-semibold">{loc.code ? `${loc.code} - ${loc.name}` : loc.name}</div>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <span>{t('inventory.quantity')}: {formatNumber(item.quantity)}</span>
                              <span>{t('inventory.batch')}: {item.batch || '-'}</span>
                              <span>{t('inventory.expiry')}: {exp}</span>
                              <StatusBadge status={item.status} />
                            </div>
                          </div>
                        );
                      })}
                      {row.items.length === 0 ? <div>{t('inventory.noLocation')}</div> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ),
          },
        ]}
      />

      <ReplenishmentModal
        open={replenishModalOpen}
        onClose={() => setReplenishModalOpen(false)}
        suggestions={suggestions}
        onConfirm={handleExecReplenishment}
      />
    </div>
  );
}
