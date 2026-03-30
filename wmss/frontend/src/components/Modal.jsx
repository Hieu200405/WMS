import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const modalRootId = 'modal-root';

function ensureModalRoot() {
  if (typeof document === 'undefined') return null;
  let root = document.getElementById(modalRootId);
  if (!root) {
    root = document.createElement('div');
    root.setAttribute('id', modalRootId);
    document.body.appendChild(root);
  }
  return root;
}

export function Modal({ open, onClose, title, children, actions }) {
  if (!open) return null;

  const container = ensureModalRoot();
  if (!container) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/40 p-4 backdrop-blur-md">
      <div className="animate-in w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-white shadow-2xl dark:bg-slate-900">
        <div className="relative px-8 pt-8 pb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-8 py-4 space-y-6 overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          {children}
        </div>

        {actions ? (
          <div className="mt-2 bg-slate-50/50 px-8 py-6 flex items-center justify-end gap-3 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800">
            {actions}
          </div>
        ) : <div className="h-8" />}
      </div>
    </div>
  );

  return createPortal(content, container);
}
