'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type CopyOptions = {
  label?: string;
  description?: string;
};

type CopyState = CopyOptions & {
  open: boolean;
  text: string;
};

const CopyContext = createContext<{
  copy: (text: string, options?: CopyOptions) => Promise<void>;
} | null>(null);

const toastVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 380, damping: 26 },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.95,
    transition: { duration: 0.18, ease: 'easeIn' as const },
  },
};

export function CopyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CopyState>({ open: false, text: '' });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string, options?: CopyOptions) => {
    const value = (text ?? '').trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      Object.assign(el.style, { position: 'fixed', opacity: '0' });
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    // Reset timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setState({
      open: true,
      text: value,
      label: options?.label ?? 'Copied to clipboard',
      description: options?.description,
    });

    timerRef.current = setTimeout(() => {
      setState((s) => ({ ...s, open: false }));
    }, 3000);
  }, []);

  const close = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState((s) => ({ ...s, open: false }));
  };

  return (
    <CopyContext.Provider value={{ copy }}>
      {children}
      <AnimatePresence>
        {state.open && (
          <motion.div
            key="copy-toast"
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-5 right-5 z-[210] w-full max-w-[340px] px-4 sm:px-0"
          >
            <div
              className={[
                'relative overflow-hidden rounded-2xl p-4',
                'bg-[#18181b]/95 backdrop-blur-xl',
                'border border-emerald-500/20',
                'shadow-2xl shadow-black/50',
                'ring-1 ring-inset ring-white/5',
              ].join(' ')}
              onClick={close}
            >
              {/* Progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/60 rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 3, ease: 'linear' }}
              />

              {/* Top glow line */}
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(52,211,153,0.3), transparent)',
                }}
              />

              <div className="flex items-start gap-3">
                {/* Icon with pulse */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/25 flex items-center justify-center text-emerald-400">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-emerald-500/20"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#e5e2e1] leading-tight">
                    {state.label}
                  </p>
                  {state.description && (
                    <p className="text-xs text-[#8e8ea0] mt-0.5">{state.description}</p>
                  )}
                  <code className="mt-2 block text-[11px] font-mono text-emerald-400/80 bg-black/30 rounded-lg px-2.5 py-1.5 break-all max-h-16 overflow-y-auto border border-emerald-500/10">
                    {state.text}
                  </code>
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); close(); }}
                  className="text-[#8e8ea0] hover:text-white transition-colors shrink-0 p-0.5"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CopyContext.Provider>
  );
}

export function useCopy() {
  const ctx = useContext(CopyContext);
  if (!ctx) throw new Error('useCopy must be used within CopyProvider');
  return ctx.copy;
}