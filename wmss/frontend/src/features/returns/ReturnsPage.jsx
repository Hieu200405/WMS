import { useMemo, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { DataTable } from '../../components/DataTable.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { NumberInput } from '../../components/forms/NumberInput.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { apiClient } from '../../services/apiClient.js';
import { formatDate } from '../../utils/formatters.js';
import { Roles } from '../../utils/constants.js';
import { RoleGuard } from '../../components/RoleGuard.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';

const defaultForm = {
  code: '',
  deliveryId: '',
  items: [
    {
      productId: '',
      locationId: '',
      batch: '',
      quantity: 1,
      reason: '',
    },
  ],
};

export function ReturnsPage() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [returns, setReturns] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [retRes, delRes, prodRes, invRes, locRes] = await Promise.all([
        apiClient('/returns'),
        apiClient('/deliveries'),
        apiClient('/products'),
        apiClient('/inventory'),
        apiClient('/warehouse', { params: { type: 'bin' } })
      ]);
      setReturns(retRes.data || []);
      setDeliveries(delRes.data || []);
      setProducts(prodRes.data || []);
      setInventory(invRes.data || []);
      setLocations(locRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load returns data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deliveryOptions = useMemo(
    () => deliveries.map((delivery) => ({
      value: delivery.id,
      label: `${delivery.code} - ${delivery.customerName || 'Customer'}`
    })),
    [deliveries]
  );

  const deliveryMap = useMemo(() => {
    const map = new Map();
    deliveries.forEach((delivery) => {
      const id = String(delivery.id ?? delivery._id ?? '');
      if (id) {
        map.set(id, delivery);
      }
    });
    return map;
  }, [deliveries]);

  const selectedDelivery = useMemo(
    () => deliveries.find((delivery) => delivery.id === form.deliveryId),
    [deliveries, form.deliveryId]
  );

  const productOptions = useMemo(
    () =>
      products
        .map((p) => ({
          value: String(p.id ?? p._id ?? ''),
          label: `${p.sku ?? ''} - ${p.name ?? ''}`.trim()
        }))
        .filter((option) => option.value),
    [products]
  );

  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      const id = String(p.id ?? p._id ?? '');
      if (id) {
        map.set(id, {
          sku: p.sku ?? '',
          name: p.name ?? ''
        });
      }
    });
    return map;
  }, [products]);

  const deliveryProductOptions = useMemo(() => {
    if (!selectedDelivery?.lines?.length) return [];
    const ids = new Set(selectedDelivery.lines.map((line) => String(line.productId)));
    return productOptions.filter((option) => ids.has(option.value));
  }, [productOptions, selectedDelivery]);

  const locationMap = useMemo(() => {
    const map = new Map();
    locations.forEach((loc) => map.set(String(loc.id), loc));
    return map;
  }, [locations]);

  const getProductInventory = (productId) => {
    return inventory.filter(
      (item) =>
        String(item.productId) === String(productId) &&
        item.status === 'available' &&
        Number(item.quantity) > 0
    );
  };

  const getLocationOptions = (productId) => {
    const rows = getProductInventory(productId);
    if (!rows.length) {
      return locations.map((loc) => ({
        value: String(loc.id),
        label: `${loc.code || loc.name} (Qty: 0)`
      }));
    }
    const byLocation = new Map();
    rows.forEach((row) => {
      const key = String(row.locationId ?? '');
      if (!key) return;
      const prev = byLocation.get(key) || { qty: 0 };
      byLocation.set(key, { qty: prev.qty + Number(row.quantity || 0) });
    });
    return Array.from(byLocation.entries()).map(([locationId, meta]) => {
      const loc = locationMap.get(locationId) || rows.find((r) => String(r.locationId) === locationId)?.location;
      const code = loc?.code || loc?.name || locationId;
      return {
        value: locationId,
        label: `${code} (Qty: ${meta.qty})`
      };
    });
  };

  const getBatchOptions = (productId, locationId) => {
    if (!productId || !locationId) {
      return [{ value: '', label: 'No batch' }];
    }
    const rows = getProductInventory(productId).filter(
      (item) => String(item.locationId) === String(locationId)
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

  const getAvailableQty = (productId, locationId, batch) => {
    if (!productId || !locationId || !batch) return null;
    const row = inventory.find(
      (item) =>
        String(item.productId) === String(productId) &&
        String(item.locationId) === String(locationId) &&
        String(item.batch ?? '') === String(batch) &&
        item.status === 'available'
    );
    return row ? Number(row.quantity || 0) : 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const items = form.items
      .filter((item) => item.productId && item.locationId)
      .map(item => ({
        productId: item.productId,
        locationId: item.locationId,
        batch: item.batch || null,
        qty: Number(item.quantity),
        reason: item.reason || 'Return',
      }));

    if (items.length === 0) return;
    if (!form.deliveryId) {
      toast.error('Select delivery');
      return;
    }

    const payload = {
      code: form.code || `RT-${Date.now()}`,
      from: 'customer',
      refId: form.deliveryId || undefined,
      items: items
    };

    try {
      await apiClient('/returns', { method: 'POST', body: payload });
      toast.success(t('notifications.saved'));
      setOpen(false);
      setForm(defaultForm);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to create return');
    }
  };

  const handleTransition = async (record, status) => {
    try {
      await apiClient(`/returns/${record.id}/transition`, {
        method: 'POST',
        body: { to: status }
      });
      toast.success('Status updated');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to update status');
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
      items: [...prev.items, { productId: '', locationId: '', batch: '', quantity: 1, reason: '' }]
    }));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('returns.title')}
        description= {t('returns.subtitle')}
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            {t('returns.create')}
          </button>
        }
      />

      <DataTable
        data={returns}
        isLoading={loading}
        columns={[
          { key: 'code', header: t('app.sku') },
          {
            key: 'refId',
            header: t('returns.from'),
            render: (_, row) => {
              const delivery = deliveryMap.get(String(row.refId ?? ''));
              const customerName =
                row.refCustomerName ||
                delivery?.customerName ||
                delivery?.customer?.name ||
                delivery?.customerId?.name ||
                null;
              const code = row.refCode || delivery?.code || null;
              return customerName || code || 'Customer';
            }
          },
          {
            key: 'refDate',
            header: t('deliveries.date'),
            render: (_, row) => {
              const delivery = deliveryMap.get(String(row.refId ?? ''));
              const date = row.refDate || delivery?.date || row.createdAt;
              return formatDate(date);
            }
          },
          {
            key: 'status',
            header: t('app.status'),
            render: (value) => <StatusBadge status={value} />,
          },
          {
            key: 'items',
            header: t('returns.items'),
            render: (items) => {
              if (!items?.length) return 0;
              const names = items.map((item) => {
                const product = productMap.get(String(item.productId));
                const label = product ? `${product.sku} - ${product.name}`.trim() : 'Unknown';
                return `${label} x${item.qty}`;
              });
              return names.join(', ');
            }
          },
          {
            key: 'actions',
            header: t('app.actions'),
            sortable: false,
            render: (_, row) => (
              <div className="flex items-center gap-2">
                {(row.status !== 'approved' && row.status !== 'completed') && (
                  <RoleGuard roles={[Roles.ADMIN, Roles.MANAGER]}>
                    <button
                      type="button"
                      onClick={() => handleTransition(row, 'approved')}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                    >
                      {t('app.approve')}
                    </button>
                  </RoleGuard>
                )}
                {(row.status === 'approved') && (
                  <RoleGuard roles={[Roles.ADMIN, Roles.MANAGER]}>
                    <button
                      type="button"
                      onClick={() => handleTransition(row, 'completed')}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                    >
                      {t('app.complete')}
                    </button>
                  </RoleGuard>
                )}
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('returns.create')}
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
              form="return-form"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {t('app.save')}
            </button>
          </>
        }
      >
        <form id="return-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Mã phiếu (Tự động)"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="RT-..."
            />
            <Select
              label="Nguồn trả hàng"
              value={form.deliveryId}
              onChange={(event) => setForm((prev) => ({ ...prev, deliveryId: event.target.value, items: [{ productId: '', locationId: '', batch: '', quantity: 1, reason: '' }] }))}
              options={deliveryOptions}
              placeholder="Chọn nguồn trả hàng"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="font-medium text-sm text-slate-900 dark:text-slate-100">Sản phẩm</div>
                        {form.items.map((item, index) => {
              const availableQty = getAvailableQty(item.productId, item.locationId, item.batch);
              return (
                <div key={index} className="p-3 border rounded-xl bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Select
                      label="Sản phẩm"
                      value={item.productId}
                      onChange={(e) => updateItem(index, { productId: e.target.value, locationId: '', batch: '' })}
                      options={form.deliveryId ? deliveryProductOptions : []}
                      disabled={!form.deliveryId}
                      placeholder="Chọn sản phẩm"
                      required
                    />
                    <Select
                      label="Vị trí"
                      value={item.locationId}
                      onChange={(e) => updateItem(index, { locationId: e.target.value, batch: '' })}
                      options={getLocationOptions(item.productId)}
                      placeholder="Chọn vị trí"
                      disabled={!item.productId}
                      required
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <Select
                      label="Lô"
                      value={item.batch}
                      onChange={(e) => updateItem(index, { batch: e.target.value })}
                      options={getBatchOptions(item.productId, item.locationId)}
                      placeholder="Chọn lô"
                      disabled={!item.locationId}
                    />
                    <NumberInput
                      label="Số lượng"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                      min={1}
                      required
                    />
                    <Input
                      label="Lý do"
                      value={item.reason}
                      onChange={(e) => updateItem(index, { reason: e.target.value })}
                      placeholder="Lý do"
                      required
                    />
                  </div>
                  {availableQty !== null ? (
                    <div className="text-xs text-slate-500">Available: {availableQty}</div>
                  ) : null}
                  <button type="button" onClick={() => removeItem(index)} className="text-red-500 text-xs">Xóa</button>
                </div>
              );
            })}
            <button type="button" onClick={addItem} className="text-sm text-indigo-600 font-medium">+ Thêm sản phẩm</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}






