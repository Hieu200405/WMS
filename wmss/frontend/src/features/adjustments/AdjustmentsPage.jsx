import { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Check, Eye, Plus, Trash2 } from 'lucide-react';
import { DataTable } from '../../components/DataTable.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { NumberInput } from '../../components/forms/NumberInput.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { RoleGuard } from '../../components/RoleGuard.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { apiClient } from '../../services/apiClient.js';
import { formatDate } from '../../utils/formatters.js';
import { Roles } from '../../utils/constants.js';

const emptyLine = {
  productId: '',
  locationId: '',
  batch: '',
  delta: 0,
};

export function AdjustmentsPage() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({
    code: '',
    reason: 'loss',
    lines: [{ ...emptyLine }],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adjRes, prodRes, locRes, invRes] = await Promise.all([
        apiClient('/adjustments'),
        apiClient('/products'),
        apiClient('/warehouse', { params: { type: 'bin' } }),
        apiClient('/inventory'),
      ]);
      setAdjustments(adjRes.data || []);
      setProducts(prodRes.data || []);
      setLocations(locRes.data || []);
      setInventory(invRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load adjustments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const productOptions = useMemo(() =>
    products
      .map((product) => ({
        value: String(product.id ?? product._id ?? ''),
        label: `${product.sku ?? ''} - ${product.name ?? ''}`.trim(),
      }))
      .filter((option) => option.value),
    [products]
  );

  const locationOptions = useMemo(() =>
    locations
      .map((loc) => ({
        value: String(loc.id ?? loc._id ?? ''),
        label: loc.code ?? loc.name ?? '',
      }))
      .filter((option) => option.value),
    [locations]
  );

  const inventoryByProductLocation = useMemo(() => {
    const map = new Map();
    inventory.forEach((item) => {
      if ((item.quantity ?? 0) <= 0) return;
      const productId = String(item.productId ?? '');
      const locationId = String(item.locationId ?? '');
      if (!productId || !locationId) return;
      const productMap = map.get(productId) || new Map();
      const locationMap = productMap.get(locationId) || new Map();
      const batchKey = String(item.batch ?? '');
      locationMap.set(batchKey, (locationMap.get(batchKey) || 0) + item.quantity);
      productMap.set(locationId, locationMap);
      map.set(productId, productMap);
    });
    return map;
  }, [inventory]);

  const getLocationOptionsForProduct = (productId) => {
    if (!productId) return locationOptions;
    const byLocation = inventoryByProductLocation.get(String(productId));
    if (!byLocation) return [];
    return locationOptions
      .filter((option) => byLocation.has(option.value))
      .map((option) => {
        const byBatch = byLocation.get(option.value);
        let totalQty = 0;
        if (byBatch) {
          byBatch.forEach((qty) => {
            totalQty += qty;
          });
        }
        return {
          ...option,
          label: totalQty ? `${option.label} (${totalQty})` : option.label,
        };
      });
  };

  const getBatchOptions = (productId, locationId) => {
    const baseLabel = t('adjustments.noBatch');
    if (!productId || !locationId) return [{ value: '', label: baseLabel }];
    const byLocation = inventoryByProductLocation.get(String(productId));
    if (!byLocation) return [{ value: '', label: baseLabel }];
    const byBatch = byLocation.get(String(locationId));
    if (!byBatch) return [{ value: '', label: baseLabel }];
    const options = [];
    let noBatchQty = byBatch.get('') || 0;
    byBatch.forEach((qty, batch) => {
      if (!batch) return;
      options.push({ value: batch, label: `${batch} (Qty: ${qty})` });
    });
    const noBatchLabel = noBatchQty > 0 ? `${baseLabel} (Qty: ${noBatchQty})` : baseLabel;
    return [{ value: '', label: noBatchLabel }, ...options];
  };
  const productLabelById = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      const id = String(product.id ?? product._id ?? '');
      if (!id) return;
      const sku = product.sku ?? '';
      const name = product.name ?? '';
      map.set(id, `${sku} - ${name}`.trim());
    });
    return map;
  }, [products]);

  const locationLabelById = useMemo(() => {
    const map = new Map();
    locations.forEach((loc) => {
      const id = String(loc.id ?? loc._id ?? '');
      if (!id) return;
      map.set(id, loc.code ?? loc.name ?? id);
    });
    return map;
  }, [locations]);

  const reasonOptions = useMemo(
    () => [
      { value: 'loss', label: t('adjustments.reasons.loss') },
      { value: 'mismatch', label: t('adjustments.reasons.mismatch') },
      { value: 'damaged', label: t('adjustments.reasons.damaged') },
      { value: 'stocktakeError', label: t('adjustments.reasons.stocktakeError') },
    ],
    [t]
  );

  const addLine = () =>
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...emptyLine }],
    }));

  const removeLine = (index) =>
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, idx) => idx !== index),
    }));

  const updateLine = (index, changes) =>
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, idx) => (idx === index ? { ...line, ...changes } : line)),
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    const lines = form.lines
      .map((line) => ({
        productId: line.productId,
        locationId: line.locationId,
        batch: line.batch ? line.batch : null,
        delta: Number(line.delta),
      }))
      .filter((line) => line.productId && line.locationId && Number(line.delta) !== 0);

    if (lines.length === 0) {
      toast.error('Please add valid lines with non-zero delta');
      return;
    }

    try {
      const payload = {
        code: form.code || `ADJ-${Date.now()}`,
        reason: form.reason,
        lines,
      };
      await apiClient('/adjustments', { method: 'POST', body: payload });
      toast.success('Adjustment created');
      setOpen(false);
      setForm({
        code: '',
        reason: 'loss',
        lines: [{ ...emptyLine }],
      });
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to save');
    }
  };

  const handleApprove = async (record) => {
    if (!window.confirm('Approve this adjustment?')) return;
    try {
      await apiClient(`/adjustments/${record.id}/approve`, { method: 'POST' });
      toast.success('Approved');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to approve');
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm('Delete this adjustment?')) return;
    try {
      await apiClient(`/adjustments/${record.id}`, { method: 'DELETE' });
      toast.success('Deleted');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('adjustments.title')}
        description={t('adjustments.subtitle')}
        actions={
          <button
            type="button"
            onClick={() => {
              setForm({ code: '', reason: 'loss', lines: [{ ...emptyLine }] });
              setOpen(true);
            }}
            className="btn btn-primary shadow-indigo-200"
          >
            <Plus className="h-4 w-4" />
            {t('adjustments.create')}
          </button>
        }
      />

      <DataTable
        data={adjustments}
        loading={loading}
        columns={[
          { key: 'code', header: t('adjustments.code') },
          {
            key: 'reason',
            header: t('adjustments.reason'),
            render: (value) => reasonOptions.find((opt) => opt.value === value)?.label ?? value,
          },
          {
            key: 'status',
            header: t('app.status'),
            render: (value) => <StatusBadge status={value} />,
          },
          {
            key: 'lines',
            header: t('adjustments.lines'),
            render: (value) => {
              if (!value || value.length === 0) return 0;
              const names = value
                .map((item) => productLabelById.get(String(item.productId)) ?? item.productId)
                .filter(Boolean);
              return `${value.length} - ${names.join(', ')}`;
            },
          },
          {
            key: 'approvedAt',
            header: t('adjustments.approvedAt'),
            render: (value) => (value ? formatDate(value) : '-'),
          },
          {
            key: 'actions',
            header: t('app.actions'),
            sortable: false,
            render: (_, row) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetail(row)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {t('app.details')}
                </button>
                <RoleGuard roles={[Roles.MANAGER, Roles.ADMIN]}>
                  {row.status !== 'completed' ? (
                    <button
                      type="button"
                      onClick={() => handleApprove(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-3 py-1 text-xs text-emerald-600 transition hover:bg-emerald-100 dark:border-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t('app.approve')}
                    </button>
                  ) : null}
                  {row.status !== 'completed' ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1 text-xs text-rose-600 transition hover:bg-rose-100 dark:border-rose-600 dark:text-rose-300 dark:hover:bg-rose-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('app.delete')}
                    </button>
                  ) : null}
                </RoleGuard>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('adjustments.create')}
        actions={
          <>
            <button
              type="button"
              className="btn border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              {t('app.cancel')}
            </button>
            <button type="submit" form="adjustment-form" className="btn btn-primary">
              {t('app.save')}
            </button>
          </>
        }
      >
        <form id="adjustment-form" className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label={t('adjustments.code')}
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            placeholder="ADJ-2024-001"
          />
          <Select
            label={t('adjustments.reason')}
            value={form.reason}
            onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
            options={reasonOptions}
          />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t('adjustments.lines')}
              </div>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
              >
                + {t('adjustments.addLine')}
              </button>
            </div>
            {form.lines.map((line, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[2fr_2fr_1.5fr_1fr_auto]">
                <Select
                  label={t('adjustments.product')}
                  value={line.productId}
                  onChange={(event) => {
                    const nextProductId = event.target.value;
                    const byLocation = inventoryByProductLocation.get(String(nextProductId));
                    const keepLocation = byLocation && byLocation.has(String(line.locationId));
                    updateLine(index, {
                      productId: nextProductId,
                      locationId: keepLocation ? line.locationId : '',
                      batch: '',
                    });
                  }}
                  options={productOptions}
                  placeholder={t('adjustments.selectProduct')}
                />
                <Select
                  label={t('adjustments.location')}
                  value={line.locationId}
                  onChange={(event) => updateLine(index, { locationId: event.target.value, batch: '' })}
                  options={getLocationOptionsForProduct(line.productId)}
                  placeholder={t('adjustments.selectLocation')}
                />
                <Select
                  label={t('adjustments.batch')}
                  value={line.batch}
                  onChange={(event) => updateLine(index, { batch: event.target.value })}
                  options={getBatchOptions(line.productId, line.locationId)}
                  placeholder={t('adjustments.selectBatch')}
                />
                <NumberInput
                  label={t('adjustments.delta')}
                  value={line.delta}
                  onChange={(event) => updateLine(index, { delta: event.target.value })}
                />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="inline-flex h-10 items-center rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    {t('app.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={t('app.details')}
        actions={
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="btn border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            {t('app.close')}
          </button>
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <div><span className="font-semibold">{t('adjustments.code')}:</span> {detail.code}</div>
            <div><span className="font-semibold">{t('adjustments.reason')}:</span> {reasonOptions.find((opt) => opt.value === detail.reason)?.label ?? detail.reason}</div>
            <div><span className="font-semibold">{t('app.status')}:</span> <StatusBadge status={detail.status} /></div>
            <div><span className="font-semibold">{t('adjustments.approvedAt')}:</span> {detail.approvedAt ? formatDate(detail.approvedAt) : '-'}</div>
            <div className="font-semibold">{t('adjustments.lines')}</div>
            <div className="space-y-2">
              {(detail.lines || []).map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <div>Sản phẩm: {productLabelById.get(String(item.productId)) ?? item.productId}</div>
                  <div>Vị trí: {locationLabelById.get(String(item.locationId)) ?? item.locationId}</div>
                  <div>Lô: {item.batch || '-'}</div>
                  <div>Số lượng điều chỉnh: {item.delta}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}













