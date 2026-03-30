import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../app/auth-context';
import { Input } from '../../components/forms/Input';
import { apiClient } from '../../services/apiClient';
import toast from 'react-hot-toast';
import { User, Lock, Mail, Shield } from 'lucide-react';

export function ProfilePage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [passwordForm, setPasswordForm] = useState({ currentPass: '', newPass: '', confirmPass: '' });
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordForm.newPass !== passwordForm.confirmPass) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }
        setLoading(true);
        try {
            await apiClient('/auth/password', {
                method: 'PUT',
                body: { currentPass: passwordForm.currentPass, newPass: passwordForm.newPass }
            });
            toast.success('Đổi mật khẩu thành công');
            setPasswordForm({ currentPass: '', newPass: '', confirmPass: '' });
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Lỗi đổi mật khẩu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hồ sơ cá nhân</h1>
                <p className="text-sm text-slate-500">Quản lý thông tin tài khoản và bảo mật</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Info Card */}
                <div className="card space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-3xl font-bold text-indigo-600">
                            {user?.fullName?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">{user?.fullName}</h3>
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                                {user?.role}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                            <Mail className="h-5 w-5 text-slate-400" />
                            <span>{user?.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                            <Shield className="h-5 w-5 text-slate-400" />
                            <span>Role: {t(`roles.${user?.role}`)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                            <User className="h-5 w-5 text-slate-400" />
                            <span>ID: {user?.id}</span>
                        </div>
                    </div>
                </div>

                {/* Password Card */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-6">
                        <Lock className="h-5 w-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold">Đổi mật khẩu</h3>
                    </div>

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <Input
                            label="Mật khẩu hiện tại"
                            type="password"
                            value={passwordForm.currentPass}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPass: e.target.value }))}
                            required
                        />
                        <Input
                            label="Mật khẩu mới"
                            type="password"
                            value={passwordForm.newPass}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPass: e.target.value }))}
                            required
                            minLength={8}
                        />
                        <Input
                            label="Xác nhận mật khẩu mới"
                            type="password"
                            value={passwordForm.confirmPass}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPass: e.target.value }))}
                            required
                            minLength={8}
                        />
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
