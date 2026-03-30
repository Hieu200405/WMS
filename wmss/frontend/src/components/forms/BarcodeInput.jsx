import { useState } from 'react';
import clsx from 'clsx';

export function BarcodeInput({
  label,
  onScan,
  placeholder = 'Scan',
  className,
  ...props
}) {
  const [value, setValue] = useState('');

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (value && typeof onScan === 'function') {
        onScan(value);
      }
      setValue('');
    }
  };

  return (
    <label className="flex flex-col gap-1 text-sm">
      {label ? <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span> : null}
      <input
        type="text"
        className={clsx(
          'rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-indigo-500/60 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-400',
          className,
        )}
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </label>
  );
}
