import clsx from 'clsx';

export function Tag({ label, color = 'indigo', className }) {
  const colors = {
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        colors[color] ?? colors.indigo,
        className,
      )}
    >
      {label}
    </span>
  );
}
