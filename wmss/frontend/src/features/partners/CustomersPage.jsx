import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../../components/DataTable.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { NumberInput } from '../../components/forms/NumberInput.jsx';
import { apiClient } from '../../services/apiClient.js';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/PageHeader.jsx';

const emptyCustomer = {
  type: 'customer',
  code: '',
  name: '',
  customerType: 'Individual',
  policy: '',
  creditLimit: 0,
  paymentTerm: 'Net 30',
  contact: '',
  isActive: true,
};


export function CustomersPage() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCustomer);

  const customerTypes = [
    { value: 'Individual', label: t('partners.customerTypes.individual') },
    { value: 'Corporate', label: t('partners.customerTypes.corporate') },
  ];

  const paymentTerms = [
    { value: 'COD', label: t('partners.paymentTerms.cod') },
    { value: 'Net 15', label: t('partners.paymentTerms.net15') },
    { value: 'Net 30', label: t('partners.paymentTerms.net30') },
    { value: 'Prepaid', label: t('partners.paymentTerms.prepaid') },
  ];


  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient('/partners', { params: { type: 'customer' } });
      setCustomers(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openCreateModal = () => {
    setForm(emptyCustomer);
    setEditing(null);
    setOpen(true);
  };

  const openEditModal = (customer) => {
    setEditing(customer);
    setForm(customer);
    setOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form, type: 'customer' };
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
        toast.success('Thêm khách hàng thành công');
      }
      setOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (customer) => {
    if (window.confirm('Xóa khách hàng này?')) {
      try {
        await apiClient(`/partners/${customer.id}`, { method: 'DELETE' });
        toast.success('Xóa thành công');
        fetchCustomers();
      } catch (error) {
        console.error(error);
        toast.error(error.message || 'Không thể xóa khách hàng');
      }
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('partners.customers')}
        description={t('partners.customerSubtitle')}
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
        data={customers}
        columns={[
          { key: 'code', header: t('app.sku') },
          { key: 'name', header: t('partners.customername') },
          { key: 'customerType', header: t('partners.customerType'), render: (value) => customerTypes.find((item) => item.value === value)?.label ?? value },
          { key: 'creditLimit', header: t('partners.creditLimit'), render: (val) => val?.toLocaleString() ?? 0 },
          { key: 'paymentTerm', header: t('partners.paymentTerm'), render: (value) => paymentTerms.find((item) => item.value === value)?.label ?? value },
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
        title={editing ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới'}
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
              form="customer-form"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {t('app.save')}
            </button>
          </>
        }
      >
        <form id="customer-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Mã KH"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
              required
              placeholder="VD: KH001"
            />
            <Select
              label="Loại khách hàng"
              value={form.customerType}
              onChange={(event) => setForm((prev) => ({ ...prev, customerType: event.target.value }))}
              options={customerTypes}
            />
          </div>

          <Input
            label="Tên khách hàng"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <NumberInput
              label="Hạn mức nợ"
              value={form.creditLimit}
              onChange={(e) => setForm(prev => ({ ...prev, creditLimit: Number(e.target.value) }))}
              min={0}
            />
            <Select
              label="Điều khoản thanh toán"
              value={form.paymentTerm}
              onChange={(e) => setForm(prev => ({ ...prev, paymentTerm: e.target.value }))}
              options={paymentTerms}
            />
          </div>

          <Input
            label="Liên hệ"
            value={form.contact}
            onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
            placeholder="SĐT, Email..."
          />

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="cus-active"
              checked={form.isActive}
              onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
            />
            <label htmlFor="cus-active" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Đang hoạt động
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}





