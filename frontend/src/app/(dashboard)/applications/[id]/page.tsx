'use client';
import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/hooks/use-developer-queries';
import { useCopy } from '@/components/ui/copy-dialog';
import { AnimatePresence, motion } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────
type LangKey = 'csharp' | 'cpp' | 'python' | 'javascript' | 'typescript' | 'java' | 'php' | 'lua' | 'rust' | 'go' | 'swift' | 'kotlin' | 'ruby' | 'dart' | 'shell';

interface Lang {
  label: string;
  dot: string;
}

// ── Language config ────────────────────────────────────────────────────────
const LANGS: Record<LangKey, Lang> = {
  csharp:     { label: 'C#',         dot: '#60a5fa' },
  cpp:        { label: 'C++',        dot: '#818cf8' },
  python:     { label: 'Python',     dot: '#facc15' },
  javascript: { label: 'JS', dot: '#fb923c' },
  typescript: { label: 'TS', dot: '#38bdf8' },
  java:       { label: 'Java',       dot: '#f87171' },
  php:        { label: 'PHP',        dot: '#a78bfa' },
  lua:        { label: 'Lua',        dot: '#34d399' },
  rust:       { label: 'Rust',       dot: '#fb923c' },
  go:         { label: 'Go',         dot: '#22d3ee' },
  swift:      { label: 'Swift',      dot: '#f97316' },
  kotlin:     { label: 'Kotlin',     dot: '#c084fc' },
  ruby:       { label: 'Ruby',       dot: '#f43f5e' },
  dart:       { label: 'Dart',       dot: '#38bdf8' },
  shell:      { label: 'Shell',      dot: '#4ade80' },
};

const LANG_ORDER: LangKey[] = ['csharp','cpp','python','javascript','typescript','java','php','lua','rust','go','swift','kotlin','ruby','dart','shell'];

function getSnippet(lang: LangKey, secret: string, ownerId: string, version: string, appName: string): string {
  const base = 'https://authsys-main-production.up.railway.app/api/v1';
  const name = appName || 'MyApp';
  switch (lang) {
    case 'csharp': return `using AuthSysSDK;

AuthSys auth = new AuthSys(
    "${name}",
    "${ownerId}",
    "${secret}",
    "${version}",
    "${base}"
);

// Login example:
// var result = await auth.LoginAsync("username", "password");
// License login example:
// var result = await auth.LicenseLoginAsync("license-key");

/*
Optional:
- Set debug to false to disable SDK logs.
- Set antiDebug to false to disable anti-debugger protection.
*/`;
    case 'cpp': return `#include "AuthSys.hpp"

AuthSys::api AuthSysApp(
    "${name}",
    "${ownerId}",
    "${secret}",
    "${version}",
    "${base}"
);

// Login example:
// AuthSysApp.login("username", "password");
// License example:
// AuthSysApp.license("license-key");`;
    case 'python': return `from authsys import Auth

app = Auth(
    name="${name}",
    owner_id="${ownerId}",
    secret="${secret}",
    version="${version}",
    api="${base}"
)

# Optional: app.debug = False
# Optional: app.anti_debug = False`;
    case 'javascript': return `import { Auth } from '@authsys/sdk';

const app = new Auth(
    '${name}',
    '${ownerId}',
    '${secret}',
    '${version}',
    '${base}'
);

// Optional: app.debug = false;`;
    case 'typescript': return `import { Auth } from '@authsys/sdk';

const app = new Auth(
    '${name}',
    '${ownerId}',
    '${secret}',
    '${version}',
    '${base}'
);`;
    case 'java': return `Auth app = new Auth.Builder()
    .name("${name}")
    .ownerId("${ownerId}")
    .version("${version}")
    .secret("${secret}")
    .api("${base}")
    .build();

// Optional: app.setDebug(false);`;
    case 'php': return `<?php
use AuthSys\\Auth;

$app = new Auth([
    'name'    => '${name}',
    'ownerId' => '${ownerId}',
    'version' => '${version}',
    'secret'  => '${secret}',
    'api'     => '${base}',
]);

// Optional: $app->setDebug(false);`;
    case 'lua': return `local Auth = require("authsys")

local app = Auth.new({
    name     = "${name}",
    owner_id = "${ownerId}",
    version  = "${version}",
    secret   = "${secret}",
    api      = "${base}",
})

-- Optional: app:setDebug(false)`;
    case 'rust': return `use authsys::Auth;

let app = Auth::builder()
    .name("${name}")
    .owner_id("${ownerId}")
    .version("${version}")
    .secret("${secret}")
    .api("${base}")
    .build()?;`;
    case 'go': return `import "github.com/authsys/sdk-go"

app, err := authsys.NewAuth(authsys.Config{
    Name:    "${name}",
    OwnerID: "${ownerId}",
    Version: "${version}",
    Secret:  "${secret}",
    API:     "${base}",
})`;
    case 'swift': return `import AuthSysSDK

let app = Auth(
    name: "${name}",
    ownerId: "${ownerId}",
    version: "${version}",
    secret: "${secret}",
    api: "${base}"
)

// Optional: app.debug = false`;
    case 'kotlin': return `val app = Auth.Builder()
    .name("${name}")
    .ownerId("${ownerId}")
    .version("${version}")
    .secret("${secret}")
    .api("${base}")
    .build()

// Optional: app.debug = false`;
    case 'ruby': return `require 'authsys'

app = AuthSys::Auth.new(
  name:     '${name}',
  owner_id: '${ownerId}',
  version:  '${version}',
  secret:   '${secret}',
  api:      '${base}'
)

# Optional: app.debug = false`;
    case 'dart': return `import 'package:authsys/authsys.dart';

final app = Auth(
  name: '${name}',
  ownerId: '${ownerId}',
  version: '${version}',
  secret: '${secret}',
  api: '${base}',
);

// Optional: app.debug = false;`;
    case 'shell': return `# Set your credentials as environment variables
export AUTHSYS_OWNER_ID="${ownerId}"
export AUTHSYS_SECRET="${secret}"
export AUTHSYS_VERSION="${version}"
export AUTHSYS_API="${base}"

# Authenticate
curl -X POST "$AUTHSYS_API/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"owner_id":"'"$AUTHSYS_OWNER_ID"'","secret":"'"$AUTHSYS_SECRET"'"}'`;
    default: return '';
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.18em] px-0.5">{label}</label>
      {children}
    </div>
  );
}

function SDKSnippet({ secret, ownerId, version, appName }: { secret: string; ownerId: string; version: string; appName?: string }) {
  const [activeLang, setActiveLang] = useState<LangKey>('csharp');
  const [dropOpen, setDropOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const snippet = getSnippet(activeLang, secret, ownerId, version, appName || '');
  const lang = LANGS[activeLang];

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const grid: LangKey[][] = [
    ['cpp',    'csharp',     'python'],
    ['javascript', 'typescript', 'java'],
    ['php',    'lua',        'rust'],
    ['go',     'swift',      'kotlin'],
    ['ruby',   'dart',       'shell'],
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--primary)]/15 bg-black/30">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-3">
        {/* Left: traffic lights + active lang */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: lang.dot }} />
            <span className="text-[10px] font-medium text-white/40 tracking-wide">{lang.label}</span>
          </div>
        </div>

        {/* Right: lang switcher dropdown + copy */}
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/8 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/[0.08] hover:border-white/15 transition-all duration-200"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: lang.dot }} />
              <span className="tracking-wide">{lang.label}</span>
              <span
                className="material-symbols-outlined text-[16px] transition-all duration-300"
                style={{ transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)', fontVariationSettings: "'FILL' 1" }}
              >expand_more</span>
            </button>

            <AnimatePresence>
              {dropOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 z-50 bg-[#0f1117] border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/60 min-w-[240px]"
                >
                  {grid.map((row, ri) => (
                    <div key={ri} className="flex gap-1 mb-1 last:mb-0">
                      {row.map(lk => {
                        const l = LANGS[lk];
                        const isActive = activeLang === lk;
                        return (
                          <button
                            key={lk}
                            onClick={() => { setActiveLang(lk); setDropOpen(false); }}
                            className={`flex items-center gap-1.5 flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-medium transition-all duration-150 ${
                              isActive
                                ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: isActive ? 'var(--primary)' : l.dot, opacity: isActive ? 1 : 0.5 }} />
                            {l.label}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-[10px] font-medium transition-all px-2.5 py-1.5 rounded-lg ${
              copied
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-white/5 text-white/30 hover:bg-[var(--primary)]/15 hover:text-[var(--primary)]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code area */}
      <AnimatePresence mode="wait">
        <motion.pre
          key={activeLang}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="px-5 py-5 text-[11px] text-white/55 font-mono leading-relaxed overflow-x-auto whitespace-pre"
        >
          {snippet}
        </motion.pre>
      </AnimatePresence>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ApplicationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const appId = parseInt(id as string, 10);
  const { app, isLoading } = useApp(Number.isNaN(appId) ? null : appId);
  const copy = useCopy();
  const [visibleSecret, setVisibleSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (value: string, field: string) => {
    copy(value, { label: `${field} copied` });
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleBack = () => {
    try {
      router.back();
    } catch {
      router.push('/applications');
    }
  };

  if (isLoading) return (
    <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
      <div className="h-6 w-36 bg-white/5 rounded-xl" />
      <div className="h-12 w-72 bg-white/5 rounded-xl" />
      <div className="h-[420px] bg-white/[0.02] border border-white/5 rounded-3xl" />
    </div>
  );

  if (!app) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
        <span className="material-symbols-outlined text-[24px] text-white/20">apps</span>
      </div>
      <div className="text-center">
        <p className="text-white/50 font-bold text-sm mb-3">Application not found</p>
        <button
          onClick={handleBack}
          className="text-[var(--primary)] font-black uppercase tracking-widest text-xs hover:underline"
        >
          Back to Applications
        </button>
      </div>
    </div>
  );

  const statItems = [
    { label: 'Total Users',  val: app.total_users ?? 0,  icon: 'group', color: 'var(--primary)',   bg: 'rgba(var(--primary),0.1)'   },
    { label: 'License Keys', val: app.total_keys ?? 0,   icon: 'key',   color: '#34d399',               bg: 'rgba(52,211,153,0.1)'                 },
    { label: 'Logins Today', val: app.logins_today ?? 0, icon: 'bolt',  color: 'var(--ring)', bg: 'rgba(var(--ring),0.1)' },
  ];

  return (
    <>
      <style>{`
        @keyframes shimmerAD {
          0%   { background-position:-200% center; }
          100% { background-position:200% center; }
        }
        @keyframes statPop {
          0%   { transform:scale(0.9); opacity:0; }
          60%  { transform:scale(1.04); }
          100% { transform:scale(1); opacity:1; }
        }
        .shimmer-ad {
          color: var(--foreground);
          background:linear-gradient(90deg,var(--foreground) 0%,var(--primary) 40%,var(--foreground) 60%);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          animation:shimmerAD 5s linear infinite;
        }
        .stat-card { animation:statPop 0.4s ease-out both; }
        .field-box {
          background:color-mix(in srgb, var(--foreground) 3%, transparent);
          border:1px solid color-mix(in srgb, var(--foreground) 8%, transparent);
          border-radius:0.875rem;
          padding:0.875rem 1rem;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:0.75rem;
          transition:border-color 0.2s, background 0.2s;
        }
        .field-box:hover { border-color:color-mix(in srgb, var(--foreground) 14%, transparent); }
        .action-btn { transition:all 0.15s ease; }
        .action-btn:hover { transform:scale(1.12); }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-8">

        {/* ── Back + Header ── */}
        <div>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white/30 hover:text-[var(--primary)] transition-colors group mb-4"
          >
            <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-1 transition-transform duration-200">
              arrow_back
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Applications</span>
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-black text-white/25 uppercase tracking-[0.2em]">Applications</span>
            <span className="material-symbols-outlined text-[12px] text-white/15">chevron_right</span>
            <span className="text-[9px] font-black text-[var(--primary)]/60 uppercase tracking-[0.2em]">Details</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-5xl font-black tracking-tight leading-none shimmer-ad">{app.name}</h1>
            <span className="text-[9px] px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-black uppercase tracking-widest">
              {app.status}
            </span>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-3 gap-4">
          {statItems.map((s, i) => (
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

        {/* ── Detail Card ── */}
        <div className="glass-card rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
          <div className="px-7 py-5 border-b border-white/5 bg-white/[0.015] flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-[var(--primary)]/60">settings</span>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Application Config</h3>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left column */}
            <div className="space-y-5">
              <FieldRow label="Application ID">
                <div className="field-box">
                  <span className="font-mono text-sm text-white/75">{app.id}</span>
                  <span className="text-[9px] font-black text-white/25 uppercase bg-white/5 px-2 py-0.5 rounded shrink-0">Primary Key</span>
                </div>
              </FieldRow>

              <FieldRow label="Current Version">
                <div className="field-box">
                  <span className="font-mono text-sm text-[var(--primary)] font-bold">{app.version}</span>
                  <span className="text-[9px] font-black text-white/25 uppercase bg-white/5 px-2 py-0.5 rounded shrink-0">SemVer</span>
                </div>
              </FieldRow>

              <FieldRow label="Owner ID">
                <div className="field-box">
                  <span className="font-mono text-sm text-white/70 truncate">{app.owner_id}</span>
                  <button
                    onClick={() => handleCopy(app.owner_id, 'Owner ID')}
                    className={`action-btn shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                      copiedField === 'Owner ID'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-white/5 text-white/25 hover:bg-[var(--primary)]/15 hover:text-[var(--primary)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedField === 'Owner ID' ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </FieldRow>

              <FieldRow label="Application Secret Key">
                <div className="field-box" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}>
                  <code className="font-mono text-xs text-[var(--primary)] tracking-widest truncate">
                    {visibleSecret ? app.app_secret : `APP_${'•'.repeat(20)}`}
                  </code>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => setVisibleSecret(!visibleSecret)}
                      className="action-btn w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 text-white/25 hover:bg-[var(--primary)]/15 hover:text-[var(--primary)] transition-all"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {visibleSecret ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <button
                      onClick={() => handleCopy(app.app_secret, 'Secret Key')}
                      className={`action-btn w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                        copiedField === 'Secret Key'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-white/5 text-white/25 hover:bg-[var(--primary)]/15 hover:text-[var(--primary)]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedField === 'Secret Key' ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>
              </FieldRow>
            </div>

            {/* Right column — SDK Snippet */}
            <div>
              <label className="block text-[10px] font-medium text-white/30 tracking-wide px-0.5 mb-1.5">
                SDK Snippet
              </label>
              <SDKSnippet
                secret={app.app_secret}
                ownerId={app.owner_id}
                version={app.version}
                appName={app.name}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
