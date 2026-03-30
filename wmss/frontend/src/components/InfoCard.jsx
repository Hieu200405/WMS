export function InfoCard({ title, value, className = '' }) {
    return (
        <div className={`card group p-5 hover:shadow-indigo-500/5 ${className}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-500 transition-colors">{title}</p>
            <p className="mt-1 text-base font-black text-slate-900 dark:text-white truncate">{value ?? '--'}</p>
        </div>
    );
}
