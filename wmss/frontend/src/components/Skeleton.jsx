import clsx from 'clsx';

export function Skeleton({ className, ...props }) {
    return (
        <div
            className={clsx("animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800/80", className)}
            {...props}
        />
    );
}
