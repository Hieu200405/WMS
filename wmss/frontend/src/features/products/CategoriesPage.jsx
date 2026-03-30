import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../../components/DataTable.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { apiClient } from '../../services/apiClient.js';
import toast from 'react-hot-toast';
import { PageHeader } from '../../components/PageHeader.jsx';

const emptyCategory = {
  code: '',
  name: '',
  description: '',
  isActive: true,
};

export function CategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCategory);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient('/categories');
      setCategories(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateModal = () => {
    setForm(emptyCategory);
    setEditing(null);
    setOpen(true);
  };

  const openEditModal = (category) => {
    setEditing(category);
    setForm(category);
    setOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editing) {
        await apiClient(`/categories/${editing.id}`, {
          method: 'PUT',
          body: form
        });
        toast.success('Cập nhật thành công');
      } else {
        await apiClient('/categories', {
          method: 'POST',
          body: form
        });
        toast.success('Tạo danh mục thành công');
      }
      setOpen(false);
      fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (category) => {
    if (window.confirm('Xóa danh mục này?')) {
      try {
        await apiClient(`/categories/${category.id}`, { method: 'DELETE' });
        toast.success('Xóa danh mục thành công');
        fetchCategories();
      } catch (error) {
        console.error(error);
        toast.error(error.message || 'Không thể xóa danh mục (có thể đang được sử dụng)');
      }
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('categories.title')}
        actions={
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            {t('categories.create')}
          </button>
        }
      />

      <DataTable
        data={categories}
        columns={[
          { key: 'code', header: t('app.sku') },
          { key: 'name', header: t('products.category') },
          { key: 'description', header: t('categories.description') },
          {
            key: 'isActive',
            header: t('app.status'),
            render: (val) => (
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${val ? 'text-green-600' : 'text-slate-400'}`}>
                {val ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {val ? t('app.isActive') : t('app.notActive')}
              </span>
            )
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
        title={editing ? 'Cập nhật danh mục' : 'Thêm danh mục'}
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
              form="category-form"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              {t('app.save')}
            </button>
          </>
        }
      >
        <form id="category-form" className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Mã danh mục"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
              required
              placeholder="VD: ELEC"
            />
            <Input
              label={t('products.category')}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              placeholder="VD: Điện tử"
            />
          </div>

          <Input
            label="Mô tả"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Mô tả ngắn gọn..."
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cat-active"
              checked={form.isActive}
              onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
            />
            <label htmlFor="cat-active" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Đang hoạt động
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
