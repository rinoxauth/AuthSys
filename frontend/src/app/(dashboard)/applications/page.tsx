'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useApps,
  useCreateApp,
  useDeleteApp,
  useToggleApp,
} from '@/hooks/use-developer-queries';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useCopy } from '@/components/ui/copy-dialog';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } },
};

function StatChip({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg bg-[var(--accent-opacity-8)] border border-[var(--border)]">
      <span className={`text-sm font-bold tabular-nums ${accent ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}

function AppCard({
  app, index, onManage, onDelete, onToggle, onCopySecret, onRegenSecret,
  visibleSecret, onToggleSecret,
}: {
  app: any; index: number;
  onManage: () => void; onDelete: () => void; onToggle: () => void;
  onCopySecret: () => void; onRegenSecret: () => void;
  visibleSecret: boolean; onToggleSecret: () => void;
}) {
  const isActive = app.status === 'active';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.article
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      layout
      className={[
        'group relative flex flex-col premium-card',
        'shadow-xl shadow-black/40',
        'transition-all duration-300 hover:border-white/[0.13] hover:shadow-2xl hover:shadow-black/60',
        !isActive && 'opacity-70 hover:opacity-100',
      ].join(' ')}
    >
      <div className="flex flex-col flex-1 p-5 gap-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[var(--accent-opacity-15)] border border-[var(--accent-opacity-20)] flex items-center justify-center shrink-0 shadow-inner shadow-[var(--accent-opacity-8)]">
            <span className="material-symbols-outlined text-[22px] text-[var(--primary)]">token</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-[var(--foreground)] leading-tight truncate group-hover:text-[var(--primary)] transition-colors duration-200">
              {app.name || 'Untitled'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-[var(--muted-foreground)] bg-[var(--accent-opacity-8)] px-1.5 py-0.5 rounded-md border border-[var(--border)]">
                v{app.version}
              </span>
              <span className={[
                'text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border',
                isActive
                  ? 'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20'
                  : 'text-[var(--muted-foreground)] bg-[var(--accent-opacity-8)] border-[var(--border)]',
              ].join(' ')}>
                {app.status}
              </span>
              <span className={[
                'material-symbols-outlined text-[11px] rounded-full p-0.5',
                app.hwid_enabled
                  ? 'text-[var(--success)]'
                  : 'text-[var(--muted-foreground)] opacity-40',
              ].join(' ')}>
                {app.hwid_enabled ? 'lock' : 'lock_open'}
              </span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent-opacity-8)] transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-9 z-20 w-44 rounded-xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--border)] shadow-2xl shadow-black/60 overflow-hidden py-1"
                  >
                    {[
                      { icon: 'refresh', label: 'Regen Secret', action: () => { onRegenSecret(); setMenuOpen(false); } },
                      { icon: 'content_copy', label: 'Copy Secret', action: () => { onCopySecret(); setMenuOpen(false); } },
                    ].map(({ icon, label, action }) => (
                      <button
                        key={label}
                        onClick={action}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent-opacity-8)] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">{icon}</span>
                        {label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatChip label="Users" value={app.total_users ?? 0} />
          <StatChip label="Keys" value={app.total_keys ?? 0} />
          <StatChip label="Today" value={app.logins_today ?? 0} accent />
        </div>

        <div className="group/secret flex items-center justify-between gap-3 bg-black/30 border border-[var(--border)] rounded-xl px-3.5 py-2.5">
          <code className="text-[11px] font-mono text-[var(--muted-foreground)] tracking-widest truncate select-none">
            {visibleSecret ? app.app_secret : `APP_${'•'.repeat(14)}`}
          </code>
          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover/secret:opacity-100 transition-opacity">
            <button
              onClick={onToggleSecret}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent-opacity-8)] transition-all"
            >
              <span className="material-symbols-outlined text-[14px]">
                {visibleSecret ? 'visibility_off' : 'visibility'}
              </span>
            </button>
            <button
              onClick={onCopySecret}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--accent-opacity-15)] transition-all"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-auto">
          <button
            onClick={onManage}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] border border-[var(--border)] bg-[var(--accent-opacity-8)] hover:bg-[var(--accent-opacity-15)] hover:text-[var(--primary)] hover:border-[var(--accent-opacity-20)] transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            Manage
          </button>
          <button
            onClick={onToggle}
            title={isActive ? 'Pause' : 'Resume'}
            className={[
              'w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200',
              isActive
                ? 'border-[var(--warning)]/20 bg-[var(--warning)]/5 text-[var(--warning)] hover:bg-[var(--warning)]/15'
                : 'border-[var(--success)]/20 bg-[var(--success)]/5 text-[var(--success)] hover:bg-[var(--success)]/15',
            ].join(' ')}
          >
            <span className="material-symbols-outlined text-[18px]">{isActive ? 'pause' : 'play_arrow'}</span>
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--destructive)]/20 bg-[var(--destructive)]/5 text-[var(--destructive)] hover:bg-[var(--destructive)]/15 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default function ApplicationsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const copy = useCopy();

  const { data: apps = [], isLoading: loading, isError, error, refetch } = useApps();
  const createApp = useCreateApp();
  const toggleApp = useToggleApp();
  const deleteApp = useDeleteApp();

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', version: '1.0.0', min_version: '0.9.0', hwid_enabled: true });
  const [creating, setCreating] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredApps = useMemo(() =>
    (apps || []).filter(app => {
      const matchesSearch = (app.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    }),
    [apps, searchTerm, statusFilter]
  );

  const totalUsers = (apps || []).reduce((acc, a) => acc + (a?.total_users || 0), 0);
  const inactiveCount = (apps || []).filter(a => a?.status !== 'active').length;

  const handleCreate = async () => {
    if (!formData.name.trim()) { toast.error('Application name is required'); return; }
    setCreating(true);
    try {
      await createApp.mutateAsync(formData);
      setShowModal(false);
      setFormData({ name: '', version: '1.0.0', min_version: '0.9.0', hwid_enabled: true });
      toast.success('Application created successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create application');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: number) => {
    try { await toggleApp.mutateAsync(id); toast.success('Status updated'); }
    catch { toast.error('Failed to update status'); }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Delete application?',
      message: 'This will permanently delete the application and all associated keys, users, and data. This action cannot be undone.',
      confirmLabel: 'Delete permanently',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try { await deleteApp.mutateAsync(id); toast.success('Application deleted'); }
    catch { toast.error('Failed to delete application'); }
  };

  const handleRegenSecret = async (id: number) => {
    try {
      const res = await api.post(`/developer/apps/${id}/regenerate-secret`);
      copy(res.data.app_secret, { label: 'New secret generated', description: 'Store it safely — it will not be shown again.' });
    } catch { toast.error('Failed to regenerate secret'); }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-5">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-red-400">error</span>
        </div>
        <p className="text-[12px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Failed to load applications</p>
        <p className="text-[11px] text-[var(--muted-foreground)]">{(error as any)?.message || 'Check console for details'}</p>
        <button onClick={() => refetch()} className="btn-secondary text-xs px-4 py-2">
          <span className="material-symbols-outlined text-[14px]">refresh</span>
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-5">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--primary)]/20" />
          <div className="absolute inset-0 rounded-full border-t-2 border-[var(--primary)] animate-spin" />
        </div>
        <p className="text-[12px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Loading applications</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper pt-6 overflow-visible">
      <motion.header
        variants={fadeUp} initial="hidden" animate="show"
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-8"
      >
        <div className="flex flex-col gap-3">
          <div>
            <nav className="breadcrumb">
              <span>Enterprise</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="breadcrumb-active">Applications</span>
            </nav>
            <h1 className="page-title">My Applications</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatChip label="Total" value={(apps || []).length} />
            <StatChip label="Users" value={totalUsers} accent />
            <StatChip label="Inactive" value={inactiveCount} />
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Application
        </button>
      </motion.header>

      <motion.div
        custom={1} variants={fadeUp} initial="hidden" animate="show"
        className="flex flex-col sm:flex-row gap-3 mb-7"
      >
        <div className="relative flex-1">
          <span className="search-icon material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Search applications..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="flex items-center gap-1">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`filter-tab ${statusFilter === s ? 'filter-tab-active' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {filteredApps.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="empty-state rounded-xl border border-dashed border-[var(--border)] bg-[var(--accent-opacity-8)]"
          >
            <div className="empty-icon">
              <span className="material-symbols-outlined text-3xl text-[var(--primary)]/50">layers_clear</span>
            </div>
            <h3 className="empty-title">No applications found</h3>
            <p className="empty-text mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'No results match your current filters. Try adjusting your search.'
                : "You haven't created any applications yet. Start by creating one."}
            </p>
            {!(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => setShowModal(true)}
                className="btn-secondary"
              >
                Create Application
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filteredApps.map((app, i) => (
              <AppCard
                key={app.id ?? i}
                app={app}
                index={i}
                onManage={() => router.push(`/applications/${app.id}`)}
                onDelete={() => handleDelete(app.id)}
                onToggle={() => handleToggle(app.id)}
                onCopySecret={() => copy(app.app_secret, { label: 'Secret copied' })}
                onRegenSecret={() => handleRegenSecret(app.id)}
                visibleSecret={!!visibleSecrets[app.id]}
                onToggleSecret={() => setVisibleSecrets(p => ({ ...p, [app.id]: !p[app.id] }))}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="modal-overlay"
          >
            <motion.div
              variants={scaleIn} initial="hidden" animate="show" exit="hidden"
              className={[
                'w-full max-w-4xl rounded-xl overflow-hidden',
                'bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--border)]',
                'shadow-2xl shadow-black/70',
                'flex flex-col md:flex-row max-h-[90vh]',
              ].join(' ')}
            >
              <div className="hidden md:flex w-72 shrink-0 flex-col bg-[var(--background)] border-r border-[var(--border)] p-7 gap-6 justify-center items-center">
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--primary)]/50 mb-1">Live Preview</p>
                  <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">Your app card as it will appear on the dashboard.</p>
                </div>

                <div className="w-full rounded-xl overflow-hidden bg-[var(--glass-bg)] border border-[var(--border)] shadow-xl">
                  <div className="h-0.5 bg-gradient-to-r from-[var(--primary)] via-[var(--primary-hover)] to-[var(--primary)]" />
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[var(--accent-opacity-15)] border border-[var(--accent-opacity-20)] flex items-center justify-center text-[var(--primary)]">
                        <span className="material-symbols-outlined text-[18px]">token</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[var(--foreground)] truncate">
                          {formData.name || 'New Application'}
                        </p>
                        <p className="text-[10px] font-mono text-[var(--muted-foreground)]">v{formData.version}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['Users', 'Keys', 'Today'].map(l => (
                        <div key={l} className="bg-black/20 rounded-lg p-1.5 text-center">
                          <p className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-widest">{l}</p>
                          <p className="text-[11px] font-bold text-[var(--foreground)]/50">0</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                      <span className="text-[10px] text-[var(--muted-foreground)]">HWID Lock</span>
                      <span className={`text-[10px] font-bold ${formData.hwid_enabled ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}`}>
                        {formData.hwid_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--muted-foreground)] italic text-center">Updates as you type</p>
              </div>

              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-start justify-between p-6 pb-4 border-b border-[var(--border)]">
                  <div>
                    <h2 className="modal-title text-[var(--foreground)]">Create Application</h2>
                    <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">Configure your new deployment parameters.</p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent-opacity-8)] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="field-label">
                        Application Name <span className="text-[var(--primary)]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Identity Guard"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="field-input"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="field-label">Version</label>
                      <input
                        type="text"
                        placeholder="1.0.0"
                        value={formData.version}
                        onChange={e => setFormData({ ...formData, version: e.target.value })}
                        className="field-input"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="field-label">Minimum Required Version</label>
                    <input
                      type="text"
                      placeholder="0.9.0"
                      value={formData.min_version}
                      onChange={e => setFormData({ ...formData, min_version: e.target.value })}
                      className="field-input"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, hwid_enabled: !formData.hwid_enabled })}
                    className={[
                      'w-full flex items-center justify-between gap-4 p-4 rounded-xl text-left',
                      'border transition-all duration-200',
                      formData.hwid_enabled
                        ? 'bg-[var(--accent-opacity-15)] border-[var(--accent-opacity-20)] hover:bg-[var(--accent-opacity-20)]'
                        : 'bg-[var(--accent-opacity-8)] border-[var(--border)] hover:bg-[var(--accent-opacity-10)]',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={[
                        'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                        formData.hwid_enabled ? 'bg-[var(--accent-opacity-20)] text-[var(--primary)]' : 'bg-[var(--accent-opacity-8)] text-[var(--muted-foreground)]',
                      ].join(' ')}>
                        <span className="material-symbols-outlined text-[18px]">devices</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--foreground)]/70">Hardware ID Lock</p>
                        <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Prevent credential sharing across devices</p>
                      </div>
                    </div>

                    <div className={`toggle-switch ${formData.hwid_enabled ? 'active' : 'inactive'}`}>
                      <div className={`toggle-knob ${formData.hwid_enabled ? 'active' : 'inactive'}`} />
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-[var(--border)]">
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !formData.name.trim()}
                    className="btn-primary disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {creating ? 'hourglass_top' : 'rocket_launch'}
                    </span>
                    {creating ? 'Launching\u2026' : 'Launch App'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
