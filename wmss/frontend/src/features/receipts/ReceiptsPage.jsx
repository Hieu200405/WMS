import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { ArrowRight, Plus, FileSpreadsheet } from 'lucide-react';
import { DataTable } from '../../components/DataTable.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { DatePicker } from '../../components/forms/DatePicker.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { LineItemsEditor } from '../../components/LineItemsEditor.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { apiClient } from '../../services/apiClient.js';
import { ReceiptStatus, Roles } from '../../utils/constants.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { RoleGuard } from '../../components/RoleGuard.jsx';
import { useAuth } from '../../app/auth-context.jsx';
import { useSocket } from '../../app/socket-context.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';

const defaultForm = {
  code: '',
  supplierId: '',
  date: new Date().toISOString().slice(0, 10),
  lines: [
    {
      productId: '',
      quantity: 1,
      price: 0,
      locationId: '',
      batch: '',
      expDate: '',
    },
  ],
  hasShortage: false,
  shortageNote: '',
  damageNote: '',
  notes: ''
};

export function ReceiptsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [locations, setLocations] = useState([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, supRes, prodRes, locRes] = await Promise.all([
        apiClient('/receipts'),
        apiClient('/partners', { params: { type: 'supplier' } }),
        apiClient('/products'),
        apiClient('/warehouse', { params: { type: 'bin', limit: 1000 } }),
      ]);
      const supplierProductRes = await apiClient('/supplier-products', { params: { limit: 1000 } });
      setReceipts(recRes.data || []);
      setSuppliers(supRes.data || []);
      setProducts(prodRes.data || []);
      setSupplierProducts(supplierProductRes.data || []);
      setLocations(locRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error(t('receipts.errors.loadError'));
    } finally {
      setLoading(false);
    }
  }, []);

  const socket = useSocket();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (payload) => {
      if (payload.resource === 'receipt') {
        fetchData();
      }
    };
    socket.on('resource_update', handleUpdate);
    return () => {
      socket.off('resource_update', handleUpdate);
    };
  }, [socket, fetchData]);

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.name })),
    [suppliers],
  );

  const normalizeId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.id || value._id || '';
  };

  const supplierProductInfo = useMemo(() => {
    const bySupplier = new Map();
    const priceBySupplierProduct = new Map();
    supplierProducts.forEach((item) => {
      const supplierId = normalizeId(item.supplierId);
      const productId = normalizeId(item.productId);
      if (!supplierId || !productId) return;
      if (!bySupplier.has(supplierId)) {
        bySupplier.set(supplierId, new Set());
      }
      bySupplier.get(supplierId).add(productId);
      if (typeof item.priceIn === 'number') {
        priceBySupplierProduct.set(`${supplierId}:${productId}`, item.priceIn);
      }
    });
    return {
      hasData: supplierProducts.length > 0,
      bySupplier,
      priceBySupplierProduct
    };
  }, [supplierProducts]);

  const getAllowedProductIds = useCallback((supplierId) => {
    if (!supplierId) return new Set();
    if (supplierProductInfo.hasData) {
      return new Set(supplierProductInfo.bySupplier.get(supplierId) ?? []);
    }
    const fallback = products
      .filter((product) => (product.supplierIds || []).includes(supplierId))
      .map((product) => product.id);
    return new Set(fallback);
  }, [products, supplierProductInfo]);

  const getPriceForSupplierProduct = useCallback((supplierId, productId) => {
    if (!supplierId || !productId) return undefined;
    const key = `${supplierId}:${productId}`;
    if (supplierProductInfo.priceBySupplierProduct.has(key)) {
      return supplierProductInfo.priceBySupplierProduct.get(key);
    }
    const product = products.find((item) => item.id === productId);
    return typeof product?.priceIn === 'number' ? product.priceIn : undefined;
  }, [products, supplierProductInfo]);

  const filteredProducts = useMemo(() => {
    if (!form.supplierId) return products;
    const allowedIds = getAllowedProductIds(form.supplierId);
    return products.filter((product) => allowedIds.has(product.id));
  }, [form.supplierId, getAllowedProductIds, products]);

  const locationOptions = useMemo(
    () => locations.map((loc) => ({
      value: loc.id,
      label: `${loc.code} - ${loc.name}`
    })),
    [locations]
  );

  const handleSupplierChange = (event) => {
    const supplierId = event.target.value;
    setForm((prev) => {
      const allowedIds = getAllowedProductIds(supplierId);
      const nextLines = prev.lines.map((line) => {
        if (!line.productId) return line;
        if (!allowedIds.has(line.productId)) {
          return { ...line, productId: '', price: 0 };
        }
        const nextPrice = getPriceForSupplierProduct(supplierId, line.productId);
        if (typeof nextPrice === 'number') {
          return { ...line, price: nextPrice };
        }
        return line;
      });
      return {
        ...prev,
        supplierId,
        lines: nextLines
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.supplierId) {
      toast.error(t('receipts.errors.selectSupplier'));
      return;
    }

    const lines = form.lines
      .filter((line) => line.productId)
      .map((line) => ({
        productId: line.productId,
        qty: Number(line.quantity),
        priceIn: Number(line.price),
        locationId: line.locationId || '',
        batch: line.batch?.trim() || undefined,
        expDate: line.expDate || undefined
      }));

    if (lines.length === 0) {
      toast.error(t('receipts.errors.addProduct'));
      return;
    }

    const payload = {
      code: form.code || `PN-${Date.now()}`,
      supplierId: form.supplierId,
      date: form.date,
      lines,
      notes: form.notes || form.shortageNote || form.damageNote,
    };

    try {
      await apiClient('/receipts', { method: 'POST', body: payload });
      toast.success(t('notifications.saved'));
      setOpen(false);
      setForm(defaultForm);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || t('receipts.errors.createError'));
    }
  };

  const transition = async (receipt, status, note) => {
    try {
      await apiClient(`/receipts/${receipt.id}/transition`, {
        method: 'POST',
        body: { to: status, note }
      });
      toast.success(t('notifications.statusChanged'));
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || t('receipts.errors.updateError'));
    }
  };

  const [exportOpen, setExportOpen] = useState(false);
  const [exportRange, setExportRange] = useState({ startDate: '', endDate: '' });

  const handleExport = () => {
    setExportOpen(true);
  };

  const processExport = async () => {
    try {
      const params = {};
      if (exportRange.startDate) params.startDate = exportRange.startDate;
      if (exportRange.endDate) params.endDate = exportRange.endDate;

      const blob = await apiClient('/receipts/export', {
        responseType: 'blob',
        params
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipts-List-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setExportOpen(false);
    } catch (e) {
      toast.error(t('receipts.errors.exportError'));
    }
  };

  const columns = [
    { key: 'code', header: t('app.sku') },
    {
      key: 'supplierId',
      header: t('receipts.supplier'),
      render: (value, row) => {
        const supplierRef = row?.supplier ?? value;
        const supplierId = normalizeId(supplierRef);
        return (
          row?.supplier?.name ??
          suppliers.find((supplier) => supplier.id === supplierId)?.name ??
          supplierId ??
          value
        );
      },
    },
    {
      key: 'date',
      header: t('receipts.date'),
      render: (value) => formatDate(value),
    },
    {
      key: 'status',
      header: t('app.status'),
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'totalAmount',
      header: t('app.total'),
      render: (value, row) => {
        if (typeof value === 'number') return formatCurrency(value);
        const total = (row?.lines || []).reduce(
          (sum, line) => sum + (Number(line.qty) || 0) * (Number(line.priceIn) || 0),
          0
        );
        return formatCurrency(total);
      },
    },
    {
      key: 'actions',
      header: t('app.actions'),
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/receipts/${row.id}`)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {t('receipts.detail')}
          </button>
          {availableActions(row, user?.role, t).map((action) => (
            <RoleGuard key={action.status} roles={action.roles}>
              <button
                type="button"
                onClick={() => {
                  if (action.requiresNote) {
                    setRejectTarget(row);
                    setRejectNote('');
                    setRejectOpen(true);
                    return;
                  }
                  // Navigate to supplier portal for confirmation
                  if (action.status === 'supplierConfirmed') {
                    navigate(`/receipts/${row.id}/supplier-confirm`);
                    return;
                  }
                  transition(row, action.status);
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold text-white shadow-sm transition
                  ${action.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-500'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                  }
`}
              >
                {t(action.label)}
              </button>
            </RoleGuard>
          ))
          }
        </div >
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('receipts.title')}
        description={t('receipts.description')}
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-500"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t('receipts.exportExcel')}
            </button>
            <RoleGuard roles={[Roles.ADMIN, Roles.MANAGER, Roles.STAFF]}>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                {t('receipts.create')}
              </button>
            </RoleGuard>
          </div>
        }
      />

      <DataTable data={receipts} columns={columns} isLoading={loading} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('receipts.create')}
        maxWidth="max-w-4xl"
        actions={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('app.cancel')}
            </button>
            <button
              type="submit"
              form="receipt-form"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {t('app.save')}
            </button>
          </>
        }
      >
        <form id="receipt-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('receipts.autoCode')}
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="PN-..."
            />
            <DatePicker
              label={t('receipts.date')}
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              required
            />
          </div>
          <Select
            label={t('receipts.supplier')}
            value={form.supplierId}
            onChange={handleSupplierChange}
            options={supplierOptions}
            placeholder={t('receipts.selectSupplierPlaceholder')}
            required
          />

          <LineItemsEditor
            products={filteredProducts}
            value={form.lines}
            onChange={(lines) => setForm((prev) => ({ ...prev, lines }))}
            getPriceForProduct={(productId) => getPriceForSupplierProduct(form.supplierId, productId)}
            locationOptions={locationOptions}
          />
          <Input
            label={t('receipts.note')}
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
            {t('app.total')}: {formatCurrency(form.lines.reduce((sum, line) => sum + line.quantity * line.price, 0))}
          </div>
        </form>
      </Modal>

      <Modal
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setRejectNote('');
          setRejectTarget(null);
        }}
        title={t('receipts.rejectTitle')}
        maxWidth="max-w-xl"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setRejectOpen(false);
                setRejectNote('');
                setRejectTarget(null);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('app.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!rejectTarget) return;
                transition(rejectTarget, ReceiptStatus.REJECTED, rejectNote.trim());
                setRejectOpen(false);
                setRejectNote('');
                setRejectTarget(null);
              }}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500"
            >
              {t('receipts.reject')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('receipts.rejectDescription')}
          </p>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1 leading-none">
              {t('receipts.noteOptional')}
            </span>
            <textarea
              rows={4}
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              placeholder={t('receipts.rejectPlaceholder')}
              className="input min-h-[96px] resize-y"
            />
          </label>
        </div>
      </Modal>
      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={t('receipts.exportExcel')}
        maxWidth="max-w-md"
        actions={
          <>
            <button
              onClick={() => setExportOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('app.cancel')}
            </button>
            <button
              onClick={processExport}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-500"
            >
              {t('app.export')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Chọn khoảng thời gian để xuất dữ liệu (để trống để xuất toàn bộ).
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Từ ngày</label>
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                value={exportRange.startDate}
                onChange={(e) => setExportRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Đến ngày</label>
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
                value={exportRange.endDate}
                onChange={(e) => setExportRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function availableActions(receipt, role, t) {
  const managerRoles = [Roles.ADMIN, Roles.MANAGER];
  const actions = [];

  if (receipt.status === ReceiptStatus.DRAFT) {
    actions.push({
      status: ReceiptStatus.APPROVED,
      label: 'receipts.actions.approve',
      roles: managerRoles,
      variant: 'success',
    });
    actions.push({
      status: ReceiptStatus.REJECTED,
      label: 'receipts.actions.reject',
      roles: managerRoles,
      variant: 'danger',
      requiresNote: true,
    });
  }
  if (receipt.status === ReceiptStatus.APPROVED) {
    actions.push({
      status: ReceiptStatus.SUPPLIER_CONFIRMED,
      label: 'receipts.actions.supplierConfirm',
      roles: managerRoles,
    });
    actions.push({
      status: ReceiptStatus.REJECTED,
      label: 'receipts.actions.reject',
      roles: managerRoles,
      variant: 'danger',
      requiresNote: true,
    });
  }
  if (receipt.status === ReceiptStatus.SUPPLIER_CONFIRMED) {
    actions.push({
      status: ReceiptStatus.COMPLETED,
      label: 'receipts.actions.complete',
      roles: managerRoles,
    });
  }
  return actions.filter((action) => !action.roles || action.roles.includes(role));
}
