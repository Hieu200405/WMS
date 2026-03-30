import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Building2, Package, CheckCircle2, FileText, Calendar, Hash, Truck, AlertCircle } from 'lucide-react';
import { apiClient } from '../../services/apiClient.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export function SupplierConfirmPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [receipt, setReceipt] = useState(null);
    const [supplier, setSupplier] = useState(null);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        const fetchReceipt = async () => {
            try {
                const res = await apiClient(`/receipts/${id}`);
                setReceipt(res.data || res);

                // Fetch supplier info
                const supplierId = res.data?.supplierId || res.supplierId;
                if (supplierId) {
                    const supRes = await apiClient(`/partners/${typeof supplierId === 'object' ? supplierId._id || supplierId.id : supplierId}`);
                    setSupplier(supRes.data || supRes);
                }
            } catch (error) {
                console.error(error);
                toast.error('Không thể tải thông tin đơn hàng');
            } finally {
                setLoading(false);
            }
        };
        fetchReceipt();
    }, [id]);

    const handleConfirm = async () => {
        setConfirming(true);
        try {
            await apiClient(`/receipts/${id}/transition`, {
                method: 'POST',
                body: { to: 'supplierConfirmed' }
            });
            toast.success('Đơn hàng đã được xác nhận thành công!');
            // Navigate back to receipts list after short delay
            setTimeout(() => navigate('/receipts'), 1500);
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Không thể xác nhận đơn hàng');
        } finally {
            setConfirming(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    if (!receipt) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4">
                <AlertCircle className="h-16 w-16 text-red-400" />
                <p className="text-lg text-slate-600 dark:text-slate-400">Không tìm thấy đơn hàng</p>
                <Link to="/receipts" className="text-indigo-600 hover:underline">
                    ← Quay lại danh sách
                </Link>
            </div>
        );
    }

    const totalAmount = (receipt.lines || []).reduce(
        (sum, line) => sum + (Number(line.qty) || 0) * (Number(line.priceIn) || 0),
        0
    );

    const isAlreadyConfirmed = receipt.status === 'supplierConfirmed' || receipt.status === 'completed';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            {/* Supplier Portal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white shadow-lg">
                <div className="mx-auto max-w-4xl">
                    <div className="flex items-center gap-3 mb-4">
                        <Building2 className="h-10 w-10" />
                        <div>
                            <h1 className="text-2xl font-bold">Cổng thông tin Nhà cung cấp</h1>
                            <p className="text-blue-100 text-sm">Supplier Portal - Xác nhận đơn hàng</p>
                        </div>
                    </div>
                    {supplier && (
                        <div className="mt-4 rounded-lg bg-white/10 px-4 py-3 backdrop-blur">
                            <p className="text-sm text-blue-100">Đang đăng nhập với vai trò:</p>
                            <p className="text-lg font-semibold">{supplier.name}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="mx-auto max-w-4xl px-6 py-8">
                {/* Back Link */}
                <Link
                    to="/receipts"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-6 transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại hệ thống WMS
                </Link>

                {/* Order Card */}
                <div className="rounded-2xl bg-white shadow-xl dark:bg-slate-800 overflow-hidden">
                    {/* Order Header */}
                    <div className="border-b border-slate-100 dark:border-slate-700 px-6 py-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-indigo-500" />
                                    Đơn đặt hàng #{receipt.code}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Yêu cầu xác nhận từ hệ thống WMS
                                </p>
                            </div>
                            <div className={`rounded-full px-4 py-1.5 text-sm font-semibold
                ${isAlreadyConfirmed
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                {isAlreadyConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}
                            </div>
                        </div>
                    </div>

                    {/* Order Info */}
                    <div className="px-6 py-5 grid grid-cols-2 gap-6 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-slate-100 p-2.5 dark:bg-slate-700">
                                <Hash className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Mã đơn hàng</p>
                                <p className="font-semibold text-slate-800 dark:text-white">{receipt.code}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-slate-100 p-2.5 dark:bg-slate-700">
                                <Calendar className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Ngày đặt hàng</p>
                                <p className="font-semibold text-slate-800 dark:text-white">{formatDate(receipt.date)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-slate-100 p-2.5 dark:bg-slate-700">
                                <Truck className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Giao đến</p>
                                <p className="font-semibold text-slate-800 dark:text-white">Kho WMS</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-indigo-100 p-2.5 dark:bg-indigo-900/30">
                                <Package className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Tổng giá trị</p>
                                <p className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{formatCurrency(totalAmount)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="px-6 py-5">
                        <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Package className="h-4 w-4 text-indigo-500" />
                            Chi tiết sản phẩm đặt hàng
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">STT</th>
                                        <th className="py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sản phẩm</th>
                                        <th className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Số lượng</th>
                                        <th className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Đơn giá</th>
                                        <th className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(receipt.lines || []).map((line, index) => {
                                        const productName = line.productId?.name || line.productName || `SP-${line.productId}`;
                                        const lineTotal = (Number(line.qty) || 0) * (Number(line.priceIn) || 0);
                                        return (
                                            <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50">
                                                <td className="py-4 text-slate-600 dark:text-slate-300">{index + 1}</td>
                                                <td className="py-4">
                                                    <p className="font-medium text-slate-800 dark:text-white">{productName}</p>
                                                    {line.sku && <p className="text-xs text-slate-500">{line.sku}</p>}
                                                </td>
                                                <td className="py-4 text-right font-medium text-slate-800 dark:text-white">{line.qty}</td>
                                                <td className="py-4 text-right text-slate-600 dark:text-slate-300">{formatCurrency(line.priceIn)}</td>
                                                <td className="py-4 text-right font-semibold text-slate-800 dark:text-white">{formatCurrency(lineTotal)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 dark:bg-slate-700/50">
                                        <td colSpan={4} className="py-4 px-2 text-right font-bold text-slate-800 dark:text-white">
                                            Tổng cộng:
                                        </td>
                                        <td className="py-4 text-right font-bold text-lg text-indigo-600 dark:text-indigo-400">
                                            {formatCurrency(totalAmount)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Notes */}
                    {receipt.notes && (
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Ghi chú từ khách hàng</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{receipt.notes}</p>
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="px-6 py-6 bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
                        {isAlreadyConfirmed ? (
                            <div className="flex items-center justify-center gap-3 py-4">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                <div>
                                    <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                                        Đơn hàng đã được xác nhận
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Cảm ơn bạn đã xác nhận. Vui lòng chuẩn bị hàng và giao theo lịch.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                                    <p className="text-sm text-amber-800 dark:text-amber-300">
                                        <strong>Lưu ý:</strong> Khi xác nhận đơn hàng, bạn cam kết sẽ cung cấp đúng số lượng và chất lượng sản phẩm như đã liệt kê ở trên.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={confirming}
                                    className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {confirming ? (
                                        <>
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-6 w-6" />
                                            Xác nhận đơn hàng
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-slate-400 dark:text-slate-500">
                    <p>Đây là trang giả lập Cổng thông tin Nhà cung cấp (Mock Supplier Portal)</p>
                    <p className="mt-1">Dành cho mục đích demo và kiểm thử hệ thống WMS</p>
                </div>
            </div>
        </div>
    );
}
