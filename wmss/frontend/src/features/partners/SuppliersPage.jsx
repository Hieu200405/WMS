import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../../components/DataTable.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { apiClient } from '../../services/apiClient.js';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/PageHeader.jsx';

const emptySupplier = {
  type: 'supplier',
  code: '',
  name: '',
  taxCode: '',
  contact: '',
  address: '',
  businessType: 'Distributor',
  notes: '',
  isActive: true,
};


export function SuppliersPage() {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySupplier);

  const businessTypes = [
    { value: 'Manufacturer', label: t('partners.businessTypes.manufacturer') },
    { value: 'Distributor', label: t('partners.businessTypes.distributor') },
    { value: 'Retailer', label: t('partners.businessTypes.retailer') },
  ];


  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient('/partners', { params: { type: 'supplier' } });
      setSuppliers(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách nhà cung cấp');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const openCreateModal = () => {
    setForm(emptySupplier);
    setEditing(null);
    setOpen(true);
  };

  const openEditModal = (supplier) => {
    setEditing(supplier);
    setForm(supplier);
    setOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form, type: 'supplier' };
      if (editing) {
        await apiClient(`/partners/${editing.id}`, {
          method: 'PUT',
          body: payload
        });
        toast.success('Cập nhật thành công');
      } else {
        await apiClient('/partners', {
          method: 'POST',
          body: payload
        });
        toast.success('Thêm nhà cung cấp thành công');
      }
      setOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (supplier) => {
    if (window.confirm('Xóa nhà cung cấp này?')) {
      try {
        await apiClient(`/partners/${supplier.id}`, { method: 'DELETE' });
        toast.success('Xóa thành công');
        fetchSuppliers();
      } catch (error) {
        console.error(error);
        toast.error(error.message || 'Không thể xóa nhà cung cấp');
      }
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('partners.suppliers')}
        description={t('partners.subtitle')}
        actions={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            {t('app.create')}
          </button>
        }
      />

      <DataTable
        data={suppliers}
        columns={[
          { key: 'code', header: t('app.sku') },
          { key: 'name', header: t('partners.suppliername') },
          { key: 'contact', header: t('partners.contact') },
          { key: 'businessType', header: t('partners.businessType'), render: (value) => businessTypes.find((item) => item.value === value)?.label ?? value },
          {
            key: 'isActive',
            header: t('app.status'),
            render: (val) => val ? <span className="text-green-600 text-xs font-medium">{t('app.isActive')}</span> : <span className="text-slate-400 text-xs">{t('app.notActive')}</span>
          },
          {
            key: 'actions',
            header: t('app.actions'),
            sortable: false,
            render: (_, row) => (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(row)}
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
        title={editing ? 'Cập nhật nhà cung cấp' : 'Thêm nhà cung cấp mới'}
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
              form="supplier-form"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {t('app.save')}
            </button>
          </>
        }
      >
        <form id="supplier-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Mã NCC"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
              required
              placeholder="VD: SUP001"
            />
            <Select
              label="Loại hình"
              value={form.businessType}
              onChange={(event) => setForm((prev) => ({ ...prev, businessType: event.target.value }))}
              options={businessTypes}
            />
          </div>

          <Input
            label="Tên nhà cung cấp"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Mã số thuế"
              value={form.taxCode}
              onChange={(event) => setForm((prev) => ({ ...prev, taxCode: event.target.value }))}
            />
            <Input
              label="Liên hệ"
              value={form.contact}
              onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
              placeholder="SĐT, Email..."
            />
          </div>

          <Input
            label="Địa chỉ"
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          />

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="sup-active"
              checked={form.isActive}
              onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
            />
            <label htmlFor="sup-active" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Đang hoạt động
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}





