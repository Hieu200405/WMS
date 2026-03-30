import { useMemo, useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { DataTable } from '../../components/DataTable.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { NumberInput } from '../../components/forms/NumberInput.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { apiClient } from '../../services/apiClient.js';
import { generateId } from '../../utils/id.js';
import { formatDate } from '../../utils/formatters.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { ImageUploader } from '../../components/ImageUploader.jsx';
import { IncidentStatus } from '../../utils/constants.js';

const emptyLine = {
  productId: '',
  quantity: 1,
};

const createEmptyIncident = () => ({
  type: '',
  refType: 'receipt',
  refId: '',
  note: '',
  action: '',
  status: IncidentStatus.OPEN,
  lines: [{ ...emptyLine, id: generateId('line') }],
  attachments: []
});


export function IncidentsPage() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [products, setProducts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(createEmptyIncident());
  const [editingIncident, setEditingIncident] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [incRes, prodRes, recRes, delRes] = await Promise.all([
        apiClient('/incidents'),
        apiClient('/products'),
        apiClient('/receipts'),
        apiClient('/deliveries')
      ]);
      setIncidents(incRes.data || []);
      setProducts(prodRes.data || []);
      setReceipts(recRes.data || []);
      setDeliveries(delRes.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const productOptions = useMemo(
    () =>
      products
        .map((product) => ({
          value: String(product.id ?? product._id ?? ''),
          label: `${product.sku ?? ''} - ${product.name ?? ''}`.trim(),
        }))
        .filter((option) => option.value),
    [products],
  );

  const productMap = useMemo(() => {
    const map = new Map();
    products.forEach((product) => {
      const id = String(product.id ?? product._id ?? '');
      if (!id) return;
      map.set(id, {
        sku: product.sku ?? '',
        name: product.name ?? ''
      });
    });
    return map;
  }, [products]);

  const typeOptions = [
    { value: 'shortage', label: t('incidents.types.shortage') },
    { value: 'late', label: t('incidents.types.late') },
    { value: 'damaged', label: t('incidents.types.damaged') },
    { value: 'rejected', label: t('incidents.types.rejected') },
  ];

  const actionOptions = [
    { value: 'replenish', label: t('incidents.actions.replenish') },
    { value: 'return', label: t('incidents.actions.return') },
    { value: 'refund', label: t('incidents.actions.refund') },
  ];

  const refTypeOptions = [
    { value: 'receipt', label: t('incidents.refTypes.receipt') },
    { value: 'delivery', label: t('incidents.refTypes.delivery') },
  ];

  const statusOptions = [
    { value: IncidentStatus.OPEN, label: t('incidents.statusValues.open') },
    { value: IncidentStatus.IN_PROGRESS, label: t('incidents.statusValues.inProgress') },
    { value: IncidentStatus.RESOLVED, label: t('incidents.statusValues.resolved') },
  ];

  const refOptions = useMemo(() => {
    const source = form.refType === 'delivery' ? deliveries : receipts;
    return source.map((item) => ({
      value: item.id,
      label: `${item.code} - ${item.supplierName || item.customerName || ''}`.trim()
    }));
  }, [deliveries, receipts, form.refType]);

  const selectedRef = useMemo(() => {
    const source = form.refType === 'delivery' ? deliveries : receipts;
    return source.find((item) => item.id === form.refId);
  }, [deliveries, receipts, form.refType, form.refId]);

  const refProductOptions = useMemo(() => {
    if (!selectedRef?.lines?.length) return [];
    const allowed = new Set(selectedRef.lines.map((line) => String(line.productId)));
    return productOptions.filter((option) => allowed.has(option.value));
  }, [productOptions, selectedRef]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingIncident) {
        const payload = {
          note: form.note,
          action: form.action,
          status: form.status,
          lines: form.lines.map((line) => ({
            productId: line.productId,
            quantity: Number(line.quantity)
          }))
        };
        await apiClient(`/incidents/${editingIncident.id}`, { method: 'PUT', body: payload });
      } else {
        const payload = {
          type: form.type,
          refType: form.refType,
          refId: form.refId,
          lines: form.lines.map(l => ({
            productId: l.productId,
            quantity: Number(l.quantity)
          })),
          note: form.note,
          action: form.action,
          attachments: form.attachments
        };
        await apiClient('/incidents', { method: 'POST', body: payload });
      }
      toast.success(t('notifications.saved'));
      setForm(createEmptyIncident());
      setEditingIncident(null);
      setOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Error creating incident');
    }
  };

  const handleDelete = async (incident) => {
    if (window.confirm('Delete incident?')) {
      try {
        await apiClient(`/incidents/${incident.id}`, { method: 'DELETE' });
        toast.success(t('notifications.deleted'));
        fetchData();
      } catch (error) {
        console.error(error);
        toast.error('Failed to delete');
      }
    }
  };

  const handleEdit = (incident) => {
    setEditingIncident(incident);
    setForm({
      type: incident.type,
      refType: incident.refType,
      refId: incident.refId,
      note: incident.note || '',
      action: incident.action || '',
      status: incident.status || IncidentStatus.OPEN,
      lines: (incident.lines || []).map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        id: generateId('line')
      })),
      attachments: []
    });
    setOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('incidents.title')}
        description= {t('incidents.subtitle')}
        actions={
          <button
            type="button"
            onClick={() => {
              setEditingIncident(null);
              setForm(createEmptyIncident());
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            {t('incidents.create')}
          </button>
        }
      />

      <DataTable
        data={incidents}
        isLoading={loading}
        columns={[
          {
            key: 'type',
            header: t('incidents.type'),
            render: (value) => (value ? t(`incidents.types.${value}`, value) : '-'),
          },
          {
            key: 'status',
            header: t('app.status'),
            render: (value) => (value ? t(`incidents.statusValues.${value}`, value) : '-'),
          },
          {
            key: 'refType',
            header: t('incidents.refType'),
            render: (value) => (value ? t(`incidents.refTypes.${value}`, value) : '-')
          },
          { key: 'refId', header: t('incidents.refId') },
          { key: 'note', header: t('incidents.note') },
          {
            key: 'action',
            header: t('incidents.action'),
            render: (value) => (value ? t(`incidents.actions.${value}`, value) : '-'),
          },
          {
            key: 'lines',
            header: t('app.lineItems'),
            render: (value) => {
              if (!value?.length) return 0;
              return value
                .map((line) => {
                  const product = productMap.get(String(line.productId));
                  const label = product ? `${product.sku} - ${product.name}`.trim() : 'Unknown';
                  return `${label} x${line.quantity}`;
                })
                .join(', ');
            },
          },
          {
            key: 'createdAt',
            header: t('incidents.date'),
            render: (value) => formatDate(value),
          },
          {
            key: 'actions',
            header: t('app.actions'),
            sortable: false,
            render: (_, row) => (
              <div className="flex items-center gap-2">
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
        title={editingIncident ? t('app.edit') : t('incidents.create')}
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
              form="incident-form"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {t('app.save')}
            </button>
          </>
        }
      >
        <form id="incident-form" className="space-y-4" onSubmit={handleSubmit}>
          <Select
            label={t('incidents.type')}
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            options={typeOptions}
            placeholder={t('incidents.typePlaceholder')}
            disabled={Boolean(editingIncident)}
            required
          />

          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label={t('incidents.refType')}
              value={form.refType}
              onChange={(event) => setForm((prev) => ({ ...prev, refType: event.target.value, refId: '' }))}
              options={refTypeOptions}
              disabled={Boolean(editingIncident)}
              required
            />
            <Select
              label={t('incidents.refId')}
              value={form.refId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  refId: event.target.value,
                  lines: [{ ...emptyLine, id: generateId('line') }]
                }))
              }
              options={refOptions}
              placeholder={t('incidents.refId')}
              disabled={Boolean(editingIncident)}
              required
            />
          </div>
          <div className="space-y-3">
            {form.lines.map((line, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <Select
                    label={t('incidents.product')}
                    value={line.productId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        lines: prev.lines.map((item, idx) =>
                          idx === index ? { ...item, productId: event.target.value } : item,
                        ),
                      }))
                    }
                    options={form.refId ? refProductOptions : []}
                    placeholder={t('incidents.productPlaceholder')}
                    disabled={!form.refId}
                    required
                  />
                  <NumberInput
                    label={t('incidents.quantity')}
                    min={1}
                    value={line.quantity}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        lines: prev.lines.map((item, idx) =>
                          idx === index
                            ? { ...item, quantity: Number(event.target.value) }
                            : item,
                        ),
                      }))
                    }
                    required
                  />
                </div>
                {form.lines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        lines: prev.lines.filter((_, idx) => idx !== index),
                      }))
                    }
                    className="mt-2 text-xs text-rose-500"
                  >
                    {t('incidents.removeLine')}
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  lines: [...prev.lines, { ...emptyLine, id: generateId('line') }],
                }))
              }
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {t('incidents.addLine')}
            </button>
          </div>
          <Input
            label={t('incidents.note')}
            value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            required
          />

          {editingIncident ? (
            <Select
              label={t('app.status')}
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              options={statusOptions}
              required
            />
          ) : null}

          <ImageUploader
            onUploadComplete={(urls) => setForm(prev => ({ ...prev, attachments: urls }))}
          />
          <Select
            label={t('incidents.action')}
            value={form.action}
            onChange={(event) => setForm((prev) => ({ ...prev, action: event.target.value }))}
            options={actionOptions}
            placeholder={t('incidents.actionPlaceholder')}
            required
          />
        </form>
      </Modal>
    </div>
  );
}
