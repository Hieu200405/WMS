import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/forms/Input.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { Roles } from '../../utils/constants.js';
import { useAuth } from '../../app/auth-context.jsx';
import toast from 'react-hot-toast';

const roleOptions = [
  { value: Roles.ADMIN, label: 'Admin' },
  { value: Roles.MANAGER, label: 'Manager' },
  { value: Roles.STAFF, label: 'Staff' },
];

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: Roles.STAFF,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(form);
      toast.success('User created successfully.');
      navigate('/users', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#020617] overflow-hidden selection:bg-indigo-500/30">
      <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-rose-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />

      <div className="z-10 w-full max-w-xl px-4 animate-fade-in-up">
        <div className="mb-12 text-center text-white">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[2.5rem] bg-indigo-600 shadow-2xl shadow-indigo-500/40 transform transition hover:scale-110 duration-300">
            <span className="text-3xl font-black italic">W</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter sm:text-5xl">{t('app.title')}</h1>
          <p className="mt-4 text-lg font-medium text-slate-400 opacity-80">
            Create a new account with the right role and access level.
          </p>
        </div>

        <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl shadow-2xl dark:bg-slate-900/40 md:p-12">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Create account</h2>
            <p className="text-sm text-slate-500 mb-8">Only admins can register new users.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Input
                label="Full name"
                className="!h-14 !rounded-2xl !border-transparent !bg-white/5 !px-6 !text-white !ring-indigo-500/50 transition-all focus:!bg-white/10"
                value={form.fullName}
                onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                required
                placeholder="Jane Doe"
              />
            </div>

            <div className="space-y-2">
              <Input
                label="Email"
                type="email"
                className="!h-14 !rounded-2xl !border-transparent !bg-white/5 !px-6 !text-white !ring-indigo-500/50 transition-all focus:!bg-white/10"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
                placeholder="user@wms.local"
              />
            </div>

            <div className="space-y-2">
              <Input
                label="Password"
                className="!h-14 !rounded-2xl !border-transparent !bg-white/5 !px-6 !text-white !ring-indigo-500/50 transition-all focus:!bg-white/10"
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required
                placeholder="********"
              />
            </div>

            <div className="space-y-2">
              <Select
                label="Role"
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                options={roleOptions}
                className="!h-14 !rounded-2xl !border-transparent !bg-white/5 !px-6 !text-white !ring-indigo-500/50 transition-all focus:!bg-white/10"
              />
            </div>

            {error ? (
              <div className="rounded-2xl bg-rose-500/10 p-4 border border-rose-500/20">
                <p className="text-sm text-rose-400 font-medium">{error}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="group relative h-14 w-full overflow-hidden rounded-2xl bg-indigo-600 font-bold text-white shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative z-10">
                {loading ? 'Creating account...' : 'Create account'}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Ac 2026 {t('app.title')} Enterprise System
          </div>
        </div>
      </div>
    </div>
  );
}
