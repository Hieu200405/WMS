import { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { Package, AlertCircle } from 'lucide-react';

export function WarehouseVisualMap({ nodeId, onSelectNode }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!nodeId) return;
        const fetchVis = async () => {
            setLoading(true);
            try {
                const res = await apiClient(`/warehouse/${nodeId}/visualization`);
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchVis();
    }, [nodeId]);

    if (loading) return <div className="p-4 text-center text-slate-500">Đang tải bản đồ...</div>;
    if (!data || !data.children || data.children.length === 0) {
        return (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg dark:border-slate-700">
                <Package className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-slate-500">Không có dữ liệu trực quan hoặc chưa có vị trí con.</p>
            </div>
        );
    }

    return (
        <div className="card space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                Bản đồ trực quan: {data.name}
                <span className="text-sm font-normal text-slate-500">({data.code})</span>
            </h3>

            <div className="flex gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-300"></span> Trống (0%)</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span> Còn chỗ (&lt;70%)</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span> Sắp đầy (70-90%)</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-100 border border-rose-300"></span> Đầy (&gt;90%)</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {data.children.map(child => {
                    let colorClass = 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'; // Empty
                    if (child.utilization > 90) colorClass = 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100';
                    else if (child.utilization > 70) colorClass = 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100';
                    else if (child.utilization > 0) colorClass = 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100';

                    return (
                        <div
                            key={child._id}
                            onClick={() => onSelectNode && onSelectNode(child)}
                            className={`
                            relative p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md
                            flex flex-col items-center justify-center min-h-[80px] text-center
                            ${colorClass}
                        `}
                            title={`Sức chứa: ${child.currentQty} / ${child.capacity || '∞'}\n(${child.utilization}%)`}
                        >
                            <span className="font-bold text-sm truncate w-full">{child.name}</span>
                            <span className="text-[10px] opacity-75">{child.code}</span>

                            {child.capacity > 0 && (
                                <div className="w-full bg-black/10 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="h-full bg-current transition-all duration-500"
                                        style={{ width: `${Math.min(child.utilization, 100)}%` }}
                                    />
                                </div>
                            )}
                            {child.itemsCount > 0 && (
                                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/10 text-[8px] font-bold">
                                    {child.itemsCount}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
