import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Check, X, Shield, User } from 'lucide-react';
import { DataTable } from '../../components/DataTable.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { apiClient } from '../../services/apiClient.js';
import toast from 'react-hot-toast';

const emptyUser = {
  fullName: '',
  email: '',
  role: 'Staff',
  password: '',
  isActive: true,
};

const ROLES = [
  { value: 'Admin', label: 'Admin (Quản trị viên)' },
  { value: 'Manager', label: 'Manager (Quản lý)' },
  { value: 'Staff', label: 'Staff (Nhân viên)' },
];

export function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyUser);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Add timestamp to prevent caching
      const res = await apiClient('/users', { params: { t: Date.now() } });
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error(t('users.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreateModal = () => {
    setForm(emptyUser);
    setEditing(null);
    setOpen(true);
  };

  const openEditModal = (user) => {
    setEditing(user);
    setForm({ ...user, password: '' });
    setOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.email || !form.fullName) {
      toast.error(t('users.validation.required'));
      return;
    }

    try {
      if (editing) {
        // Only send allowed fields
        const payload = {
          email: form.email,
          fullName: form.fullName,
          role: form.role,
          isActive: form.isActive,
        };
        if (form.password) payload.password = form.password;

        await apiClient(`/users/${editing.id}`, {
          method: 'PUT',
          body: payload
        });
        toast.success(t('users.updateSuccess'));
      } else {
        if (!form.password) {
          toast.error(t('users.validation.passwordRequired'));
          return;
        }
        const { isActive, ...createPayload } = form;
        await apiClient('/users', {
          method: 'POST',
          body: createPayload
        });
        toast.success(t('users.createSuccess'));
      }
      setOpen(false);
      fetchUsers();
    } catch (error) {
      console.error(error);
      if (error.details && Array.isArray(error.details)) {
        error.details.forEach(issue => {
          const field = issue.path.join('.');
          toast.error(`${field}: ${issue.message}`);
        });
      } else {
        toast.error(error.message || t('app.error'));
      }
    }
  };

  const handleDelete = async (id) => {
    if (confirm(t('users.deleteConfirm'))) {
      try {
        await apiClient(`/users/${id}`, { method: 'DELETE' });
        toast.success(t('users.deleteSuccess'));
        fetchUsers();
      } catch (error) {
        console.error(error);
        toast.error(error.message || t('users.deleteError'));
      }
    }
  };

  const columns = [
    {
      key: 'fullName',
      header: t('users.fields.fullName'),
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
            <User className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{value}</div>
            <div className="text-xs text-slate-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('users.fields.role'),
      render: (value) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium border ${value === 'Admin'
          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
          : value === 'Manager'
            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
            : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
          }`}>
          <Shield className="h-3 w-3" />
          {value}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: t('users.fields.status'),
      render: (value) => (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${value ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
          {value ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {value ? t('users.status.active') : t('users.status.inactive')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: t('users.fields.createdAt'),
      render: (value) => value ? new Date(value).toLocaleDateString() : '—',
    },
    {
      key: 'actions',
      header: t('app.actions'),
      sortable: false,
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            title={t('app.edit')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            title={t('app.delete')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t('users.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('users.description')}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          {t('users.create')}
        </button>
      </div>

      <DataTable
        data={users}
        columns={columns}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t('users.edit') : t('users.create')}
        actions={
          <>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('app.cancel')}
            </button>
            <button
              type="submit"
              form="user-form"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              {editing ? t('app.save') : t('users.create')}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('users.fields.fullName')}
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
            placeholder="Ex: John Doe"
          />
          <Input
            label={t('users.fields.email')}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            placeholder="user@example.com"
          />
          <Select
            label={t('users.fields.role')}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={ROLES}
          />

          {!editing && (
            <Input
              label={t('users.fields.password')}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              placeholder={t('users.validation.passwordMin')}
            />
          )}

          {editing && (
            <Input
              label={t('users.fields.newPassword')}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="********"
            />
          )}

          {editing && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('users.fields.isActive')}
              </label>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
