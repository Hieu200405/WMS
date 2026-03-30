import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { apiClient } from '../../services/apiClient';
import toast from 'react-hot-toast';

export function ReplenishmentModal({ open, onClose, suggestions, onConfirm }) {
    const [selectedSupplierIds, setSelectedSupplierIds] = useState([]);
    const [loading, setLoading] = useState(false);

    // Default select all on open? No, let user choose.
    // Or maybe select all by default? 
    // Let's select all by default when suggestions change.

    const handleCheckbox = (id) => {
        setSelectedSupplierIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleConfirm = async () => {
        if (selectedSupplierIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất một nhà cung cấp');
            return;
        }
        setLoading(true);
        try {
            const selectedSuggestions = suggestions.filter(s => selectedSupplierIds.includes(s.supplierId));
            await onConfirm(selectedSuggestions);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Đề xuất bổ sung hàng thông minh"
            actions={
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                    >
                        Để sau
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading || selectedSupplierIds.length === 0}
                        className="btn btn-primary"
                    >
                        {loading ? 'Đang tạo...' : 'Xác nhận tạo phiếu'}
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100 dark:bg-indigo-500/5 dark:border-indigo-500/10">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Hệ thống đã tự động tính toán nhu cầu hàng hóa dựa trên định mức tồn kho tối thiểu. Vui lòng chọn nhà cung cấp để khởi tạo phiếu nhập kho.
                    </p>
                </div>

                {suggestions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                        Kho hàng đã đạt định mức an toàn.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {suggestions.map(s => (
                            <div
                                key={s.supplierId}
                                onClick={() => handleCheckbox(s.supplierId)}
                                className={`cursor-pointer group relative overflow-hidden rounded-[2rem] border-2 p-6 transition-all duration-300 ${selectedSupplierIds.includes(s.supplierId) ? 'border-indigo-600 bg-white shadow-xl shadow-indigo-500/10 dark:bg-slate-800' : 'border-slate-100 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50'}`}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-colors",
                                            selectedSupplierIds.includes(s.supplierId) ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white dark:bg-slate-900"
                                        )}>
                                            {selectedSupplierIds.includes(s.supplierId) && (
                                                <div className="h-2 w-2 rounded-full bg-white transition-transform scale-125" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{s.supplierName}</h4>
                                            <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">{s.lines.length} mặt hàng cần nhập</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {s.lines.map(line => (
                                        <div key={line.productId} className="flex items-center justify-between text-xs py-2 border-b border-slate-100/50 dark:border-slate-800/50">
                                            <div>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">{line.name}</span>
                                                <span className="text-slate-400 ml-2 font-mono">#{line.sku}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-slate-400">Tồn: {line.currentStock}</span>
                                                <span className="font-black text-rose-500">+{line.suggestedQty}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}
