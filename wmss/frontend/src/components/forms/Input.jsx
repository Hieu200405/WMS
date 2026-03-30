import clsx from 'clsx';

export function Input({
  label,
  error,
  helperText,
  className,
  ...props
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      {label ? <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1 leading-none">{label}</span> : null}
      <input
        className={clsx(
          'input',
          error && 'border-rose-500/50 bg-rose-50/10 text-rose-600 ring-rose-500/20 placeholder:text-rose-300 focus:bg-white dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-400',
          className,
        )}
        {...props}
      />
      {helperText && !error ? (
        <span className="text-xs text-slate-400 ml-1">{helperText}</span>
      ) : null}
      {error ? (
        <span className="text-[10px] font-bold text-rose-500 ml-1 uppercase">{error}</span>
      ) : null}
    </label>
  );
}
