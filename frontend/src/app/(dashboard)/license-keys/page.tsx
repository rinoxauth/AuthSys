'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useApps,
  useInvalidateDeveloperData,
  useLicenseKeys,
  useGenerateKeys,
  useCreateLicenseKey,
  useDeleteLicenseKey,
} from '@/hooks/use-developer-queries';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useCopy } from '@/components/ui/copy-dialog';
import {
  ModalOverlay,
  ModalHeader,
  GlassInput,
  GlassSelect,
  GlassTextarea,
  FieldLabel,
  GlassDropzone,
} from '@/components/ui/glass';

const ACCENT = 'var(--primary)';

const statConfig = [
  { label: 'Total Keys',  icon: 'database',      color: 'var(--primary)', bg: 'rgba(var(--primary),0.1)', key: 'total'    },
  { label: 'Active',      icon: 'check_circle',   color: 'var(--success)',             bg: 'rgba(var(--success),0.1)',               key: 'active'   },
  { label: 'Paused',      icon: 'pause_circle',   color: 'var(--warning)',             bg: 'rgba(var(--warning),0.1)',              key: 'paused'   },
  { label: 'Redeemed',    icon: 'bolt',           color: 'var(--ring)',bg: 'rgba(var(--ring),0.1)',key: 'redeemed' },
];



export default function LicenseKeysPage() {
  const { selectedAppId } = useAuthStore();
  const { data: apps = [] } = useApps();
  const selectedApp = apps.find((a: any) => a.id === selectedAppId);
  const hwidEnabled = selectedApp?.hwid_enabled ?? true;
  const invalidate = useInvalidateDeveloperData();
  const confirm = useConfirm();
  const copy = useCopy();
  const generateKeys = useGenerateKeys();
  const createKey = useCreateLicenseKey();
  const deleteKeyMutation = useDeleteLicenseKey();
  const { data: keys = [], isLoading: loading, isError, error, refetch } = useLicenseKeys(selectedAppId);

  const [genData, setGenData] = useState({ quantity: 10, type: 'time', duration: 30, expires_at: '', use_custom_expiry: false });
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [singleData, setSingleData] = useState({ type: 'time', duration: 30, max_uses: 1, expires_at: '', note: '', custom_key: '', use_custom_expiry: false });
  const [editData, setEditData] = useState({ type: 'time', duration: 30, max_uses: 0, expires_at: '', note: '', seller_tag: '' });
  const [generating, setGenerating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [pausingId, setPausingId] = useState<number | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set());
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvImporting, setCSVImporting] = useState(false);

  const filteredKeys = useMemo(() => {
    return (keys || []).filter(k => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        k?.key_value?.toLowerCase().includes(term) ||
        k?.note?.toLowerCase().includes(term) ||
        k?.seller_tag?.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !k.is_paused) ||
        (statusFilter === 'paused' && k.is_paused);
      return matchesSearch && matchesStatus;
    });
  }, [keys, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: (keys || []).length,
    active: (keys || []).filter(k => !k.is_paused).length,
    paused: (keys || []).filter(k => k.is_paused).length,
    redeemed: (keys || []).filter(k => k.current_uses > 0).length,
  }), [keys]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (selectedAppId) refetch(); }, [selectedAppId, refetch]);
  useEffect(() => {
    if (isError) {
      const msg = (error as any)?.response?.data?.detail || 'Failed to load license keys';
      toast.error(typeof msg === 'string' ? msg : 'Failed to load license keys');
    }
  }, [isError, error]);

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedAppId) return;
    setGenerating(true);
    try {
      const isLifetime = genData.type === 'lifetime';
      const useCustom = !isLifetime && genData.use_custom_expiry;
      const res = await generateKeys.mutateAsync({
        app_id: selectedAppId,
        count: genData.quantity,
        key_type: genData.type,
        duration_days: isLifetime ? null : (useCustom ? null : genData.duration),
        expires_at: useCustom ? (genData.expires_at || null) : null,
      });
      setBulkResult(res);
      toast.success(`Generated ${genData.quantity} keys`);
    } catch {
      toast.error('Failed to generate keys');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyBulkKeys = () => {
    if (!bulkResult?.keys) return;
    navigator.clipboard.writeText(bulkResult.keys.join('\n'));
    toast.success('All keys copied!');
  };

  const handleSingleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;
    setGenerating(true);
    try {
      const isLifetime = singleData.type === 'lifetime';
      const useCustom = singleData.use_custom_expiry && !isLifetime;
      await createKey.mutateAsync({
        app_id: selectedAppId,
        key_type: singleData.type,
        duration_days: isLifetime ? null : (useCustom ? null : singleData.duration || 30),
        max_uses: singleData.max_uses,
        expires_at: useCustom ? singleData.expires_at || null : null,
        note: singleData.note,
        custom_key: singleData.custom_key || null,
      });
      setShowCreateModal(false);
      setSingleData({ type: 'time', duration: 30, max_uses: 1, expires_at: '', note: '', custom_key: '', use_custom_expiry: false });
      toast.success('License key created');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create key');
    } finally {
      setGenerating(false);
    }
  };

  const handleTogglePause = async (id: number) => {
    try {
      setPausingId(id);
      await api.post(`/developer/keys/${id}/pause`);
      if (selectedAppId) await invalidate.keys(selectedAppId);
      await invalidate.overview();
    } catch {
      toast.error('Failed to toggle status');
    } finally {
      setPausingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!selectedAppId) return;
    const ok = await confirm({
      title: 'Delete license key?',
      message: 'This key will stop working immediately. This cannot be undone.',
      confirmLabel: 'Yes, delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteKeyMutation.mutateAsync({ id, appId: selectedAppId });
      toast.success('Key deleted');
    } catch {
      toast.error('Failed to delete key');
    }
  };

  const handleHWIDReset = async (id: number) => {
    const ok = await confirm({
      title: 'Reset HWID?',
      message: 'Reset HWID for all users bound to this license key?',
      confirmLabel: 'Yes, reset',
      variant: 'default',
    });
    if (!ok) return;
    try {
      await api.post(`/developer/keys/${id}/hwid-reset`);
      toast.success('HWID reset successful');
      if (selectedAppId) invalidate.keys(selectedAppId);
    } catch {
      toast.error('Failed to reset HWID');
    }
  };

  const handleEditKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    try {
      await api.put(`/developer/keys/${showEditModal.id}`, {
        key_type: editData.type,
        duration_days: editData.duration || null,
        max_uses: editData.max_uses || null,
        expires_at: editData.expires_at || null,
        note: editData.note,
        seller_tag: editData.seller_tag,
      });
      setShowEditModal(null);
      if (selectedAppId) invalidate.keys(selectedAppId);
      toast.success('Key updated');
    } catch {
      toast.error('Failed to update key');
    }
  };

  const handleCopyKey = (id: number, value: string) => {
    copy(value, { label: 'License key copied', description: 'Paste into your app or share with customer.' });
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCSVImport = async (files: File[]) => {
    if (!selectedAppId || !files.length) return;
    setCSVImporting(true);
    try {
      const text = await files[0].text();
      const keys = text.split('\n').filter(Boolean).map(line => line.trim());
      const res = await api.post('/developer/keys/bulk-generate', {
        app_id: selectedAppId,
        count: keys.length,
        key_type: 'time',
        duration_days: 30,
        custom_keys: keys,
      });
      toast.success(`Imported ${keys.length} keys from CSV`);
      if (selectedAppId) await invalidate.keys(selectedAppId);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to import CSV');
    } finally {
      setCSVImporting(false);
      setShowCSVModal(false);
    }
  };

  const toggleSelectKey = (id: number) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllKeys = () => {
    if (selectedKeys.size === filteredKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredKeys.map((k: any) => k.id)));
    }
  };

  const handleBatchPause = async () => {
    if (selectedKeys.size === 0) return;
    let count = 0;
    for (const id of selectedKeys) {
      try {
        await api.post(`/developer/keys/${id}/pause`);
        count++;
      } catch { /* skip */ }
    }
    toast.success(count === selectedKeys.size ? `${count} keys paused/resumed` : `${count}/${selectedKeys.size} toggled`);
    setSelectedKeys(new Set());
    if (selectedAppId) await invalidate.keys(selectedAppId);
  };

  const handleBatchDeleteKeys = async () => {
    if (selectedKeys.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedKeys.size} keys?`,
      message: 'These keys will stop working immediately.',
      confirmLabel: 'Yes, delete all',
      variant: 'danger',
    });
    if (!ok) return;
    let count = 0;
    for (const id of selectedKeys) {
      try {
        await deleteKeyMutation.mutateAsync({ id, appId: selectedAppId! });
        count++;
      } catch { /* skip */ }
    }
    toast.success(`Deleted ${count} keys`);
    setSelectedKeys(new Set());
  };

  const handleBatchExtend = async () => {
    if (selectedKeys.size === 0) return;
    const days = prompt('Extend by how many days?', '30');
    if (!days || isNaN(parseInt(days))) return;
    let count = 0;
    for (const id of selectedKeys) {
      try {
        const key = keys.find((k: any) => k.id === id);
        if (!key) continue;
        const currentExpiry = key.expires_at ? new Date(key.expires_at) : new Date();
        currentExpiry.setDate(currentExpiry.getDate() + parseInt(days));
        await api.put(`/developer/keys/${id}`, { expires_at: currentExpiry.toISOString() });
        count++;
      } catch { /* skip */ }
    }
    toast.success(`Extended ${count} keys by ${days} days`);
    setSelectedKeys(new Set());
    if (selectedAppId) await invalidate.keys(selectedAppId);
  };

  const handleExportCSV = useCallback(() => {
    const rows = [['License Key', 'Type', 'Status', 'Uses', 'Max Uses', 'Created', 'Expires', 'Note', 'Seller Tag']];
    filteredKeys.forEach((k: any) => {
      rows.push([
        k.key_value,
        k.key_type,
        k.is_paused ? 'Paused' : 'Active',
        String(k.current_uses || 0),
        String(k.max_uses || '∞'),
        k.created_at ? new Date(k.created_at).toISOString() : '',
        k.expires_at ? new Date(k.expires_at).toISOString() : (k.duration_days ? new Date(new Date(k.created_at).getTime() + k.duration_days * 86400000).toISOString() : 'Lifetime'),
        k.note || '',
        k.seller_tag || '',
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-keys-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredKeys.length} keys`);
  }, [filteredKeys]);

  if (!mounted) return null;

  if (!selectedAppId) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-[var(--accent-opacity-8)] border border-[var(--border)] flex items-center justify-center">
        <span className="material-symbols-outlined text-[28px] text-[var(--muted-foreground)]">apps</span>
      </div>
      <div className="text-center">
        <p className="text-[var(--foreground)]/50 font-bold text-sm">No application selected</p>
        <p className="text-[var(--muted-foreground)] text-xs mt-1">Choose an app from the top menu</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-end">
        <div className="space-y-3">
          <div className="h-10 w-72 bg-[var(--accent-opacity-8)] rounded-xl" />
          <div className="h-4 w-52 bg-[var(--accent-opacity-8)] rounded-xl" />
        </div>
        <div className="h-12 w-44 bg-[var(--accent-opacity-8)] rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-[var(--accent-opacity-8)] border border-[var(--border)] rounded-2xl" />)}
      </div>
      <div className="h-72 bg-[var(--accent-opacity-8)] border border-[var(--border)] rounded-2xl" />
    </div>
  );

  return (
    <div className="page-wrapper pt-6 overflow-visible">
      <style>{`
        @keyframes shimmerLK {
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
        .shimmer-lk {
          background:linear-gradient(90deg,#fff 0%,var(--primary) 40%,#fff 60%);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          animation:shimmerLK 5s linear infinite;
        }
        .key-row   { animation:rowIn 0.3s ease-out both; }
        .key-row:hover td { background:rgba(255,255,255,0.02); }
        .action-btn { transition:all 0.15s ease; }
        .action-btn:hover { transform:scale(1.12); }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-5">
        <div>
          <nav className="breadcrumb mb-2">
            <span>Enterprise</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="breadcrumb-active">License Keys</span>
          </nav>
          <h1 className="page-title leading-none">License Keys</h1>
          <p className="text-white/35 mt-2 text-sm font-medium">
            App ID: <span className="font-mono text-[var(--primary)]/70 text-xs">{selectedAppId}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCSVModal(true)}
            className="h-11 px-4 rounded-2xl border border-white/8 text-white/50 hover:text-white hover:bg-white/5 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            Import
          </button>
          <button
            onClick={handleExportCSV}
            className="h-11 px-4 rounded-2xl border border-white/8 text-white/50 hover:text-white hover:bg-white/5 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create License Key
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statConfig.map((s, i) => (
          <div
            key={s.key}
            className="premium-card p-5 flex flex-col gap-4 group cursor-default"
            style={{ animation: `statPop 0.4s ease-out both ${i * 60}ms` }}
          >
            <div className="stat-icon-circle group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
            </div>
            <div>
              <p className="stat-label mb-1">{s.label}</p>
              <p className="text-3xl font-black text-white tabular-nums" style={{ color: s.color }}>
                {stats[s.key as keyof typeof stats]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="premium-card overflow-hidden">

        {/* Table Header Controls */}
        <div className="px-7 py-5 border-b border-[var(--border)] bg-[var(--accent-opacity-8)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-[var(--primary)]/60">key</span>
            <h3 className="section-title">License Keys</h3>
            {filteredKeys.length !== keys.length && (
              <span className="text-[9px] bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                {filteredKeys.length} of {keys.length}
              </span>
            )}
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-[var(--muted-foreground)]">search</span>
              <input
                type="text"
                placeholder="Search keys..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-52 pl-9 pr-4 py-2.5 bg-[var(--accent-opacity-8)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)]/75 focus:outline-none focus:border-[var(--primary)]/45 transition-all placeholder:text-[var(--muted-foreground)]"
              />
            </div>
            {/* Filter pills */}
            <div className="flex gap-1">
              {['all', 'active', 'paused'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`filter-tab ${statusFilter === f ? 'filter-tab-active' : ''}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Batch Action Bar */}
        {selectedKeys.size > 0 && (
          <div className="px-7 py-3 bg-[var(--primary)]/5 border-b border-[var(--primary)]/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-widest">
                {selectedKeys.size} selected
              </span>
              <button
                onClick={() => setSelectedKeys(new Set())}
                className="text-[9px] font-black text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBatchExtend}
                className="px-3.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                Extend
              </button>
              <button
                onClick={handleBatchPause}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">pause</span>
                Pause
              </button>
              <button
                onClick={handleBatchDeleteKeys}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--accent-opacity-8)]">
                <th className="px-4 py-4 w-12 border-b border-[var(--border)]">
                  <button onClick={toggleSelectAllKeys} className="w-5 h-5 rounded-md border border-white/20 flex items-center justify-center hover:border-white/40 transition-all">
                    {selectedKeys.size === filteredKeys.length && filteredKeys.length > 0 ? (
                      <span className="material-symbols-outlined text-[12px] text-[var(--primary)]">check</span>
                    ) : selectedKeys.size > 0 ? (
                      <span className="material-symbols-outlined text-[12px] text-[var(--primary)]">remove</span>
                    ) : null}
                  </button>
                </th>
                {[
                  { label: 'License Key', w: '' },
                  { label: 'Type', w: 'w-24' },
                  { label: 'Status', w: 'w-24' },
                  { label: 'Uses', w: 'w-24' },
                  { label: 'Dates', w: 'w-36' },
                  { label: 'Actions', w: 'w-36 text-right' },
                ].map(h => (
                  <th key={h.label} className={`px-6 py-4 stat-label border-b border-[var(--border)] ${h.w}`}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredKeys.map((k, i) => (
                <tr
                  key={k.id}
                  className="key-row group cursor-default"
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleSelectKey(k.id)}
                      className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                        selectedKeys.has(k.id) ? 'border-[var(--primary)] bg-[var(--primary)]/15' : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      {selectedKeys.has(k.id) && (
                        <span className="material-symbols-outlined text-[12px] text-[var(--primary)]">check</span>
                      )}
                    </button>
                  </td>
                  {/* Key value */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2.5">
                        <code className="text-xs font-mono text-[var(--primary)] bg-[var(--primary)]/8 px-2.5 py-1 rounded-lg border border-[var(--primary)]/15 max-w-[140px] sm:max-w-[200px] truncate block">
                          {k.key_value}
                        </code>
                        <button
                          onClick={() => handleCopyKey(k.id, k.key_value)}
                          className={`action-btn opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg ${
                            copiedId === k.id
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'hover:bg-white/8 text-white/30 hover:text-[var(--primary)]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {copiedId === k.id ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                      {(k.note || k.seller_tag) && (
                        <div className="flex items-center gap-2 ml-0.5">
                          {k.seller_tag && (
                            <span className="text-[9px] text-[var(--ring)] uppercase tracking-widest font-black bg-[var(--ring)]/10 px-2 py-0.5 rounded-full">
                              {k.seller_tag}
                            </span>
                          )}
                          {k.note && <span className="text-[10px] text-white/25 truncate max-w-[100px] sm:max-w-[160px]">{k.note}</span>}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-[var(--foreground)]/50 uppercase tracking-widest bg-[var(--accent-opacity-8)] px-2.5 py-1 rounded-lg">
                      {k.key_type}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${!k.is_paused ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${!k.is_paused ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                        {!k.is_paused ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </td>

                  {/* Uses */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[var(--foreground)]/70 tabular-nums">
                        {k.current_uses} <span className="text-[var(--muted-foreground)]">/ {k.max_uses || '∞'}</span>
                      </p>
                      {k.max_uses > 0 && (
                        <div className="w-16 h-1 bg-[var(--accent-opacity-8)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((k.current_uses / k.max_uses) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Dates */}
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-bold text-[var(--foreground)]/60 tabular-nums">
                      {new Date(k.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-widest mt-0.5">
                      exp: {k.expires_at ? new Date(k.expires_at).toLocaleDateString() : (k.duration_days ? new Date(new Date(k.created_at).getTime() + k.duration_days * 86400000).toLocaleDateString() : 'Lifetime')}
                    </p>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      {/* Edit */}
                      <button
                        onClick={() => {
                          setShowEditModal(k);
                          setEditData({
                            type: k.key_type,
                            duration: k.duration_days || 0,
                            max_uses: k.max_uses || 0,
                            expires_at: k.expires_at ? new Date(k.expires_at).toISOString().slice(0, 16) : '',
                            note: k.note || '',
                            seller_tag: k.seller_tag || '',
                          });
                        }}
                        className="action-btn w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--accent-opacity-8)] hover:bg-[var(--primary)]/15 text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                        title="Edit Key"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>

                      {/* Pause/Resume */}
                      <button
                        onClick={() => handleTogglePause(k.id)}
                        disabled={pausingId === k.id}
                        className="action-btn w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--accent-opacity-8)] hover:bg-[var(--warning)]/15 text-[var(--muted-foreground)] hover:text-[var(--warning)] disabled:opacity-40"
                        title={k.is_paused ? 'Resume' : 'Pause'}
                      >
                        {pausingId === k.id
                          ? <div className="w-3.5 h-3.5 border-2 border-[var(--warning)]/30 border-t-[var(--warning)] rounded-full animate-spin" />
                          : <span className="material-symbols-outlined text-[16px]">{k.is_paused ? 'play_arrow' : 'pause'}</span>
                        }
                      </button>

                      {/* HWID Reset */}
                      <button
                        onClick={() => handleHWIDReset(k.id)}
                        className="action-btn w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--accent-opacity-8)] hover:bg-[var(--primary)]/15 text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                        title="Reset HWID"
                      >
                        <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(k.id)}
                        className="action-btn w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--accent-opacity-8)] hover:bg-[var(--destructive)]/15 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                        title="Delete Key"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredKeys.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-14 h-14 bg-[var(--accent-opacity-8)] rounded-2xl flex items-center justify-center border border-[var(--border)]">
                        <span className="material-symbols-outlined text-[24px] text-[var(--muted-foreground)]">key_off</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-[var(--foreground)]/40 mb-1">No keys found</p>
                        <p className="text-xs text-[var(--muted-foreground)] max-w-xs mx-auto leading-relaxed">
                          {searchTerm || statusFilter !== 'all'
                            ? 'No keys match your current filters. Try adjusting your search.'
                            : 'No license keys generated for this app yet. Create your first key above.'}
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
          <ModalOverlay onClose={() => { setShowCreateModal(false); setBulkMode(false); setBulkResult(null); }}>
            <ModalHeader
              title={bulkMode ? 'Bulk Create Keys' : 'Create License Key'}
              onClose={() => { setShowCreateModal(false); setBulkMode(false); setBulkResult(null); }}
            />

            <form onSubmit={bulkMode ? handleGenerate : handleSingleGenerate} className="flex-1 flex flex-col gap-5 p-7 min-h-0">
              {/* Mode toggle */}
              <div className="shrink-0 flex gap-1.5 p-1.5 bg-white/5 rounded-xl border border-white/8">
                {[{ label: 'Single Key', val: false }, { label: 'Bulk Create', val: true }].map(m => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => { setBulkMode(m.val); setBulkResult(null); }}
                    className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all duration-200 ${
                      bulkMode === m.val
                        ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/25'
                        : 'text-white/35 hover:text-white/60'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {!bulkMode ? (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1 py-1">
                  <div>
                    <FieldLabel>Custom Key (Optional)</FieldLabel>
                    <GlassInput
                      placeholder="e.g. SPECIAL-KEY-2024"
                      value={singleData.custom_key}
                      onChange={e => setSingleData({ ...singleData, custom_key: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {hwidEnabled && (
                      <div>
                        <FieldLabel>Max Uses (0=∞)</FieldLabel>
                        <GlassInput
                          type="number"
                          value={singleData.max_uses}
                          onChange={e => setSingleData({ ...singleData, max_uses: parseInt(e.target.value) })}
                        />
                      </div>
                    )}
                    <div>
                      <FieldLabel>Key Type</FieldLabel>
                      <GlassSelect value={singleData.type} onChange={e => setSingleData({ ...singleData, type: e.target.value })}>
                        <option value="time">Time Based</option>
                        <option value="lifetime">Lifetime</option>
                      </GlassSelect>
                    </div>
                  </div>
                  {singleData.type === 'time' && (
                    <div className="space-y-3">
                      {!singleData.use_custom_expiry && (
                        <>
                          <div>
                            <FieldLabel>Duration (Days)</FieldLabel>
                            <GlassInput
                              type="number"
                              value={singleData.duration}
                              onChange={e => setSingleData({ ...singleData, duration: parseInt(e.target.value) })}
                            />
                          </div>
                          <div className="flex gap-2">
                            {[{ label: '7 Days', val: 7 }, { label: '30 Days', val: 30 }, { label: '90 Days', val: 90 }].map(d => (
                              <button
                                key={d.val}
                                type="button"
                                onClick={() => setSingleData({ ...singleData, duration: d.val })}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all duration-200 ${
                                  singleData.duration === d.val
                                    ? 'bg-[var(--primary)]/20 border-[var(--primary)]/40 text-[var(--primary)]'
                                    : 'bg-white/5 border-white/8 text-white/35 hover:border-[var(--primary)]/25 hover:text-white/60'
                                }`}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={singleData.use_custom_expiry}
                          onClick={() => setSingleData({ ...singleData, use_custom_expiry: !singleData.use_custom_expiry })}
                          className={`toggle-switch ${singleData.use_custom_expiry ? 'active' : 'inactive'}`}
                        >
                          <span className={`toggle-knob ${singleData.use_custom_expiry ? 'active' : 'inactive'}`} />
                        </button>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Custom Expiry</span>
                      </label>
                      {singleData.use_custom_expiry && (
                        <GlassInput
                          type="datetime-local"
                          value={singleData.expires_at}
                          onChange={e => setSingleData({ ...singleData, expires_at: e.target.value })}
                        />
                      )}
                    </div>
                  )}
                  {singleData.type === 'lifetime' && (
                    <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-xs text-white/40 text-center font-medium">
                        Lifetime keys never expire
                      </p>
                    </div>
                  )}
                  <div>
                    <FieldLabel>Note</FieldLabel>
                    <GlassTextarea
                      rows={3}
                      placeholder="Reason for this key..."
                      value={singleData.note}
                      onChange={e => setSingleData({ ...singleData, note: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center space-y-5 pr-1">
                  <div>
                    <FieldLabel>Quantity</FieldLabel>
                    <GlassInput
                      type="number"
                      value={genData.quantity}
                      onChange={e => setGenData({ ...genData, quantity: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Key Type</FieldLabel>
                    <GlassSelect value={genData.type} onChange={e => setGenData({ ...genData, type: e.target.value })}>
                      <option value="time">Time Based</option>
                      <option value="lifetime">Lifetime</option>
                    </GlassSelect>
                  </div>
                  {genData.type === 'time' && (
                    <div className="space-y-3">
                      {!genData.use_custom_expiry && (
                        <>
                          <div>
                            <FieldLabel>Duration (Days)</FieldLabel>
                            <div className="flex gap-2">
                              {[{ label: '7 Days', val: 7 }, { label: '30 Days', val: 30 }, { label: '90 Days', val: 90 }].map(d => (
                                <button
                                  key={d.val}
                                  type="button"
                                  onClick={() => setGenData({ ...genData, duration: d.val })}
                                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all duration-200 ${
                                    genData.duration === d.val
                                      ? 'bg-[var(--primary)]/20 border-[var(--primary)]/40 text-[var(--primary)]'
                                      : 'bg-white/5 border-white/8 text-white/35 hover:border-[var(--primary)]/25 hover:text-white/60'
                                  }`}
                                >
                                  {d.label}
                                </button>
                              ))}
                            </div>
                            <div className="mt-3">
                              <GlassInput
                                type="number"
                                value={genData.duration}
                                onChange={e => setGenData({ ...genData, duration: parseInt(e.target.value) })}
                                className="text-xs"
                              />
                            </div>
                          </div>
                        </>
                      )}
                      <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={genData.use_custom_expiry}
                          onClick={() => setGenData({ ...genData, use_custom_expiry: !genData.use_custom_expiry })}
                          className={`toggle-switch ${genData.use_custom_expiry ? 'active' : 'inactive'}`}
                        >
                          <span className={`toggle-knob ${genData.use_custom_expiry ? 'active' : 'inactive'}`} />
                        </button>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Custom Expiry</span>
                      </label>
                      {genData.use_custom_expiry && (
                        <div>
                          <FieldLabel>Expiration</FieldLabel>
                          <GlassInput
                            type="datetime-local"
                            value={genData.expires_at}
                            onChange={e => setGenData({ ...genData, expires_at: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {genData.type === 'lifetime' && (
                    <div className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-xs text-white/40 text-center font-medium">
                        Lifetime keys never expire
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Bulk Result */}
              {bulkResult && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">✓ {bulkResult.keys?.length} Keys Generated</p>
                    <button
                      type="button"
                      onClick={handleCopyBulkKeys}
                      className="flex items-center gap-1.5 text-[10px] font-black text-[var(--primary)] hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      Copy All
                    </button>
                  </div>
                  <div className="bg-black/40 rounded-xl p-4 max-h-40 overflow-y-auto border border-white/5">
                    <pre className="text-[10px] text-white/50 font-mono whitespace-pre-wrap leading-relaxed">
                      {bulkResult.keys?.join('\n')}
                    </pre>
                  </div>
                </div>
              )}

              <div className="shrink-0 mt-auto flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setBulkMode(false); setBulkResult(null); if (selectedAppId && bulkResult) invalidate.keys(selectedAppId); }}
                  className="flex-1 py-3 rounded-xl border border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5 font-black text-[11px] uppercase tracking-widest transition-all"
                >
                  {bulkResult ? 'Done' : 'Cancel'}
                </button>
                {!bulkResult && (
                  <button
                    type="submit"
                    disabled={generating}
                    className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[var(--primary)]/25 hover:shadow-[var(--primary)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {generating
                      ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{bulkMode ? 'Generating...' : 'Creating...'}</>
                      : bulkMode ? `Create ${genData.quantity} Keys` : 'Create Key'
                    }
                  </button>
                )}
              </div>
            </form>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {showEditModal && (
          <ModalOverlay onClose={() => setShowEditModal(null)}>
            <ModalHeader title="Edit License Key" onClose={() => setShowEditModal(null)} />
            <form onSubmit={handleEditKey} className="p-7 space-y-4">
              <div className="px-3 py-2 bg-[var(--primary)]/8 border border-[var(--primary)]/20 rounded-xl">
                <p className="text-[9px] text-[var(--primary)]/60 uppercase tracking-widest font-black mb-0.5">Editing Key</p>
                <code className="text-xs text-[var(--primary)] font-mono">{showEditModal.key_value}</code>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Key Type</FieldLabel>
                  <GlassSelect value={editData.type} onChange={e => setEditData({ ...editData, type: e.target.value })}>
                    <option value="time">Time Based</option>
                    <option value="lifetime">Lifetime</option>
                  </GlassSelect>
                </div>
                <div>
                  <FieldLabel>Duration (Days)</FieldLabel>
                  <GlassInput
                    type="number"
                    value={editData.duration}
                    onChange={e => setEditData({ ...editData, duration: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {hwidEnabled && (
                  <div>
                    <FieldLabel>Max Uses (0=∞)</FieldLabel>
                    <GlassInput
                      type="number"
                      value={editData.max_uses}
                      onChange={e => setEditData({ ...editData, max_uses: parseInt(e.target.value) })}
                    />
                  </div>
                )}
                <div>
                  <FieldLabel>Expiration</FieldLabel>
                  <GlassInput
                    type="datetime-local"
                    value={editData.expires_at}
                    onChange={e => setEditData({ ...editData, expires_at: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Seller Tag</FieldLabel>
                <GlassInput
                  placeholder="e.g. reseller_xyz"
                  value={editData.seller_tag}
                  onChange={e => setEditData({ ...editData, seller_tag: e.target.value })}
                />
              </div>

              <div>
                <FieldLabel>Note</FieldLabel>
                <GlassTextarea
                  rows={3}
                  placeholder="Any notes about this key..."
                  value={editData.note}
                  onChange={e => setEditData({ ...editData, note: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="flex-1 py-3 rounded-xl border border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5 font-black text-[11px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[var(--primary)]/25 hover:shadow-[var(--primary)]/40 transition-all duration-200"
                >
                  Update Key
                </button>
              </div>
            </form>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── CSV Import Modal ── */}
      <AnimatePresence>
        {showCSVModal && (
          <ModalOverlay onClose={() => setShowCSVModal(false)}>
            <ModalHeader title="Import Keys from CSV" onClose={() => setShowCSVModal(false)} />
            <div className="p-7 space-y-5">
              <div className="px-4 py-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/15">
                <p className="text-[10px] text-[var(--primary)]/70 font-black uppercase tracking-widest mb-1">Format</p>
                <code className="text-[10px] text-white/40 font-mono">One key per line</code>
                <p className="text-[9px] text-white/20 mt-1">Each line is imported as a 30-day time-based key.</p>
              </div>
              <GlassDropzone onFiles={handleCSVImport} />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCSVModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5 font-black text-[11px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                {csvImporting && (
                  <div className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importing...
                  </div>
                )}
              </div>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

    </div>
  );
}
