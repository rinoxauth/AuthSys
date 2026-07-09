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
  { step: 1, text: 'Go to Discord Developer Portal', icon: 'open_in_new' },
  { step: 2, text: 'Create a new Application & Bot', icon: 'add_box' },
  { step: 3, text: 'Enable all Privileged Gateway Intents', icon: 'toggle_on' },
  { step: 4, text: 'Copy Token & fill the form below', icon: 'content_paste' },
];

export default function DiscordBotPage() {
  const { selectedAppId } = useAuthStore();
  const { data: profile } = useDeveloperMe(true);
  const locked = isFeatureLocked('seller', profile?.subscription_tier);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [token, setToken] = useState('');
  const [appId, setAppId] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const rippleId = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    if (locked) return;
    try {
      const [botsRes, appsRes] = await Promise.all([
        api.get('/developer/bots'),
        api.get('/developer/apps'),
      ]);
      setApps(appsRes.data);
      const discordBot = botsRes.data.find(
        (b: any) => b.bot_type === 'discord' && b.app_id === selectedAppId
      );
      setConfig(discordBot);
      if (discordBot) {
        setToken(discordBot.bot_token);
        setAppId(discordBot.discord_app_id || '');
        setPublicKey(discordBot.discord_public_key || '');
      } else {
        setToken(''); setAppId(''); setPublicKey('');
      }
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

  if (locked) return <PremiumLocked feature="Discord Bot" />;

  const interactionsUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/v1/bots/discord/interactions`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(interactionsUrl);
    toast.success('URL copied to clipboard!');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const spawnRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = rippleId.current++;
    setRipples(r => [...r, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 700);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) { toast.error('Please select an application first'); return; }
    setSaving(true);
    try {
      await api.post('/developer/bots/config', {
        app_id: selectedAppId,
        bot_type: 'discord',
        bot_token: token,
        discord_app_id: appId,
        discord_public_key: publicKey,
      });
      toast.success('Discord Bot configured successfully!');
      fetchData();
    } catch {
      toast.error('Failed to save bot configuration');
    } finally {
      setSaving(false);
    }
  };

  const appName = selectedAppId ? apps.find(a => a.id === selectedAppId)?.name : null;
  const isComplete = token && appId && publicKey;

  if (loading) return (
    <div className="flex items-center justify-center h-[70vh]">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center animate-pulse">
          <svg className="w-8 h-8 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
        </div>
        <div className="absolute inset-0 rounded-2xl border border-[#5865F2]/50 animate-ping" />
      </div>
    </div>
  );

  return (
    <div className="relative max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <style>{`
        @keyframes shimmerD {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes rippleOut {
          0%   { transform:translate(-50%,-50%) scale(0); opacity:0.4; }
          100% { transform:translate(-50%,-50%) scale(3); opacity:0; }
        }
        @keyframes borderGlow {
          0%,100% { border-color:rgba(88,101,242,0.15); box-shadow:none; }
          50%     { border-color:rgba(88,101,242,0.45); box-shadow:0 0 20px rgba(88,101,242,0.1); }
        }
        @keyframes slideDown {
          from { opacity:0; transform:translateY(-8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .shimmer-discord {
          background: linear-gradient(90deg, #fff 0%, #5865F2 40%, #a8b4ff 55%, #fff 70%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmerD 5s linear infinite;
        }
        .card-border { animation: borderGlow 4s ease-in-out infinite; }
        .field-focus { transition: all 0.3s cubic-bezier(.4,0,.2,1); }
        .cmd-card-d { transition: all 0.2s cubic-bezier(.4,0,.2,1); }
        .cmd-card-d:hover { transform:translateY(-3px); }
        .endpoint-reveal { animation: slideDown 0.3s ease-out; }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.2em]">Enterprise</p>
            <span className="material-symbols-outlined text-[12px] text-white/15">chevron_right</span>
            <p className="text-[9px] font-black text-[#5865F2]/70 uppercase tracking-[0.2em]">Automation Bots</p>
          </div>
          <h2 className="text-5xl font-black tracking-tight leading-none shimmer-discord">Discord</h2>
          <p className="text-sm text-white/40 mt-2 font-medium">
            {appName ? <>Configuring for <span className="text-[#5865F2] font-bold">{appName}</span></> : 'Select an application to configure'}
          </p>
        </div>

        {config && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Bot Active</span>
            </div>
            <p className="text-[9px] text-white/20 font-mono">gateway connected</p>
          </div>
        )}
      </div>

      {/* Completion bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-black text-white/25 uppercase tracking-widest">Configuration Progress</span>
          <span className="text-[9px] font-black text-[#5865F2] uppercase tracking-widest">
            {[token, appId, publicKey].filter(Boolean).length}/3 fields
          </span>
        </div>
        <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#5865F2] to-[#a8b4ff] transition-all duration-700"
            style={{ width: `${([token, appId, publicKey].filter(Boolean).length / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Main Config Card */}
        <div className="lg:col-span-8 space-y-5">
          <div
            ref={cardRef}
            className="relative rounded-3xl overflow-hidden border bg-white/[0.03] backdrop-blur-xl card-border"
            onClick={spawnRipple}
          >
            {/* Ripples */}
            {ripples.map(r => (
              <span
                key={r.id}
                className="pointer-events-none absolute w-32 h-32 rounded-full bg-[#5865F2]/20"
                style={{ left: r.x, top: r.y, animation: 'rippleOut 0.7s ease-out forwards' }}
              />
            ))}

            {/* BG Glows */}
            <div className="absolute -right-28 -top-28 w-96 h-96 bg-[#5865F2]/8 blur-[130px] rounded-full pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-indigo-600/5 blur-[80px] rounded-full pointer-events-none" />

            {/* Card Header */}
            <div className="px-8 pt-8 pb-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-[#5865F2]/15 flex items-center justify-center border border-[#5865F2]/25">
                    <svg className="w-6 h-6 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                  </div>
                  {config && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0f]" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Bot Configuration</h3>
                  <p className="text-[10px] text-white/35 font-bold uppercase tracking-widest">Developer Portal Setup</p>
                </div>
              </div>

              {isComplete && (
                <div className="text-[9px] font-black text-[#5865F2] bg-[#5865F2]/10 border border-[#5865F2]/20 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                  ✓ Complete
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="px-8 py-7 space-y-5 relative z-10">

              {/* App ID + Public Key row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-white/35 uppercase tracking-[0.15em]">
                    <span className="material-symbols-outlined text-[13px] text-[#5865F2]">fingerprint</span>
                    Application ID
                  </label>
                  <div className={`relative rounded-xl border transition-all duration-300 ${activeField === 'appId' ? 'border-[#5865F2]/50 shadow-[0_0_16px_rgba(88,101,242,0.15)]' : 'border-white/8'}`}>
                    <input
                      type="text"
                      value={appId}
                      onChange={e => setAppId(e.target.value)}
                      onFocus={() => setActiveField('appId')}
                      onBlur={() => setActiveField(null)}
                      placeholder="1234567890123456789"
                      className="w-full bg-white/4 rounded-xl px-4 py-3.5 text-sm font-mono text-white/85 focus:outline-none transition-all placeholder:text-white/12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-white/35 uppercase tracking-[0.15em]">
                    <span className="material-symbols-outlined text-[13px] text-[#5865F2]">lock</span>
                    Public Key
                  </label>
                  <div className={`relative rounded-xl border transition-all duration-300 ${activeField === 'pubKey' ? 'border-[#5865F2]/50 shadow-[0_0_16px_rgba(88,101,242,0.15)]' : 'border-white/8'}`}>
                    <input
                      type="text"
                      value={publicKey}
                      onChange={e => setPublicKey(e.target.value)}
                      onFocus={() => setActiveField('pubKey')}
                      onBlur={() => setActiveField(null)}
                      placeholder="ed25519_public_key..."
                      className="w-full bg-white/4 rounded-xl px-4 py-3.5 text-sm font-mono text-white/85 focus:outline-none transition-all placeholder:text-white/12"
                    />
                  </div>
                </div>
              </div>

              {/* Bot Token */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-[10px] font-black text-white/35 uppercase tracking-[0.15em]">
                  <span className="material-symbols-outlined text-[13px] text-[#5865F2]">vpn_key</span>
                  Bot Token
                </label>
                <div className={`relative rounded-xl border transition-all duration-300 ${activeField === 'token' ? 'border-[#5865F2]/50 shadow-[0_0_16px_rgba(88,101,242,0.15)]' : 'border-white/8'}`}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    onFocus={() => setActiveField('token')}
                    onBlur={() => setActiveField(null)}
                    placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4.Xyz..."
                    className="w-full bg-white/4 rounded-xl px-4 py-3.5 pr-12 text-sm font-mono text-white/85 focus:outline-none transition-all placeholder:text-white/12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-[#5865F2] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">{showToken ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                <p className="text-[9px] text-white/20 italic ml-1">
                  Found in <span className="text-[#5865F2] not-italic font-bold">Discord Developer Portal</span> → Bot → Token
                </p>
              </div>

              {/* Interactions URL (only when configured) */}
              {config && (
                <div className="endpoint-reveal p-5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[15px] text-emerald-400">link</span>
                    <label className="text-[10px] text-emerald-400/80 font-black uppercase tracking-widest">Interactions Endpoint URL</label>
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Required in Dev Portal</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={interactionsUrl}
                      className="flex-1 bg-black/25 border border-white/5 rounded-xl px-4 py-2.5 text-[11px] font-mono text-emerald-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`p-2.5 rounded-xl border transition-all duration-200 flex items-center gap-1.5 ${
                        copied
                          ? 'bg-emerald-500/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{copied ? 'check' : 'content_copy'}</span>
                    </button>
                  </div>
                  <p className="text-[9px] text-emerald-400/40 italic">
                    Paste this in Developer Portal → General Information → Interactions Endpoint URL
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || !isComplete}
                  className="relative overflow-hidden px-8 py-3.5 bg-[#5865F2] text-white rounded-xl text-sm font-black tracking-wide shadow-lg shadow-[#5865F2]/25 hover:shadow-[#5865F2]/45 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 group"
                >
                  <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-200" />
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      Save Configuration
                    </>
                  )}
                </button>

                {!isComplete && (
                  <p className="text-[10px] text-white/25 italic">
                    Fill all 3 fields to enable saving
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Commands */}
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Slash Commands</h4>
              <span className="text-[9px] font-bold text-white/25 bg-white/5 px-3 py-1 rounded-full">{COMMANDS.length} registered</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {COMMANDS.map((c, i) => (
                <div
                  key={c.cmd}
                  className="cmd-card-d p-4 bg-white/3 rounded-2xl border border-white/5 hover:border-[#5865F2]/35 hover:bg-[#5865F2]/5 cursor-default group"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[17px] text-[#5865F2]/55 group-hover:text-[#5865F2] transition-colors mt-0.5">{c.icon}</span>
                    <div>
                      <p className="font-mono text-[11px] font-black text-white/60 group-hover:text-[#5865F2] transition-colors">{c.cmd}</p>
                      <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{c.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SDK Setup Guide */}
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center border border-indigo-500/25">
                <span className="material-symbols-outlined text-[18px] text-indigo-400">package_2</span>
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">SDK Setup</h4>
                <p className="text-[9px] text-white/30 font-medium">Run the bot on your own infrastructure</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.015] space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-emerald-400">download</span>
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Step 1</span>
                </div>
                <p className="text-[11px] text-white/45 leading-relaxed">
                  Download the bot from <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px] font-mono">sdk/AuthSys-Discord-Bot-Example/</code>
                </p>
              </div>
              <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.015] space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-emerald-400">terminal</span>
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Step 2</span>
                </div>
                <p className="text-[11px] text-white/45 leading-relaxed">
                  Run <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px] font-mono">npm install</code> then <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px] font-mono">node .</code>
                </p>
              </div>
              <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.015] space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-emerald-400">settings</span>
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Step 3</span>
                </div>
                <p className="text-[11px] text-white/45 leading-relaxed">
                  Configure <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px] font-mono">.env</code> with your seller API key &amp; bot token
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

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5">

          {/* Setup Guide */}
          <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-[#5865F2]/10 to-transparent p-6 backdrop-blur-sm">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-5">Setup Guide</h4>
            <ul className="space-y-1">
              {STEPS.map(s => (
                <li key={s.step} className="flex gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group cursor-default">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 border transition-all duration-200 ${
                    config
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/8 border-white/10 text-white/45 group-hover:bg-[#5865F2]/20 group-hover:border-[#5865F2]/30 group-hover:text-[#5865F2]'
                  }`}>
                    {config ? '✓' : s.step}
                  </span>
                  <div className="flex-1">
                    <p className="text-[11px] text-white/55 leading-snug group-hover:text-white/75 transition-colors">{s.text}</p>
                  </div>
                  <span className="material-symbols-outlined text-[13px] text-white/10 group-hover:text-[#5865F2]/50 transition-colors">{s.icon}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Status Panel */}
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-5">Bot Status</h4>
            <div className="space-y-3">
              {[
                { label: 'Gateway', status: !!config, ok: 'CONNECTED', fail: 'DISCONNECTED' },
                { label: 'Commands', status: !!config, ok: 'SYNCED', fail: 'PENDING' },
                { label: 'Interactions', status: !!config, ok: 'ENABLED', fail: 'DISABLED' },
                { label: 'App Linked', status: !!selectedAppId, ok: 'LINKED', fail: 'NONE' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/4 last:border-0">
                  <span className="text-[11px] text-white/40">{row.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${row.status ? 'bg-emerald-500' : 'bg-white/15'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      row.status ? 'text-emerald-400' : 'text-white/20'
                    }`}>
                      {row.status ? row.ok : row.fail}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions reminder */}
          <div className="rounded-3xl border border-[#5865F2]/15 bg-[#5865F2]/5 p-5">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-[18px] text-[#5865F2] shrink-0 mt-0.5">shield</span>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-[#5865F2]/80 uppercase tracking-widest">Permissions Needed</p>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Enable <strong className="text-white/60">Server Members</strong> and <strong className="text-white/60">Message Content</strong> intents in the Bot section of your Developer Portal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}