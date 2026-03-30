import clsx from 'clsx';

export function Select({
  label,
  options = [],
  placeholder,
  error,
  helperText,
  className,
  ...props
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label ? <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span> : null}
      <select
        className={clsx(
          'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400',
          error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-200 dark:border-rose-400',
          className,
        )}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value ?? option.id} value={option.value ?? option.id}>
            {option.label ?? option.name}
          </option>
        ))}
      </select>
      {helperText ? (
        <span className="text-xs text-slate-500 dark:text-slate-400">{helperText}</span>
      ) : null}
      {error ? (
        <span className="text-xs text-rose-500">{error}</span>
      ) : null}
    </label>
  );
}
