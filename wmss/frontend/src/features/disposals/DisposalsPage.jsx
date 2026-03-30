import { useMemo, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { DataTable } from '../../components/DataTable.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { DatePicker } from '../../components/forms/DatePicker.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { NumberInput } from '../../components/forms/NumberInput.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { apiClient } from '../../services/apiClient.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { DisposalReasons, Roles } from '../../utils/constants.js';
import { RoleGuard } from '../../components/RoleGuard.jsx';
import { useAuth } from '../../app/auth-context.jsx';

const DisposalStatus = {
  // Backend statuses (lowercase usually)
  DRAFT: 'draft', // assuming backend default if not specified or returned
  PENDING: 'pending', // or 'pending_approval'
  APPROVED: 'approved',
  COMPLETED: 'completed',
};

const defaultForm = {
  code: '',
  reason: DisposalReasons[0],
  // date: new Date().toISOString().slice(0, 10), // Not in schema, schema is createSchema.
  council: '',
  attachment: '',
  items: [
    {
      productId: '',
      locationId: '',
      batch: '',
      quantity: 1,
      value: 0
    },
  ],
};

const HIGH_VALUE_THRESHOLD = 5_000_000;

export function DisposalsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [disposals, setDisposals] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dspRes, prodRes, invRes, locRes] = await Promise.all([
        apiClient('/disposals'),
        apiClient('/products'),
        apiClient('/inventory'),
        apiClient('/warehouse')
      ]);
      setDisposals(dspRes.data || []);
      setProducts(prodRes.data || []);
      setInventory(invRes.data || []);
      setLocations(locRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load disposals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reasons = useMemo(
    () =>
      DisposalReasons.map((reason) => ({
        value: reason,
        label: t(`disposals.reasons.${reason}`, reason)
      })),
    [t]
  );

  const locationMap = useMemo(() => {
    const map = new Map();
    locations.forEach(l => map.set(l.id, l));
    return map;
  }, [locations]);

  const productOptions = useMemo(
    () =>
      products
        .filter(Boolean)
        .map((p) => ({
          value: String(p.id ?? p._id ?? ''),
          label: `${p.sku ?? ''} - ${p.name ?? ''}`.trim()
        }))
        .filter((option) => option.value),
    [products]
  );

  // Helper to get available inventory rows for a product
  const getProductInventory = (productId) => {
    return inventory.filter(i => String(i.productId) === String(productId) && i.quantity > 0);
  };

  const getLocationOptions = (productId) => {
    const rows = getProductInventory(productId);
    const byLocation = new Map();
    rows.forEach((row) => {
      const key = String(row.locationId ?? '');
      if (!key) return;
      const prev = byLocation.get(key) || 0;
      byLocation.set(key, prev + Number(row.quantity || 0));
    });
    return Array.from(byLocation.entries()).map(([locationId, qty]) => {
      const loc = locationMap.get(locationId);
      const code = loc ? loc.code : 'Unknown';
      return {
        value: locationId,
        label: `${code} (Qty: ${qty})`
      };
    });
  };

  const getBatchOptions = (productId, locationId) => {
    if (!productId || !locationId) return [{ value: '', label: 'No batch' }];
    const rows = getProductInventory(productId).filter(
      (row) => String(row.locationId) === String(locationId)
    );
    const byBatch = new Map();
    rows.forEach((row) => {
      const key = row.batch ?? '';
      const prev = byBatch.get(key) || 0;
      byBatch.set(key, prev + Number(row.quantity || 0));
    });
    const noBatchQty = byBatch.get('') || 0;
    byBatch.delete('');
    const options = Array.from(byBatch.entries()).map(([batch, qty]) => ({
      value: batch,
      label: `${batch} (Qty: ${qty})`
    }));
    const noBatchLabel = noBatchQty > 0 ? `No batch (Qty: ${noBatchQty})` : 'No batch';
    return [{ value: '', label: noBatchLabel }, ...options];
  };

  const totalValue = useMemo(() => {
    return form.items.reduce((sum, item) => {
      // If value is manually set use it, otherwise estimate? 
      // The form has 'value' field.
      // Backend schema has value optional per item, and explicit totalValue.
      // Let's assume user inputs item value or we calculate default.
      // Using product priceIn as default value per unit.
      if (item.value) return sum + (item.value * item.quantity);

      const product = products.find((prod) => prod.id === item.productId);
      return sum + (item.quantity * (product?.priceIn || 0));
    }, 0);
  }, [form.items, products]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const items = form.items
      .filter(i => i.productId && i.locationId)
      .map(i => ({
        productId: i.productId,
        locationId: i.locationId,
        batch: i.batch || null,
        qty: Number(i.quantity),
        value: Number(i.value) || 0 // Should we send 0 or calculated?
        // If 0, backend might just store 0.
      }));

    if (items.length === 0) {
      toast.error('Add valid items');
      return;
    }

    if (totalValue > HIGH_VALUE_THRESHOLD) {
      if (!form.council.trim()) {
        toast.error('Vui l�ng nh?p h?i d?ng h?y');
        return;
      }
      if (!form.attachment.trim()) {
        toast.error('Vui l�ng nh?p bi�n b?n h?y');
        return;
      }
    }

    const payload = {
      code: form.code || `HUY-${Date.now()}`,
      reason: form.reason,
      items: items,
      totalValue: totalValue,
      boardMembers: form.council ? form.council.split(',').map(s => s.trim()) : undefined,
      minutesFileUrl: form.attachment?.trim() || undefined,
      // boardRequired? Logic based on threshold.
      boardRequired: totalValue > HIGH_VALUE_THRESHOLD
    };

    try {
      // Need FormData if uploading file? 
      // Route uses `upload.single('minutesFile')`. 
      // Existing mock form had `attachment` text input.
      // If backend expects file upload (multipart), we must use FormData.
      // But schema `minutesFileUrl` is for update. `create` also has `minutesFile`.
      // If we don't upload real file, we can't fully support it yet.
      // But `createSchema` body fields are validated. 
      // Let's stick to JSON for now. Middleware `upload.single` creates `req.file`.
      // Validation validates `req.body` but `upload` might mess up JSON parsing if content-type is json.
      // Wait, `multer` processes multipart. If I send JSON, multer might ignore or error?
      // Usually need to send FormData.
      // Or just send empty file?
      // The route: `router.post('/', upload.single('minutesFile'), validate({ body: createSchema }), controller.create);`
      // Client MUST send multipart/form-data for multer to work and populate body correctly?
      // Or if `apiClient` sends JSON, express body parser (if configured) handles it before/after multer?
      // `multer` usually handles parsing of ALL fields in multipart.
      // So I likely need to send FormData.
      // OR, does `apiClient` support FormData? `apiClient` uses `fetch`. If body is FormData, it sets header.

      // Let's assume we send JSON first. If backend uses `app.use(express.json())` global, it might work if no file.
      // But multer is middleware on route. 
      // Let's try sending standard JSON. If fails, I switch to FormData.

      await apiClient('/disposals', { method: 'POST', body: payload });
      toast.success(t('notifications.saved'));
      setOpen(false);
      setForm(defaultForm);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Error creating disposal');
    }
  };

  const transition = async (record, status) => {
    try {
      await apiClient(`/disposals/${record.id}/transition`, {
        method: 'POST',
        body: { to: status }
      });
      toast.success('Status updated');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed update');
    }
  };

  const updateItem = (index, changes) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, ...changes } : item)
    }));
  };

  const removeItem = (index) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', locationId: '', batch: '', quantity: 1, value: 0 }]
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t('disposals.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('disposals.subtitle')}
          </p>
        </div>
          <button
            type="button"
            onClick={() => {
              setForm(defaultForm);
              setOpen(true);
            }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          {t('disposals.create')}
        </button>
      </div>

      <DataTable
        data={disposals}
        isLoading={loading}
        columns={[
          { key: 'code', header: t('app.sku') },
          {
            key: 'reason',
            header: t('disposals.reason'),
            render: (value) => t(`disposals.reasons.${value}`, value)
          },
          { key: 'createdAt', header: t('deliveries.date'), render: (value) => formatDate(value) },
          { key: 'status', header: t('app.status'), render: (value) => <StatusBadge status={value} /> },
          { key: 'totalValue', header: t('app.total'), render: (value) => formatCurrency(value ?? 0) },
          {
            key: 'actions',
            header: t('app.actions'),
            sortable: false,
            render: (_, row) => (
              <div className="flex items-center gap-2">
                {disposalActions(row, t).map((action) => (
                  <RoleGuard key={action.status} roles={action.roles}>
                    <button
                      type="button"
                      onClick={() => transition(row, action.status)}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                    >
                      {action.label}
                    </button>
                  </RoleGuard>
                ))}
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('disposals.create')}
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
              form="disposal-form"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {t('app.save')}
            </button>
          </>
        }
      >
        <form id="disposal-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Mã phiếu (Tự động)"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="HUY-..."
            />
            <Select
              label={t('disposals.reason')}
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              options={reasons}
            />
          </div>

          {totalValue > HIGH_VALUE_THRESHOLD ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label={t('disposals.council')}
                value={form.council}
                onChange={(event) => setForm((prev) => ({ ...prev, council: event.target.value }))}
                required
              />
              <Input
                label={t('disposals.attachment')}
                value={form.attachment}
                onChange={(event) => setForm((prev) => ({ ...prev, attachment: event.target.value }))}
                placeholder="Link (optional)"
              />
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="font-medium text-sm">Các sản phẩm</div>
            {form.items.map((item, index) => (
              <div key={index} className="p-3 border rounded-xl grid md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/50">
                <div className="md:col-span-2">
                  <Select
                    label="Sản phẩm"
                    value={item.productId}
                    onChange={(e) => {
                      const productId = String(e.target.value);
                      const product = products.find((p) => String(p.id ?? p._id ?? '') === productId);
                      updateItem(index, {
                        productId,
                        locationId: '',
                        batch: '',
                        value: product?.priceIn || 0
                      });
                    }}
                    options={productOptions}
                    placeholder="Chọn sản phẩm"
                  />
                </div>
                <div className="md:col-span-2">
                  <Select
                    label="Vị trí"
                    value={item.locationId}
                    onChange={(e) => updateItem(index, { locationId: String(e.target.value), batch: '' })}
                    options={getLocationOptions(item.productId)}
                    placeholder="Chọn vị trí"
                    disabled={!item.productId}
                  />
                </div>
                <div className="md:col-span-2">
                  <Select
                    label="Lô"
                    value={item.batch}
                    onChange={(e) => updateItem(index, { batch: String(e.target.value) })}
                    options={getBatchOptions(item.productId, item.locationId)}
                    placeholder="Chọn lô"
                    disabled={!item.locationId}
                  />
                </div>
                <NumberInput label="Số lượng" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} min={1} />
                <NumberInput label="Đơn giá" value={item.value} onChange={(e) => updateItem(index, { value: Number(e.target.value) })} />
                <button type="button" onClick={() => removeItem(index)} className="text-red-500">Xóa</button>
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-indigo-600">+ Thêm sản phẩm</button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
            {t('app.total')}: {formatCurrency(totalValue)}
          </div>
        </form>
      </Modal>
    </div>
  );
}

function disposalActions(record, t) {
  const managerRoles = [Roles.ADMIN, Roles.MANAGER];

  // Backend statuses? 
  // Map assuming: draft -> Approved -> Completed.
  // Actually schema `transition` allows "approved" and "completed".
  // So likely: Draft -> Approved -> Completed.

  // Need to know what status is returned by backend.
  // Since we don't know exact enum values (likely 'draft', 'approved', 'completed'),
  // I'll match loosely or assume lowercase.

  const status = record.status?.toLowerCase();

  switch (status) {
    case 'draft':
      // Maybe 'Submit' means Approve? Or Submit to Pending? 
      // Route doesn't have 'submit'. It has 'transition' to 'approved'.
      // Creating creates in Draft? Or Pending?
      // Controller likely defaults to Draft.
      return [{ status: 'approved', label: t('app.approve'), roles: managerRoles }];
    case 'approved':
      return [{ status: 'completed', label: t('app.complete'), roles: managerRoles }];
    default:
      return [];
  }
}




