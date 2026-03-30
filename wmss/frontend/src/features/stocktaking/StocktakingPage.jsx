import { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { DataTable } from "../../components/DataTable.jsx";
import { Modal } from "../../components/Modal.jsx";
import { Input } from "../../components/forms/Input.jsx";
import { DatePicker } from "../../components/forms/DatePicker.jsx";
import { NumberInput } from "../../components/forms/NumberInput.jsx";
import { Select } from "../../components/forms/Select.jsx";
import { StatusBadge } from "../../components/StatusBadge.jsx";
import { apiClient } from "../../services/apiClient.js";
import { formatDate } from "../../utils/formatters.js";

const emptyLine = {
  productId: "",
  locationId: "",
  actualQuantity: 0,
  reason: ""
};

export function StocktakingPage() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [stocktakingList, setStocktakingList] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [inventory, setInventory] = useState([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({
    code: "", // Added code field
    date: new Date().toISOString().slice(0, 10),
    lines: [{ ...emptyLine }]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stRes, prodRes, locRes, invRes] = await Promise.all([
        apiClient('/stocktakes'),
        apiClient('/products'),
        apiClient('/warehouse'),
        apiClient('/inventory')
      ]);
      setStocktakingList(stRes.data || []);
      setProducts(prodRes.data || []);
      setLocations(locRes.data || []);
      setInventory(invRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load stocktaking data');
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
        label: `${product.sku ?? ''} - ${product.name ?? ''}`.trim()
      }))
      .filter((option) => option.value),
    [products]);

  const locationOptions = useMemo(() =>
    locations
      .map((loc) => ({
        value: String(loc.id ?? loc._id ?? ''),
        label: loc.code ?? loc.name ?? ''
      }))
      .filter((option) => option.value),
    [locations]);

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

  // Map inventory by key `${productId}-${locationId}` for easy lookup
  const inventoryMap = useMemo(() => {
    const map = new Map();
    inventory.forEach((item) => {
      map.set(`${item.productId}-${item.locationId}`, item.quantity);
    });
    return map;
  }, [inventory]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const items = form.lines
      .map((line) => {
        const systemQty = inventoryMap.get(`${line.productId}-${line.locationId}`) ?? 0;
        return {
          productId: line.productId,
          locationId: line.locationId,
          countedQty: line.actualQuantity,
          systemQty: systemQty
        };
      })
      .filter((item) => item.productId && item.locationId);

    if (items.length === 0) {
      toast.error('Please add valid lines with Product and Location');
      return;
    }

    try {
      if (editing) {
        const payload = {
          date: new Date(form.date),
          items: items
        };
        await apiClient(`/stocktakes/${editing.id}`, { method: 'PUT', body: payload });
        toast.success('Stocktaking updated');
      } else {
        const payload = {
          code: form.code || `ST-${Date.now()}`,
          date: new Date(form.date),
          items: items
        };
        await apiClient('/stocktakes', { method: 'POST', body: payload });
        toast.success('Stocktaking created');
      }
      setOpen(false);
      setEditing(null);
      setForm({
        code: '',
        date: new Date().toISOString().slice(0, 10),
        lines: [{ ...emptyLine }]
      });
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to save');
    }
  };

  const handleEdit = (record) => {
    setEditing(record);
    setForm({
      code: record.code,
      date: record.date ? new Date(record.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      lines: (record.items || []).map((item) => ({
        productId: item.productId,
        locationId: item.locationId,
        actualQuantity: item.countedQty || 0,
        reason: ''
      }))
    });
    setOpen(true);
  };

  const handleDelete = async (record) => {
    if (!window.confirm('Delete stocktake?')) return;
    try {
      await apiClient(`/stocktakes/${record.id}`, { method: 'DELETE' });
      toast.success('Deleted');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete');
    }
  };

  const handleDetail = (record) => {
    setDetail(record);
  };

  const addLine = () =>
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...emptyLine }]
    }));

  const removeLine = (index) =>
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, idx) => idx !== index)
    }));

  const updateLine = (index, changes) =>
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, idx) => (idx === index ? { ...line, ...changes } : line))
    }));

  const linesTotal = form.lines.reduce((sum, line) => sum + line.actualQuantity, 0);

  const getStocktakeStatus = (record) => {
    const status = record?.status?.toLowerCase();
    if (status === 'pass' || status === 'diff') return status;
    const items = record?.items || [];
    const hasDiff = items.some((item) => (item.countedQty ?? 0) - (item.systemQty ?? 0) !== 0);
    return hasDiff ? 'diff' : 'pass';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t('stocktaking.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('stocktaking.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setForm({
              code: "",
              date: new Date().toISOString().slice(0, 10),
              lines: [{ ...emptyLine }]
            });
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          {t('stocktaking.create')}
        </button>
      </div>

      <DataTable
        data={stocktakingList}
        isLoading={loading}
        columns={[
          { key: 'code', header: t('app.sku') },
          { key: 'date', header: t('deliveries.date'), render: (value) => formatDate(value) },
          { key: 'status', header: t('app.status'), render: (_, row) => <StatusBadge status={getStocktakeStatus(row)} /> },
          {
            key: 'items',
            header: t('stocktaking.items'),
            render: (value) => {
              if (!value || value.length === 0) return 0;
              const names = value
                .map((item) => productLabelById.get(String(item.productId)) ?? item.productId)
                .filter(Boolean);
              return `${value.length} - ${names.join(', ')}`;
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
                  onClick={() => handleDetail(row)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {t('app.details')}
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(row)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('app.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1 text-xs text-rose-600 transition hover:bg-rose-100 dark:border-rose-600 dark:text-rose-300 dark:hover:bg-rose-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('app.delete')}
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('app.edit') : t('stocktaking.create')}
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
              form="stocktaking-form"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {t('app.save')}
            </button>
          </>
        }
      >
        <form id="stocktaking-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Mã phiếu (Tự động)"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              disabled={Boolean(editing)}
              placeholder="ST-..."
            />
            <DatePicker
              label={t('deliveries.date')}
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-3">
            {form.lines.map((line, index) => {
              const recorded = inventoryMap.get(`${line.productId}-${line.locationId}`) ?? 0;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <div className="grid gap-3 md:grid-cols-4">
                    <Select
                      label="Sản phẩm"
                      value={line.productId}
                      onChange={(event) => updateLine(index, { productId: event.target.value })}
                      options={productOptions}
                      placeholder="Select product"
                      required
                    />
                    <Select
                      label="Vị trí"
                      value={line.locationId}
                      onChange={(event) => updateLine(index, { locationId: event.target.value })}
                      options={locationOptions}
                      placeholder="Select location"
                      required
                    />
                    <NumberInput label="Hệ thống" value={recorded} readOnly />
                    <NumberInput
                      label="Thực tế"
                      min={0}
                      value={line.actualQuantity}
                      onChange={(event) =>
                        updateLine(index, { actualQuantity: Number(event.target.value) })
                      }
                      required
                    />
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-500">
                    Diff: {line.productId && line.locationId ? line.actualQuantity - recorded : 0}
                  </div>

                  {form.lines.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="mt-2 text-xs text-rose-500"
                    >
                      Xóa dòng
                    </button>
                  ) : null}
                </div>
              );
            })}
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Thêm sản phẩm
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            Tổng số lượng đã đếm: {linesTotal}
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title= {t('app.details')}
        maxWidth="max-w-3xl"
        actions={
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('app.cancel')}
          </button>
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <div><span className="font-semibold">SKU:</span> {detail.code}</div>
            <div><span className="font-semibold">Ngày xuất:</span> {formatDate(detail.date)}</div>
            <div><span className="font-semibold">Trạng thái:</span> <StatusBadge status={getStocktakeStatus(detail)} /></div>
            <div className="font-semibold">Sản phẩm</div>
            <div className="space-y-2">
              {(detail.items || []).map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <div>Sản phẩm: {productLabelById.get(String(item.productId)) ?? item.productId}</div>
                  <div>Vị trí: {locationLabelById.get(String(item.locationId)) ?? item.locationId}</div>
                  <div>Hệ thống: {item.systemQty} / Đếm: {item.countedQty}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

    </div>
  );
}







