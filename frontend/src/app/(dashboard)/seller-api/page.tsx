'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { useDeveloperMe } from '@/hooks/use-developer-queries';
import { isFeatureLocked } from '@/lib/plan-access';
import PremiumLocked from '@/components/PremiumLocked';
import { motion, AnimatePresence } from 'framer-motion';

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/70 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 24 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="glass-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/8"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
      <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/15 text-white/40 hover:text-red-400 flex items-center justify-center transition-all duration-200"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.18em] mb-1.5 px-0.5">
      {children}
    </label>
  );
}

function GlassInput({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white/85 font-mono focus:outline-none focus:border-[var(--primary)]/50 focus:bg-[var(--primary)]/5 transition-all duration-200 placeholder:text-white/20 ${className}`}
      {...props}
    />
  );
}

export default function SellerAPIPage() {
  const { selectedAppId } = useAuthStore();
  const { data: profile } = useDeveloperMe(true);
  const locked = isFeatureLocked('seller', profile?.subscription_tier);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSellerName, setNewSellerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchSellers = async () => {
    if (locked) return;
    try {
      const res = await api.get('/developer/sellers');
      setSellers(res.data);
    } catch {
      toast.error('Failed to fetch sellers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (!locked) {
      fetchSellers();
    }
  }, [locked]);

  if (locked) return <PremiumLocked feature="Seller API" />;

  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerName) return toast.error('Please enter a seller name');
    try {
      setIsCreating(true);
      await api.post('/developer/sellers', { name: newSellerName });
      toast.success('Seller created successfully!');
      setNewSellerName('');
      setShowCreateModal(false);
      fetchSellers();
    } catch {
      toast.error('Failed to create seller');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = (id: number, key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API Key copied!');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (!mounted) return null;

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-end">
        <div className="space-y-3">
          <div className="h-10 w-72 bg-white/5 rounded-xl" />
          <div className="h-4 w-52 bg-white/5 rounded-xl" />
        </div>
        <div className="h-12 w-44 bg-white/5 rounded-2xl" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-28 bg-white/[0.02] border border-white/5 rounded-2xl" />)}
      </div>
      <div className="h-72 bg-white/[0.02] border border-white/5 rounded-2xl" />
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes shimmerSA {
          0%   { background-position:-200% center; }
          100% { background-position:200% center; }
        }
        @keyframes rowIn {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes statPop {
          0%   { transform:scale(0.9); opacity:0; }
          60%  { transform:scale(1.04); }
          100% { transform:scale(1); opacity:1; }
        }
        .shimmer-sa {
          background:linear-gradient(90deg,#fff 0%,var(--primary) 40%,#fff 60%);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          animation:shimmerSA 5s linear infinite;
        }
        .stat-card { animation:statPop 0.4s ease-out both; }
        .seller-row { animation:rowIn 0.3s ease-out both; }
        .seller-row:hover td { background:rgba(255,255,255,0.02); }
        .action-btn { transition:all 0.15s ease; }
        .action-btn:hover { transform:scale(1.12); }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-black text-white/25 uppercase tracking-[0.2em]">Third-party</span>
            <span className="material-symbols-outlined text-[12px] text-white/15">chevron_right</span>
            <span className="text-[9px] font-black text-[var(--primary)]/60 uppercase tracking-[0.2em]">Key Distribution</span>
          </div>
          <h2 className="text-5xl font-black tracking-tight leading-none shimmer-sa">Seller API</h2>
          <p className="text-white/35 mt-2 text-sm font-medium">
            Endpoint: <span className="font-mono text-[var(--primary)]/70 text-xs">/api/v1/developer/sellers/generate-key</span>
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="relative overflow-hidden flex items-center gap-2 bg-[var(--primary)] text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[var(--primary)]/25 hover:shadow-[var(--primary)]/45 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 group"
        >
          <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-200" />
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Seller
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Sellers', icon: 'storefront',    color: 'var(--primary)',   bg: 'rgba(var(--primary),0.1)',   val: sellers.length },
          { label: 'Active',        icon: 'check_circle',  color: '#34d399',               bg: 'rgba(52,211,153,0.1)',                 val: sellers.length },
          { label: 'Keys Issued',   icon: 'key',           color: 'var(--ring)', bg: 'rgba(var(--ring),0.1)', val: sellers.length },
        ].map((s, i) => (
          <div
            key={s.label}
            className="stat-card glass-card p-5 rounded-2xl border border-white/5 flex flex-col gap-4 hover:border-white/10 transition-all duration-300 group cursor-default"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-110"
              style={{ background: s.bg, borderColor: s.color + '30', color: s.color }}
            >
              <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
            </div>
            <div>
              <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-black mb-1">{s.label}</p>
              <p className="text-3xl font-black tabular-nums" style={{ color: s.color }}>{s.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="glass-card rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
        <div className="px-7 py-5 border-b border-white/5 bg-white/[0.015] flex items-center gap-3">
          <span className="material-symbols-outlined text-[18px] text-[var(--primary)]/60">storefront</span>
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Registered Sellers</h3>
          <span className="text-[9px] bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest ml-1">
            {sellers.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.01]">
                {[
                  { label: 'Seller Name', w: '' },
                  { label: 'API Key',     w: 'w-56' },
                  { label: 'Registered',  w: 'w-32' },
                  { label: 'Status',      w: 'w-24' },
                  { label: 'Actions',     w: 'w-20 text-right' },
                ].map(h => (
                  <th key={h.label} className={`px-6 py-4 text-[9px] text-white/25 uppercase tracking-[0.2em] font-black border-b border-white/5 ${h.w}`}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {sellers.map((seller, i) => (
                <tr
                  key={seller.id}
                  className="seller-row group cursor-default"
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center font-black text-[11px] text-[var(--primary)] uppercase shrink-0">
                        {seller.name.substring(0, 2)}
                      </div>
                      <p className="text-sm font-black text-white/85 group-hover:text-[var(--primary)] transition-colors">
                        {seller.name}
                      </p>
                    </div>
                  </td>

                  {/* API Key */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-mono text-[var(--primary)] bg-[var(--primary)]/8 px-2.5 py-1 rounded-lg border border-[var(--primary)]/15">
                        sk_{'•'.repeat(16)}
                      </code>
                      <button
                        onClick={() => handleCopy(seller.id, seller.api_key)}
                        className={`action-btn opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all ${
                          copiedId === seller.id
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'hover:bg-white/8 text-white/30 hover:text-[var(--primary)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {copiedId === seller.id ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </td>

                  {/* Registered */}
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-bold text-white/60 tabular-nums">
                      {new Date(seller.created_at).toLocaleDateString()}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Active</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <button
                        onClick={() => handleCopy(seller.id, seller.api_key)}
                        className="action-btn w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-[var(--primary)]/15 text-white/30 hover:text-[var(--primary)]"
                        title="Copy API Key"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {sellers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/8">
                        <span className="material-symbols-outlined text-[24px] text-white/20">storefront</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-white/40 mb-1">No sellers yet</p>
                        <p className="text-xs text-white/20 max-w-xs mx-auto leading-relaxed">
                          Add your first seller to start distributing license keys through third-party channels.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create Modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <ModalOverlay onClose={() => setShowCreateModal(false)}>
            <ModalHeader title="Add New Seller" onClose={() => setShowCreateModal(false)} />
            <form onSubmit={handleCreateSeller} className="p-7 space-y-5">
              <div>
                <FieldLabel>Seller Name</FieldLabel>
                <GlassInput
                  placeholder="e.g. Shoppy Reseller"
                  value={newSellerName}
                  onChange={e => setNewSellerName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="px-3 py-3 bg-white/[0.03] border border-white/8 rounded-xl">
                <p className="text-[9px] text-white/30 uppercase tracking-widest font-black mb-1">Note</p>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  A unique API key will be auto-generated for this seller. They can use it to distribute license keys via the public endpoint.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5 font-black text-[11px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[var(--primary)]/25 hover:shadow-[var(--primary)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isCreating
                    ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</>
                    : 'Add Seller'
                  }
                </button>
              </div>
            </form>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </>
  );
}
