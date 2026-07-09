'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
};

type ConfirmState = ConfirmOptions & {
  open: boolean;
  resolve?: (value: boolean) => void;
};

const ConfirmContext = createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>;
} | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>({ open: false, message: '' });

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, open: true, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    state.resolve?.(result);
    setState((s) => ({ ...s, open: false, resolve: undefined }));
  };

  const isDanger = state.variant === 'danger';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {state.open && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => close(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a1f] p-6 shadow-2xl shadow-black/50"
            >
              <div className="flex items-start gap-4 mb-6">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isDanger ? 'bg-red-500/15 text-red-400' : 'bg-[var(--primary)]/15 text-[var(--primary)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">
                    {isDanger ? 'warning' : 'help'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--foreground)]">
                    {state.title || (isDanger ? 'Confirm action' : 'Are you sure?')}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] mt-2 leading-relaxed">{state.message}</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-[var(--foreground)] hover:bg-white/5 transition-all"
                >
                  {state.cancelLabel || 'No, cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => close(true)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isDanger
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                      : 'bg-[var(--primary)] text-[#131313] hover:opacity-90 shadow-lg shadow-[var(--primary)]/20'
                  }`}
                >
                  {state.confirmLabel || 'Yes, continue'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
