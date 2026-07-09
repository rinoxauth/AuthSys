'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '@/lib/api';
import { toast } from 'sonner';
import { canAccessAI } from '@/lib/plan-access';
import { useDeveloperMe } from '@/hooks/use-developer-queries';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

const WELCOME: Message = {
  id: uid(),
  role: 'assistant',
  content:
    "Hello! I'm your AI assistant. How can I help you today?",
  timestamp: new Date(),
  status: 'sent',
};

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]"
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0 mb-0.5">
          <span
            className="material-symbols-outlined text-[13px] text-[var(--primary)]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            smart_toy
          </span>
        </div>
      )}
      <div
        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-[12.5px] leading-relaxed whitespace-pre-wrap font-medium ${
          isUser
            ? 'bg-[var(--primary)] text-white rounded-br-sm shadow-lg shadow-[var(--primary)]/20'
            : 'bg-white/[0.06] text-[var(--foreground)] border border-white/[0.08] rounded-bl-sm'
        }`}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

// ─── Action result banner ─────────────────────────────────────────────────────
function ActionBanner({ result, onDismiss }: { result: ActionResult; onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`mx-3 mb-2 rounded-xl px-3 py-2.5 flex items-center gap-2.5 text-[11px] font-bold border ${
        result.success
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : 'bg-red-500/10 border-red-500/20 text-red-400'
      }`}
    >
      <span className="material-symbols-outlined text-[15px]">
        {result.success ? 'check_circle' : 'error'}
      </span>
      <span className="flex-1">{result.message}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity">
        <span className="material-symbols-outlined text-[13px]">close</span>
      </button>
    </motion.div>
  );
}

// ─── Locked state ─────────────────────────────────────────────────────────────
function LockedState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5"
      >
        <span
          className="material-symbols-outlined text-3xl text-amber-400"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          lock
        </span>
      </motion.div>
      <h3 className="text-sm font-black text-[var(--foreground)] mb-2 tracking-tight">AI Assistant Locked</h3>
      <p className="text-[11px] text-[var(--muted-foreground)] mb-6 leading-relaxed max-w-[220px]">
        Upgrade to{' '}
        <span className="text-amber-400 font-bold">Seller</span> or{' '}
        <span className="text-amber-400 font-bold">Enterprise</span> plan to unlock
        AI-powered chat and automation.
      </p>
      <a
        href="/settings/billing"
        onClick={onClose}
        className="px-5 py-2.5 rounded-xl bg-amber-500/15 text-amber-400 text-[11px] font-black uppercase tracking-widest hover:bg-amber-500/25 transition-all"
      >
        View Plans →
      </a>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────
export default function AIChatWidget() {
  const { data: profile } = useDeveloperMe(true);
  const userTier    = profile?.subscription_tier;
  const hasAIAccess = canAccessAI(userTier);

  const [isOpen,       setIsOpen]       = useState(false);
  const [messages,     setMessages]     = useState<Message[]>([WELCOME]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [modelLabel,   setModelLabel]   = useState('AI');
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [isMinimized,  setIsMinimized]  = useState(false);
  const [unread,       setUnread]       = useState(0);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // focus input on open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setUnread(0);
    }
  }, [isOpen, isMinimized]);

  // fetch model label
  useEffect(() => {
    if (!isOpen) return;
    api
      .get('/api/v1/ai/config')
      .then((res) => setModelLabel(res.data?.provider || res.data?.model || 'AI'))
      .catch(() => {});
  }, [isOpen]);

  const appendMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    const full: Message = { ...msg, id: uid(), timestamp: new Date() };
    setMessages((prev) => [...prev, full]);
    if (!isOpen || isMinimized) setUnread((n) => n + 1);
    return full;
  }, [isOpen, isMinimized]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setInput('');
    setActionResult(null);

    const userMsg = appendMessage({ role: 'user', content, status: 'sending' });
    setLoading(true);

    try {
      const res = await api.post('/api/v1/ai/chat', {
        messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
        context: {},
        execute_actions: true,
      });

      const data = res.data;

      appendMessage({
        role: 'assistant',
        content: data.response || data.content || 'Sorry, I received an empty response.',
        status: 'sent',
      });

      if (data.model) setModelLabel(data.model);

      if (data.action_executed && data.action_result) {
        const ar: ActionResult = {
          success: data.action_result.success ?? false,
          message: data.action_result.message ?? '',
          data:    data.action_result.data,
        };
        setActionResult(ar);
        ar.success
          ? toast.success(ar.message)
          : toast.error(ar.message || 'Action failed');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      appendMessage({
        role: 'assistant',
        content: typeof detail === 'string' ? detail : 'Sorry, I encountered an error. Please try again.',
        status: 'error',
      });
      toast.error('Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleOpen = () => {
    setIsOpen((v) => !v);
    setIsMinimized(false);
    if (!isOpen) setUnread(0);
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    setActionResult(null);
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-20 right-6 z-[100] flex flex-col items-end gap-3">

      {/* ── Chat panel ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 40, scale: 0.93 }}
            animate={isMinimized
              ? { opacity: 1, y: 0, scale: 1, height: 56 }
              : { opacity: 1, y: 0, scale: 1, height: 520 }
            }
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26, mass: 0.8 }}
            className="w-[360px] max-w-[calc(100vw-1.5rem)] bg-[#0f0f12] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
            style={{ maxHeight: 'min(520px, calc(100vh - 6rem))' }}
          >
            {/* header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] bg-[var(--card)] flex-shrink-0">
              <div className="w-8 h-8 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center flex-shrink-0">
                <span
                  className="material-symbols-outlined text-[18px] text-[var(--primary)]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  smart_toy
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black text-[var(--foreground)] leading-none">AuthSys AI</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasAIAccess ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  />
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted-foreground)] truncate">
                    {hasAIAccess ? modelLabel : 'Locked'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all"
                >
                  <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                </button>
                <button
                  onClick={() => setIsMinimized((v) => !v)}
                  title={isMinimized ? 'Expand' : 'Minimize'}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-all"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isMinimized ? 'expand_less' : 'remove'}
                  </span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              </div>
            </div>

            {/* body — hidden when minimized */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col flex-1 min-h-0"
                >
                  {hasAIAccess ? (
                    <>
                      {/* messages */}
                      <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scroll-smooth"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#2a2a2a transparent' }}
                      >
                        {messages.map((msg) => (
                          <MessageBubble key={msg.id} msg={msg} />
                        ))}
                        {loading && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start items-end gap-2"
                          >
                            <div className="w-6 h-6 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                              <span
                                className="material-symbols-outlined text-[13px] text-[var(--primary)]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                smart_toy
                              </span>
                            </div>
                            <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                              <TypingDots />
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* action result */}
                      <AnimatePresence>
                        {actionResult && (
                          <ActionBanner
                            result={actionResult}
                            onDismiss={() => setActionResult(null)}
                          />
                        )}
                      </AnimatePresence>

                      {/* input */}
                      <div className="p-3 border-t border-white/[0.07] bg-[var(--card)] flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 relative">
                            <input
                              ref={inputRef}
                              type="text"
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              onKeyDown={handleKey}
                              placeholder="Ask something…"
                              disabled={loading}
                              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-[12.5px] text-[var(--foreground)] placeholder:text-[#555] focus:border-[var(--primary)]/40 focus:bg-white/[0.06] outline-none transition-all pr-3 disabled:opacity-50"
                            />
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            onClick={() => handleSend()}
                            disabled={loading || !input.trim()}
                            className="w-9 h-9 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--primary)]/25 hover:bg-[#c4663f] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                          >
                            <span className="material-symbols-outlined text-[16px]">send</span>
                          </motion.button>
                        </div>
                        <p className="text-[9px] text-center text-[#444] mt-2 font-bold uppercase tracking-widest">
                          Powered by {modelLabel}
                        </p>
                      </div>
                    </>
                  ) : (
                    <LockedState onClose={() => setIsOpen(false)} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB button ──────────────────────────────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.05 }}
        onClick={toggleOpen}
        animate={isOpen ? { rotate: 0 } : { rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative w-14 h-14 bg-[var(--primary)] text-white rounded-2xl shadow-xl shadow-[var(--primary)]/35 flex items-center justify-center overflow-hidden"
        aria-label={isOpen ? 'Close AI chat' : 'Open AI chat'}
      >
        {/* ripple ring */}
        {!isOpen && (
          <motion.span
            className="absolute inset-0 rounded-2xl border-2 border-[var(--primary)]"
            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {/* icon swap */}
        <AnimatePresence mode="wait">
          <motion.span
            key={isOpen ? 'close' : 'open'}
            initial={{ rotate: -20, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0,   opacity: 1, scale: 1   }}
            exit={{   rotate:  20,  opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22, mass: 0.6 }}
            className="material-symbols-outlined text-[26px] relative z-10"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isOpen ? 'close' : 'smart_toy'}
          </motion.span>
        </AnimatePresence>

        {/* unread badge */}
        <AnimatePresence>
          {unread > 0 && !isOpen && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#0f0f12] z-20"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}