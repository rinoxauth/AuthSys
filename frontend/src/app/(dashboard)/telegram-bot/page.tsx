'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { useDeveloperMe } from '@/hooks/use-developer-queries';
import { isFeatureLocked } from '@/lib/plan-access';
import PremiumLocked from '@/components/PremiumLocked';

const COMMANDS = [
  { cmd: '/usercreate', desc: 'Create a new end user', icon: 'person_add' },
  { cmd: '/genkey', desc: 'Generate a license key', icon: 'key' },
  { cmd: '/ban', desc: 'Ban a user or HWID', icon: 'block' },
  { cmd: '/stats', desc: 'View app analytics', icon: 'bar_chart' },
  { cmd: '/unban', desc: 'Unban a user or HWID', icon: 'lock_open' },
  { cmd: '/listkeys', desc: 'List all license keys', icon: 'list' },
];

const STEPS = [
  { step: 1, text: 'Open Telegram and search for @BotFather', icon: 'search' },
  { step: 2, text: 'Send /newbot and follow the prompts', icon: 'chat' },
  { step: 3, text: 'Copy the API Token provided', icon: 'content_copy' },
  { step: 4, text: 'Paste the token below and save', icon: 'save' },
];

export default function TelegramBotPage() {
  const { selectedAppId } = useAuthStore();
  const { data: profile } = useDeveloperMe(true);
  const locked = isFeatureLocked('seller', profile?.subscription_tier);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [particles, setParticles] = useState<{ x: number; y: number; id: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const particleId = useRef(0);

  const fetchData = async () => {
    if (locked) return;
    try {
      const [botsRes, appsRes] = await Promise.all([
        api.get('/developer/bots'),
        api.get('/developer/apps'),
      ]);
      setApps(appsRes.data);
      const telegramBot = botsRes.data.find(
        (b: any) => b.bot_type === 'telegram' && b.app_id === selectedAppId
      );
      setConfig(telegramBot);
      setToken(telegramBot ? telegramBot.bot_token : '');
    } catch (err) {
      console.error('Failed to fetch bot config', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!locked) {
      fetchData();
    }
  }, [selectedAppId, locked]);

  if (locked) return <PremiumLocked feature="Telegram Bot" />;

  const spawnParticle = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = particleId.current++;
    setParticles(p => [...p, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
    setTimeout(() => setParticles(p => p.filter(pt => pt.id !== id)), 900);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) { toast.error('Please select an application first'); return; }
    setSaving(true);
    try {
      await api.post('/developer/bots/config', {
        app_id: selectedAppId,
        bot_type: 'telegram',
        bot_token: token,
      });
      toast.success('Telegram Bot configured successfully!');
      fetchData();
    } catch {
      toast.error('Failed to save bot configuration');
    } finally {
      setSaving(false);
    }
  };

  const appName = selectedAppId ? apps.find(a => a.id === selectedAppId)?.name : null;

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-[#0088cc]/20 border border-[#0088cc]/30 flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.13-.31-1.08-.66.02-.18.27-.36.74-.55 2.89-1.26 4.82-2.09 5.79-2.5 2.75-1.15 3.32-1.35 3.7-.1.08.21.05.47.05.74z"/>
          </svg>
        </div>
        <div className="absolute inset-0 rounded-2xl border border-[#0088cc]/50 animate-ping" />
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="page-wrapper pt-6 space-y-6 overflow-visible"
      style={{ '--tg': '#0088cc' } as React.CSSProperties}
      onClick={spawnParticle}
    >
      {/* Floating particles */}
      {particles.map(p => (
        <span
          key={p.id}
          className="pointer-events-none fixed z-50 w-2 h-2 rounded-full bg-[var(--primary)] opacity-80"
          style={{
            left: p.x,
            top: p.y,
            animation: 'floatUp 0.9s ease-out forwards',
          }}
        />
      ))}

      <style>{`
        @keyframes floatUp {
          0%   { transform: translate(-50%,-50%) scale(1); opacity:0.8; }
          100% { transform: translate(-50%,-200%) scale(0); opacity:0; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #fff 0%, var(--primary) 40%, #fff 60%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        .cmd-card { transition: all 0.25s cubic-bezier(.4,0,.2,1); }
        .cmd-card:hover { transform: translateY(-3px) scale(1.02); }
        .step-item { transition: all 0.2s ease; }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="breadcrumb">
            <span>Enterprise</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="breadcrumb-active">Automation Bots</span>
          </div>
          <h1 className="page-title shimmer-text">Telegram Bot</h1>
          <p className="page-subtitle">
            {appName ? <>Configuring for <span className="text-[var(--primary)] font-bold">{appName}</span></> : 'Select an application to configure'}
          </p>
        </div>
        {config && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl self-start">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Bot Active</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Main Config Card */}
        <div className="lg:col-span-8 space-y-5">
          <div className="premium-card overflow-hidden">
            {/* BG Glow */}
            <div className="absolute -right-24 -top-24 w-80 h-80 bg-[var(--primary)]/8 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-[var(--primary)]/5 blur-[80px] rounded-full pointer-events-none" />

            {/* Card Header */}
            <div className="px-7 py-5 border-b border-white/5 bg-white/[0.015] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center border border-[var(--primary)]/25">
                    <svg className="w-6 h-6 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.13-.31-1.08-.66.02-.18.27-.36.74-.55 2.89-1.26 4.82-2.09 5.79-2.5 2.75-1.15 3.32-1.35 3.7-.1.08.21.05.47.05.74z"/>
                    </svg>
                  </div>
                  {config && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--card)]" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-[var(--foreground)]">Bot Configuration</h3>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase tracking-widest">API Token Setup</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="px-7 py-6 space-y-5 relative z-10">
              <div className="space-y-2">
                <label className="field-label">Telegram Bot Token</label>
                <div className="relative group">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="123456789:AAHe8xyzTokenHere..."
                    className="field-input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-[var(--primary)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">{showToken ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                <p className="text-[9px] text-white/25 ml-1">
                  Obtain from <span className="text-[var(--primary)] font-bold">@BotFather</span> on Telegram
                </p>
              </div>

              {/* Token strength indicator */}
              {token && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="stat-label">Token Format</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                      /^\d+:[A-Za-z0-9_-]{35,}$/.test(token) ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {/^\d+:[A-Za-z0-9_-]{35,}$/.test(token) ? 'Valid' : 'Check Format'}
                    </span>
                  </div>
                  <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${/^\d+:[A-Za-z0-9_-]{35,}$/.test(token) ? 'bg-emerald-500 w-full' : 'bg-amber-500 w-1/2'}`} />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving || !token}
                  className="btn-primary"
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">save</span> Save Configuration</>
                  )}
                </button>

                {config && (
                  <button
                    type="button"
                    onClick={() => { setToken(''); setConfig(null); }}
                    className="btn-danger"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    Remove
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Commands Grid */}
          <div className="card-wrapper p-6">
            <div className="flex items-center justify-between mb-5">
              <h4 className="section-title">Available Commands</h4>
              <span className="stat-label">{COMMANDS.length} commands</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {COMMANDS.map((c, i) => (
                <div
                  key={c.cmd}
                  className="cmd-card p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5 cursor-default group"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[18px] text-[var(--primary)]/60 group-hover:text-[var(--primary)] transition-colors mt-0.5">{c.icon}</span>
                    <div>
                      <p className="text-[var(--primary)] font-mono text-[11px] font-black">{c.cmd}</p>
                      <p className="text-[10px] text-white/35 mt-0.5 leading-tight">{c.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SDK Setup Guide */}
          <div className="premium-card overflow-hidden p-8">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center border border-[var(--primary)]/25">
                  <span className="material-symbols-outlined text-[18px] text-[var(--primary)]">package_2</span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-[var(--foreground)] uppercase tracking-[0.2em]">SDK Setup</h4>
                  <p className="text-[9px] text-[var(--muted-foreground)] font-medium">Run the bot on your own infrastructure</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.015] space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-emerald-400">download</span>
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Step 1</span>
                  </div>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    Download the bot from <code className="text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded text-[10px] font-mono">sdk/AuthSys-Telegram-Bot-Example/</code>
                  </p>
                </div>
                <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.015] space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-emerald-400">terminal</span>
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Step 2</span>
                  </div>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    Run <code className="text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded text-[10px] font-mono">bun i</code> then <code className="text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded text-[10px] font-mono">bun run .</code>
                  </p>
                </div>
                <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.015] space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-emerald-400">settings</span>
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Step 3</span>
                  </div>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    Configure <code className="text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded text-[10px] font-mono">.env</code> with your seller API key &amp; bot token
                  </p>
                </div>
                <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.015] space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-emerald-400">check_circle</span>
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Step 4</span>
                  </div>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    Bot calls the Seller API — no backend changes needed
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
                <span className="material-symbols-outlined text-[16px] text-amber-400 shrink-0 mt-0.5">info</span>
                <p className="text-[10px] text-amber-400/70 leading-relaxed">
                  The bot runs on your machine, not on AuthSys servers. All operations use your seller API key.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5">

          {/* Setup Guide */}
          <div className="card-wrapper p-6">
            <h4 className="section-title mb-5">Setup Guide</h4>
            <ul className="space-y-1">
              {STEPS.map((s, i) => (
                <li
                  key={s.step}
                  className="step-item flex gap-3 p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-all"
                  onMouseEnter={() => setActiveStep(s.step)}
                  onMouseLeave={() => setActiveStep(null)}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all duration-200 border ${
                    activeStep === s.step
                      ? 'bg-[var(--primary)]/25 border-[var(--primary)]/50 text-[var(--primary)]'
                      : config && s.step <= 4
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/8 border-white/10 text-white/50'
                  }`}>
                    {config && s.step <= 4 ? '✓' : s.step}
                  </span>
                  <div className="flex-1">
                    <p className="text-[11px] text-white/60 leading-snug">{s.text}</p>
                  </div>
                  <span className={`material-symbols-outlined text-[14px] transition-colors ${activeStep === s.step ? 'text-[var(--primary)]' : 'text-white/10'}`}>{s.icon}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Status Panel */}
          <div className="card-wrapper p-6">
            <h4 className="section-title mb-5">Connection Status</h4>
            <div className="space-y-3">
              {[
                { label: 'Bot Token', status: !!token, ok: 'Provided', fail: 'Missing' },
                { label: 'App Linked', status: !!selectedAppId, ok: 'Linked', fail: 'None' },
                { label: 'Webhook', status: !!config, ok: 'Active', fail: 'Inactive' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="stat-label">{row.label}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                    row.status ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/25'
                  }`}>
                    {row.status ? row.ok : row.fail}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="card-wrapper p-5 border border-[var(--primary)]/10 bg-[var(--primary)]/[0.03]">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-[18px] text-[var(--primary)] shrink-0 mt-0.5">info</span>
              <p className="text-[11px] text-white/45 leading-relaxed">
                Your bot token is stored encrypted. Never share it publicly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}