'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Cookie, X, Shield, Check, Info } from 'lucide-react';

const CONSENT_KEY = 'rinox-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9980] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="fixed bottom-0 left-0 right-0 z-[9999] sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-[calc(100%-3rem)] sm:max-w-lg"
          >
            <div className="relative rounded-t-2xl sm:rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#181818] to-[#0d0d0d] shadow-2xl shadow-black/80 p-4 sm:p-6">
              {/* Close — desktop only */}
              <button
                onClick={decline}
                className="hidden sm:flex absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.04] items-center justify-center text-[var(--muted-foreground)] hover:text-white transition-all z-20"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                {/* Icon — desktop only */}
                <div className="hidden sm:flex relative shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 border border-[var(--primary)]/15 flex items-center justify-center">
                    <Cookie className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-0.5">
                    This site uses cookies
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed sm:mb-0">
                    We use essential cookies for security &amp; preferences. Read our{' '}
                    <Link href="/cookies" className="text-[var(--primary)] underline underline-offset-2">Cookie Policy</Link>.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <button
                    onClick={accept}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-black text-xs font-black uppercase tracking-widest hover:bg-[var(--primary)]/90 active:scale-[0.97] transition-all shadow-lg shadow-[var(--primary)]/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={decline}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-white/[0.08] text-[var(--muted-foreground)] text-xs font-black uppercase tracking-widest hover:text-white hover:bg-white/[0.04] active:scale-[0.97] transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
