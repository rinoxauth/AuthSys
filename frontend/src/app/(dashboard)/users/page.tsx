'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useApps,
  useAppUsers,
  useInvalidateDeveloperData,
  useCreateAppUser,
  useDeleteAppUser,
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
  PasswordStrengthMeter,
  GlassDropzone,
} from '@/components/ui/glass';

const statConfig = [
  { label: 'Total Users',     icon: 'groups',        color: 'var(--primary)',   bg: 'rgba(var(--primary),0.1)',   key: 'total'   },
  { label: 'Banned',          icon: 'block',          color: 'var(--destructive)',                bg: 'rgba(var(--destructive),0.1)',                key: 'banned'  },
  { label: 'Active Sessions', icon: 'bolt',           color: 'var(--success)',               bg: 'rgba(var(--success),0.1)',                 key: 'active'  },
  { label: 'HWID Locked',     icon: 'devices',        color: 'var(--ring)', bg: 'rgba(var(--ring),0.1)', key: 'hwid'    },
];



export default function UsersPage() {
  const { selectedAppId } = useAuthStore();
  const { data: apps = [] } = useApps();
  const selectedApp = apps.find((a: any) => a.id === selectedAppId);
  const hwidEnabled = selectedApp?.hwid_enabled ?? true;
  const invalidate = useInvalidateDeveloperData();
  const confirm = useConfirm();
  const copy = useCopy();
  const createUser = useCreateAppUser();
  const deleteUser = useDeleteAppUser();
  const { data: users = [], isLoading: loading, isError, error, refetch } = useAppUsers(selectedAppId);

  const [showBanModal, setShowBanModal] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [banData, setBanData] = useState({ reason: 'Violation of terms', days: 0 });
  const [newUser, setNewUser] = useState({ username: '', password: '', email: '', expires_at: '', use_custom_expiry: false, duration: 30, type: 'time', max_uses: 1 });
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkPasswordPrefix, setBulkPasswordPrefix] = useState('');
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [editData, setEditData] = useState({ username: '', email: '', password: '' });
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [csvImporting, setCSVImporting] = useState(false);
  const [csvResult, setCSVResult] = useState<any>(null);

  const filteredUsers = useMemo(() => {
    return (users || []).filter(u => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        u?.username?.toLowerCase().includes(term) ||
        u?.email?.toLowerCase().includes(term) ||
        u?.ip_address?.toLowerCase().includes(term) ||
        u?.last_ip?.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !u.is_banned) ||
        (statusFilter === 'banned' && u.is_banned) ||
        (statusFilter === 'hwid' && u.hwid);
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total:  (users || []).length,
    banned: (users || []).filter(u => u.is_banned).length,
    active: (users || []).filter(u => u.last_login_at).length,
    hwid:   (users || []).filter(u => u.hwid).length,
  }), [users]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (selectedAppId) refetch(); }, [selectedAppId, refetch]);
  useEffect(() => {
    if (isError) {
      const msg = (error as any)?.response?.data?.detail || 'Failed to load users';
      toast.error(typeof msg === 'string' ? msg : 'Failed to load users');
    }
  }, [isError, error]);

  const handleBan = async () => {
    if (!showBanModal) return;
    try {
      await api.post(`/developer/users/${showBanModal.id}/ban`, banData);
      setShowBanModal(null);
      if (selectedAppId) await invalidate.users(selectedAppId);
      await invalidate.overview();
      toast.success('User banned');
    } catch {
      toast.error('Failed to ban user');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;
    setSubmitting(true);
    try {
      const isLifetime = newUser.type === 'lifetime';
      const useCustom = !isLifetime && newUser.use_custom_expiry;
      const formattedExpiresAt = useCustom && newUser.expires_at?.trim() ? newUser.expires_at : null;
      const durationDays = isLifetime || useCustom ? null : newUser.duration;
      if (bulkMode) {
        const res = await api.post('/developer/users/bulk-create', {
          app_id: selectedAppId,
          count: bulkCount,
          password_prefix: bulkPasswordPrefix || null,
          expires_at: formattedExpiresAt,
          max_uses: 0,
        });
        setBulkResult(res.data);
        toast.success(`Created ${res.data.count} users successfully!`);
      } else {
        await api.post('/developer/users/create', {
          app_id: selectedAppId,
          username: newUser.username,
          password: newUser.password,
          email: newUser.email || null,
          expires_at: formattedExpiresAt,
          duration_days: durationDays,
          max_uses: hwidEnabled ? newUser.max_uses : 0,
        });
        toast.success('User created');
        setShowAddModal(false);
        setNewUser({ username: '', password: '', email: '', expires_at: '', use_custom_expiry: false, duration: 30, type: 'time', max_uses: 1 });
        setBulkMode(false);
        setBulkCount(10);
        setBulkPasswordPrefix('');
        if (selectedAppId) await invalidate.users(selectedAppId);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create user. Username might be taken.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyBulkCredentials = () => {
    if (!bulkResult?.credentials) return;
    const text = bulkResult.credentials.map((c: any) => `${c.username}:${c.password}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied!');
  };

  const handleUnban = async (id: number) => {
    try {
      await api.post(`/developer/users/${id}/unban`);
      if (selectedAppId) invalidate.users(selectedAppId);
      toast.success('User unbanned');
    } catch {
      toast.error('Failed to unban user');
    }
  };

  const handleHWIDReset = async (id: number) => {
    const ok = await confirm({
      title: 'Reset HWID?',
      message: 'Allow this user to log in from a new device?',
      confirmLabel: 'Yes, reset',
    });
    if (!ok) return;
    try {
      await api.post(`/developer/users/${id}/hwid-reset`);
      toast.success('HWID reset successful');
      if (selectedAppId) invalidate.users(selectedAppId);
    } catch {
      toast.error('Failed to reset HWID');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    try {
      const payload: any = { username: editData.username, email: editData.email };
      if (editData.password) payload.password = editData.password;
      await api.put(`/developer/users/${showEditModal.id}`, payload);
      setShowEditModal(null);
      if (selectedAppId) invalidate.users(selectedAppId);
      toast.success('User updated');
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!selectedAppId) return;
    const ok = await confirm({
      title: 'Delete user?',
      message: 'This user and their sessions will be removed permanently.',
      confirmLabel: 'Yes, delete',
      cancelLabel: 'Keep user',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteUser.mutateAsync({ id, appId: selectedAppId });
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleCopyUsername = (id: number, username: string) => {
    copy(username, { label: 'Username copied', description: 'Username copied to clipboard.' });
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCSVImport = async (files: File[]) => {
    if (!selectedAppId || !files.length) return;
    const file = files[0];
    setCSVImporting(true);
    setCSVResult(null);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const users = lines.map(line => {
        const [username, password, email] = line.split(',').map(s => s.trim());
        return { username, password: password || 'Default123', email: email || '' };
      });
      const res = await api.post('/developer/users/bulk-create', {
        app_id: selectedAppId,
        count: users.length,
        users_list: users,
        password_prefix: '',
      });
      setCSVResult({ count: users.length });
      toast.success(`Imported ${users.length} users from CSV`);
      setCSVResult(res.data || { count: users.length });
      if (selectedAppId) await invalidate.users(selectedAppId);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to import CSV');
    } finally {
      setCSVImporting(false);
    }
  };

  const handleExportCSV = useCallback(() => {
    const rows = [['Username', 'Email', 'Status', 'HWID', 'Last Login', 'IP']];
    filteredUsers.forEach((u: any) => {
      rows.push([
        u.username,
        u.email || '',
        u.is_banned ? 'Banned' : 'Active',
        u.hwid || '',
        u.last_login_at ? new Date(u.last_login_at).toISOString() : '',
        u.last_ip || u.ip_address || '',
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredUsers.length} users`);
  }, [filteredUsers]);

  const toggleSelectUser = (id: number) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u: any) => u.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedAppId || selectedUsers.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedUsers.size} users?`,
      message: 'These users and their sessions will be removed permanently.',
      confirmLabel: 'Yes, delete all',
      variant: 'danger',
    });
    if (!ok) return;
    let count = 0;
    for (const id of selectedUsers) {
      try {
        await deleteUser.mutateAsync({ id, appId: selectedAppId });
        count++;
      } catch { /* skip failed */ }
    }
    toast.success(`Deleted ${count} users`);
    setSelectedUsers(new Set());
  };

  const handleBatchBan = async () => {
    if (!selectedAppId || selectedUsers.size === 0) return;
    const ok = await confirm({
      title: `Ban ${selectedUsers.size} users?`,
      message: 'These users will immediately lose access.',
      confirmLabel: 'Yes, ban all',
      variant: 'danger',
    });
    if (!ok) return;
    let count = 0;
    for (const id of selectedUsers) {
      try {
        await api.post(`/developer/users/${id}/ban`, { reason: 'Batch ban', days: 0 });
        count++;
      } catch { /* skip */ }
    }
    toast.success(`Banned ${count} users`);
    setSelectedUsers(new Set());
    if (selectedAppId) await invalidate.users(selectedAppId);
  };

  const handleBatchHWIDReset = async () => {
    if (!selectedAppId || selectedUsers.size === 0) return;
    const ok = await confirm({
      title: `Reset HWID for ${selectedUsers.size} users?`,
      message: 'These users will be allowed to log in from new devices.',
      confirmLabel: 'Yes, reset',
    });
    if (!ok) return;
    let count = 0;
    for (const id of selectedUsers) {
      try {
        await api.post(`/developer/users/${id}/hwid-reset`);
        count++;
      } catch { /* skip */ }
    }
    toast.success(`HWID reset for ${count} users`);
    setSelectedUsers(new Set());
    if (selectedAppId) await invalidate.users(selectedAppId);
  };

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
        @keyframes shimmerUM {
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
        .shimmer-um {
          background:linear-gradient(90deg,#fff 0%,var(--primary) 40%,#fff 60%);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          animation:shimmerUM 5s linear infinite;
        }
        .user-row  { animation:rowIn 0.3s ease-out both; }
        .user-row:hover td { background:rgba(255,255,255,0.02); }
        .action-btn { transition:all 0.15s ease; }
        .action-btn:hover { transform:scale(1.12); }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-5">
        <div>
          <nav className="breadcrumb mb-2">
            <span>Enterprise</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="breadcrumb-active">Users</span>
          </nav>
          <h1 className="page-title leading-none">Users</h1>
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
            Import CSV
          </button>
          <button
            onClick={handleExportCSV}
            className="h-11 px-4 rounded-2xl border border-white/8 text-white/50 hover:text-white hover:bg-white/5 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add User
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
        <div className="px-7 py-5 border-b border-white/5 bg-white/[0.015] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-[var(--primary)]/60">group</span>
            <h3 className="section-title">User Directory</h3>
            {filteredUsers.length !== users.length && (
              <span className="text-[9px] bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                {filteredUsers.length} of {users.length}
              </span>
            )}
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-white/25">search</span>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-52 pl-9 pr-4 py-2.5 bg-white/5 border border-white/8 rounded-xl text-xs text-white/75 focus:outline-none focus:border-[var(--primary)]/45 transition-all placeholder:text-white/20"
              />
            </div>
            {/* Filter pills */}
            <div className="flex gap-1">
              {['all', 'active', 'banned', 'hwid'].map(f => (
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
        {selectedUsers.size > 0 && (
          <div className="px-7 py-3 bg-[var(--primary)]/5 border-b border-[var(--primary)]/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-black text-[var(--primary)] uppercase tracking-widest">
                {selectedUsers.size} selected
              </span>
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="text-[9px] font-black text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBatchBan}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">block</span>
                Ban
              </button>
              <button
                onClick={handleBatchHWIDReset}
                className="px-3.5 py-2 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)]/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                HWID Reset
              </button>
              <button
                onClick={handleBatchDelete}
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
              <tr className="bg-white/[0.01]">
                <th className="px-4 py-4 w-12 border-b border-white/5">
                  <button onClick={toggleSelectAll} className="w-5 h-5 rounded-md border border-white/20 flex items-center justify-center hover:border-white/40 transition-all">
                    {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? (
                      <span className="material-symbols-outlined text-[12px] text-[var(--primary)]">check</span>
                    ) : selectedUsers.size > 0 ? (
                      <span className="material-symbols-outlined text-[12px] text-[var(--primary)]">remove</span>
                    ) : null}
                  </button>
                </th>
                {[
                  { label: 'User',        w: '' },
                  { label: 'Status',      w: 'w-24' },
                  { label: 'IP Address',  w: 'w-32' },
                  { label: 'Last Login',  w: 'w-36' },
                  { label: 'Actions',     w: 'w-44 text-right' },
                ].map(h => (
                  <th key={h.label} className={`px-6 py-4 stat-label border-b border-white/5 ${h.w}`}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredUsers.map((user, i) => (
                <tr
                  key={user.id}
                  className={`user-row group cursor-default ${user.is_banned ? 'opacity-60' : ''}`}
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleSelectUser(user.id)}
                      className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                        selectedUsers.has(user.id) ? 'border-[var(--primary)] bg-[var(--primary)]/15' : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      {selectedUsers.has(user.id) && (
                        <span className="material-symbols-outlined text-[12px] text-[var(--primary)]">check</span>
                      )}
                    </button>
                  </td>
                  {/* User */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center font-black text-[11px] text-[var(--primary)] uppercase shrink-0">
                        {user.username.substring(0, 2)}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-white/85 group-hover:text-[var(--primary)] transition-colors">
                            {user.username}
                          </p>
                          {user.hwid && (
                            <span
                              className="material-symbols-outlined text-[12px] text-[var(--ring)]"
                              title="HWID Locked"
                            >devices</span>
                          )}
                          <button
                            onClick={() => handleCopyUsername(user.id, user.username)}
                            className={`action-btn opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all ${
                              copiedId === user.id
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'hover:bg-white/8 text-white/30 hover:text-[var(--primary)]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {copiedId === user.id ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                        <p className="text-[10px] text-white/30 font-mono">{user.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${!user.is_banned ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${!user.is_banned ? 'text-emerald-400' : 'text-red-400'}`}>
                        {user.is_banned ? 'Banned' : 'Active'}
                      </span>
                    </div>
                  </td>

                  {/* IP */}
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-mono text-white/50">
                      {user.last_ip || user.ip_address || 'N/A'}
                    </p>
                  </td>

                  {/* Last Login */}
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-bold text-white/60 tabular-nums">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                    </p>
                    {user.last_login_at && (
                      <p className="text-[9px] text-white/25 mt-0.5">
                        {new Date(user.last_login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      {/* Edit */}
                      <button
                        onClick={() => {
                          setShowEditModal(user);
                          setEditData({ username: user.username, email: user.email || '', password: '' });
                        }}
                        className="action-btn w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-blue-400/15 text-white/30 hover:text-blue-400"
                        title="Edit User"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>

                      {/* HWID Reset */}
                      <button
                        onClick={() => handleHWIDReset(user.id)}
                        className="action-btn w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-[var(--primary)]/15 text-white/30 hover:text-[var(--primary)]"
                        title="Reset HWID"
                      >
                        <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                      </button>

                      {/* Ban / Unban */}
                      {user.is_banned ? (
                        <button
                          onClick={() => handleUnban(user.id)}
                          className="action-btn w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-emerald-400/15 text-white/30 hover:text-emerald-400"
                          title="Unban"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowBanModal(user)}
                          className="action-btn w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-amber-400/15 text-white/30 hover:text-amber-400"
                          title="Ban User"
                        >
                          <span className="material-symbols-outlined text-[16px]">block</span>
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="action-btn w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-400/15 text-white/30 hover:text-red-400"
                        title="Delete User"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/8">
                        <span className="material-symbols-outlined text-[24px] text-white/20">group_off</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-white/40 mb-1">No users found</p>
                        <p className="text-xs text-white/20 max-w-xs mx-auto leading-relaxed">
                          {searchTerm || statusFilter !== 'all'
                            ? 'No users match your current filters. Try adjusting your search.'
                            : 'No users have registered or been added to this application yet.'}
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

      {/* ── Add / Bulk Create Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <ModalOverlay onClose={() => { setShowAddModal(false); setBulkMode(false); setBulkResult(null); }}>
            <ModalHeader
              title={bulkMode ? 'Bulk Create Users' : 'Add Manual User'}
              onClose={() => { setShowAddModal(false); setBulkMode(false); setBulkResult(null); }}
            />

            <form onSubmit={handleAddUser} className="flex-1 flex flex-col gap-5 p-7 min-h-0">
              {/* Mode toggle */}
              <div className="shrink-0 flex gap-1.5 p-1.5 bg-white/5 rounded-xl border border-white/8">
                {[{ label: 'Single User', val: false }, { label: 'Bulk Create', val: true }].map(m => (
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
                    <FieldLabel>Username</FieldLabel>
                    <GlassInput
                      placeholder="Enter username"
                      required
                      value={newUser.username}
                      onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel>Initial Password</FieldLabel>
                    <GlassInput
                      type="password"
                      placeholder="Enter password"
                      required
                      value={newUser.password}
                      onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    />
                    <PasswordStrengthMeter password={newUser.password} />
                  </div>
                  <div>
                    <FieldLabel>Email (Optional)</FieldLabel>
                    <GlassInput
                      type="email"
                      placeholder="Enter email"
                      value={newUser.email}
                      onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center space-y-5 pr-1">
                  <div>
                    <FieldLabel>Number of Users</FieldLabel>
                    <GlassInput
                      type="number"
                      min="1"
                      max="1000"
                      required
                      value={bulkCount}
                      onChange={e => setBulkCount(parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <FieldLabel>Password Prefix (Optional)</FieldLabel>
                    <GlassInput
                      placeholder="e.g. MyApp_"
                      value={bulkPasswordPrefix}
                      onChange={e => setBulkPasswordPrefix(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {hwidEnabled && !bulkMode && (
                  <div>
                    <FieldLabel>Max Uses (0=∞)</FieldLabel>
                    <GlassInput
                      type="number"
                      value={newUser.max_uses}
                      onChange={e => setNewUser({ ...newUser, max_uses: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
                <div>
                  <FieldLabel>User Type</FieldLabel>
                  <GlassSelect
                    value={newUser.type}
                    onChange={e => setNewUser({ ...newUser, type: e.target.value, use_custom_expiry: false })}
                  >
                    <option value="time">Time Based</option>
                    <option value="lifetime">Lifetime</option>
                  </GlassSelect>
                </div>
              </div>

              {newUser.type === 'time' && (
                <>
                  {!newUser.use_custom_expiry && (
                    <div className="shrink-0 space-y-3">
                      <div>
                        <FieldLabel>Duration (Days)</FieldLabel>
                        <GlassInput
                          type="number"
                          value={newUser.duration}
                          onChange={e => setNewUser({ ...newUser, duration: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="flex gap-2">
                        {[{ label: '7 Days', val: 7 }, { label: '30 Days', val: 30 }, { label: '90 Days', val: 90 }].map(d => (
                          <button
                            key={d.val}
                            type="button"
                            onClick={() => setNewUser({ ...newUser, duration: d.val })}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all duration-200 ${
                              newUser.duration === d.val
                                ? 'bg-[var(--primary)]/20 border-[var(--primary)]/40 text-[var(--primary)]'
                                : 'bg-white/5 border-white/8 text-white/35 hover:border-[var(--primary)]/25 hover:text-white/60'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="shrink-0 flex items-center gap-2.5 cursor-pointer select-none pt-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={newUser.use_custom_expiry}
                      onClick={() => setNewUser({ ...newUser, use_custom_expiry: !newUser.use_custom_expiry })}
                      className={`toggle-switch ${newUser.use_custom_expiry ? 'active' : 'inactive'}`}
                    >
                      <span className={`toggle-knob ${newUser.use_custom_expiry ? 'active' : 'inactive'}`} />
                    </button>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Custom Expiry</span>
                  </label>
                  {newUser.use_custom_expiry && (
                    <div className="shrink-0">
                      <FieldLabel>Expiry Date</FieldLabel>
                      <GlassInput
                        type="datetime-local"
                        value={newUser.expires_at}
                        onChange={e => setNewUser({ ...newUser, expires_at: e.target.value })}
                      />
                    </div>
                  )}
                </>
              )}

              {newUser.type === 'lifetime' && (
                <div className="shrink-0 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-xs text-white/40 text-center font-medium">
                    Lifetime users never expire
                  </p>
                </div>
              )}

              {/* Bulk Result */}
              {bulkResult && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">✓ {bulkResult.count} Users Created</p>
                    <button
                      type="button"
                      onClick={handleCopyBulkCredentials}
                      className="flex items-center gap-1.5 text-[10px] font-black text-[var(--primary)] hover:text-white transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      Copy All
                    </button>
                  </div>
                  <div className="bg-black/40 rounded-xl p-4 max-h-40 overflow-y-auto border border-white/5">
                    <pre className="text-[10px] text-white/50 font-mono whitespace-pre-wrap leading-relaxed">
                      {bulkResult.credentials?.map((c: any) => `${c.username}:${c.password}`).join('\n')}
                    </pre>
                  </div>
                </div>
              )}

              <div className="shrink-0 mt-auto flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setBulkMode(false);
                    setBulkResult(null);
                    setBulkCount(10);
                    setBulkPasswordPrefix('');
        setNewUser({ username: '', password: '', email: '', expires_at: '', use_custom_expiry: false, duration: 30, type: 'time', max_uses: 1 });
                    if (selectedAppId && bulkResult) invalidate.users(selectedAppId);
                  }}
                  className="flex-1 py-3 rounded-xl border border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5 font-black text-[11px] uppercase tracking-widest transition-all"
                >
                  {bulkResult ? 'Done' : 'Cancel'}
                </button>
                {!bulkResult && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[var(--primary)]/25 hover:shadow-[var(--primary)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {submitting
                      ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{bulkMode ? 'Creating...' : 'Adding...'}</>
                      : bulkMode ? `Create ${bulkCount} Users` : 'Create User'
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
            <ModalHeader title="Edit User" onClose={() => setShowEditModal(null)} />
            <form onSubmit={handleEditUser} className="p-7 space-y-4">
              <div className="px-3 py-2 bg-[var(--primary)]/8 border border-[var(--primary)]/20 rounded-xl">
                <p className="text-[9px] text-[var(--primary)]/60 uppercase tracking-widest font-black mb-0.5">Editing User</p>
                <p className="text-xs text-[var(--primary)] font-black">{showEditModal.username}</p>
              </div>

              <div>
                <FieldLabel>Username</FieldLabel>
                <GlassInput
                  placeholder="Enter username"
                  required
                  value={editData.username}
                  onChange={e => setEditData({ ...editData, username: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>New Password (leave blank to keep)</FieldLabel>
                <GlassInput
                  type="password"
                  placeholder="Enter new password"
                  value={editData.password}
                  onChange={e => setEditData({ ...editData, password: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <GlassInput
                  type="email"
                  placeholder="Enter email"
                  value={editData.email}
                  onChange={e => setEditData({ ...editData, email: e.target.value })}
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
                  Save Changes
                </button>
              </div>
            </form>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── Ban Modal ── */}
      <AnimatePresence>
        {showBanModal && (
          <ModalOverlay onClose={() => setShowBanModal(null)}>
            <ModalHeader title={`Ban: ${showBanModal.username}`} onClose={() => setShowBanModal(null)} danger />
            <div className="p-7 space-y-4">
              <div className="px-3 py-2 bg-red-500/8 border border-red-500/20 rounded-xl">
                <p className="text-[9px] text-red-400/60 uppercase tracking-widest font-black mb-0.5">Warning</p>
                <p className="text-xs text-red-400/80">This user will immediately lose access to the application.</p>
              </div>

              <div>
                <FieldLabel>Ban Reason</FieldLabel>
                <GlassInput
                  placeholder="Violation of terms"
                  value={banData.reason}
                  onChange={e => setBanData({ ...banData, reason: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Duration (Days — 0 = Permanent)</FieldLabel>
                <div className="flex gap-2 mb-2">
                  {[{ label: '1 Day', val: 1 }, { label: '7 Days', val: 7 }, { label: 'Permanent', val: 0 }].map(d => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setBanData({ ...banData, days: d.val })}
                      className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all duration-200 ${
                        banData.days === d.val
                          ? 'bg-red-500/20 border-red-500/40 text-red-400'
                          : 'bg-white/5 border-white/8 text-white/35 hover:border-red-500/25 hover:text-white/60'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <GlassInput
                  type="number"
                  value={banData.days}
                  onChange={e => setBanData({ ...banData, days: parseInt(e.target.value) })}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowBanModal(null)}
                  className="flex-1 py-3 rounded-xl border border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5 font-black text-[11px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBan}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:bg-red-400 transition-all duration-200"
                >
                  Confirm Ban
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── CSV Import Modal ── */}
      <AnimatePresence>
        {showCSVModal && (
          <ModalOverlay onClose={() => { setShowCSVModal(false); setCSVResult(null); }}>
            <ModalHeader
              title="Import Users from CSV"
              onClose={() => { setShowCSVModal(false); setCSVResult(null); }}
            />
            <div className="p-7 space-y-5">
              {!csvResult ? (
                <>
                  <div className="px-4 py-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/15">
                    <p className="text-[10px] text-[var(--primary)]/70 font-black uppercase tracking-widest mb-1">Format</p>
                    <code className="text-[10px] text-white/40 font-mono">username,password,email</code>
                    <p className="text-[9px] text-white/20 mt-1">One user per line. Password defaults to "Default123" if omitted.</p>
                  </div>
                  <GlassDropzone onFiles={handleCSVImport} />
                </>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px] text-emerald-400">check_circle</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-white/70">Import Complete</p>
                    <p className="text-xs text-white/40 mt-1">{csvResult?.count || 0} users imported successfully</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCSVModal(false); setCSVResult(null); }}
                  className="flex-1 py-3 rounded-xl border border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5 font-black text-[11px] uppercase tracking-widest transition-all"
                >
                  {csvResult ? 'Done' : 'Cancel'}
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
