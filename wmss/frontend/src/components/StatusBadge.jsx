import clsx from 'clsx';

const CONFIG = {
  // Receipt/Delivery/Stocktake/Return
  approved: { label: 'Đã duyệt', color: 'bg-indigo-500/10 text-indigo-600' },
  supplierConfirmed: { label: 'NCC Xác nhận', color: 'bg-blue-500/10 text-blue-600' },
  completed: { label: 'Hoàn tất', color: 'bg-emerald-500/10 text-emerald-600' },
  rejected: { label: 'Từ chối', color: 'bg-rose-500/10 text-rose-600' },
  prepared: { label: 'Đang soạn', color: 'bg-amber-500/10 text-amber-600' },
  delivered: { label: 'Đang giao', color: 'bg-teal-500/10 text-teal-600' },
  cancelled: { label: 'Đã hủy', color: 'bg-slate-400/20 text-slate-400' },
  pending: { label: 'Chờ xử lý', color: 'bg-orange-500/10 text-orange-600' },
  quarantined: { label: 'Cach ly (QC)', color: 'bg-purple-500/10 text-purple-600' },
  pass: { label: 'Đạt yêu cầu', color: 'bg-emerald-500/10 text-emerald-600' },
  diff: { label: 'Chênh lệch', color: 'bg-amber-500/10 text-amber-600' },
};

export function StatusBadge({ status, className }) {
  const norm = status?.toLowerCase() || 'pass';
  const cfg = CONFIG[norm] || { label: status, color: 'bg-slate-200 text-slate-600' };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest',
        cfg.color,
        className,
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full bg-current opacity-80")} />
      {cfg.label}
    </span>
  );
}



