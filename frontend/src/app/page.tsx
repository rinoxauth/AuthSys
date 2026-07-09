"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import Link from "next/link";
import { 
  Play, Terminal, Key, Cpu, Bot, BarChart3, 
  AlertTriangle, Webhook, Check, X, ChevronDown, Menu, X as XIcon, 
  FileCode2, Zap, Star, Sparkles, ArrowRight, Lock, Globe, Activity,
  TrendingUp, Users, Clock, Layers, Code2, ChevronRight
} from "lucide-react";
import {
  SiPython, SiJavascript, SiTypescript, SiDotnet, SiCplusplus,
  SiOpenjdk, SiRust, SiGo, SiPhp, SiLua, SiSwift, SiKotlin,
  SiRuby, SiDart, SiGnubash
} from "react-icons/si";
import { HoverFooter } from "@/components/blocks/hover-footer";
import HeroSection from "@/components/HeroSection";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { DEFAULT_PLANS } from '@/lib/pricing';
import PricingGrid from '@/components/pricing/PricingGrid';
import api from "@/lib/api";

// ─── Design Tokens ───────────────────────────────────────────────────────────
const T = {
  accent: "var(--primary)",
  accentHover: "var(--primary-hover)",
  accentGlow: "var(--accent-opacity-20)",
  accentTint: "var(--accent-opacity-10)",
  bg: "var(--background)",
  surface: "var(--card)",
  surface2: "var(--popover)",
  border: "var(--border)",
  borderHover: "var(--border-hover)",
  textPrimary: "var(--foreground)",
  textSecondary: "var(--muted-foreground)",
  textMuted: "var(--text-muted)",
};

// ─── Utility Components ───────────────────────────────────────────────────────

const Button = ({ children, variant = "primary", size = "md", className = "", style, ...props }: any) => {
  const base = "inline-flex items-center justify-center font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none disabled:opacity-40 active:scale-[0.97] select-none";
  const variants: Record<string, { className: string; style?: any }> = {
    primary: {
      className: "text-[var(--primary-foreground)] rounded-xl",
      style: { background: T.accent, boxShadow: `0 4px 16px ${T.accentGlow}` },
    },
    ghost: { className: "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 rounded-xl" },
    outline: { className: "border border-[var(--border)] text-[var(--foreground)] hover:bg-white/5 hover:border-[var(--border-hover)] rounded-xl" },
    glass: { className: "text-[var(--foreground)] hover:bg-white/8 hover:border-white/15 backdrop-blur-sm rounded-xl", style: { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' } },
  };
  const sizes: any = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-6 text-sm",
    lg: "h-13 px-8 text-base",
    xl: "h-15 px-10 text-base",
  };
  return (
    <button className={`${base} ${variants[variant].className} ${sizes[size]} ${className}`} style={{ ...variants[variant].style, ...style }} {...props}>
      {children}
    </button>
  );
};

// Animated number counter
function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [displayed, setDisplayed] = useState("0");
  
  useEffect(() => {
    if (!inView) return;
    const numMatch = value.match(/[\d.]+/);
    if (!numMatch) { setDisplayed(value); return; }
    const num = parseFloat(numMatch[0]);
    const prefix = value.replace(/[\d.+<>mMkK%ms]+/g, "").trim();
    const isSuffix = value.endsWith(numMatch[0]) ? "" : value.slice(value.indexOf(numMatch[0]) + numMatch[0].length);
    let start = 0;
    const step = num / 40;
    const timer = setInterval(() => {
      start = Math.min(start + step, num);
      setDisplayed(`${Number.isInteger(num) ? Math.round(start) : start.toFixed(1)}${isSuffix}`);
      if (start >= num) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [inView, value]);

  return <span ref={ref}>{displayed || value}</span>;
}

// Glowing orb background
function GlowOrb({ x, y, color, size = 400, opacity = 0.12 }: any) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x, top: y,
        width: size, height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity,
        transform: "translate(-50%, -50%)",
        filter: "blur(1px)",
      }}
    />
  );
}

// Section label
function SectionLabel({ children }: any) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.12em] border mb-6"
      style={{ background: T.accentTint, borderColor: 'var(--accent-opacity-20)', color: T.accent }}>
      <Sparkles className="w-3 h-3" />
      {children}
    </div>
  );
}

// Feature card with 3D hover
function FeatureCard({ icon: Icon, title, desc, delay = 0 }: any) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay }}
      onMouseMove={handleMove}
      className="relative group rounded-2xl p-7 border overflow-hidden cursor-default"
      style={{ background: "var(--glass-bg)", borderColor: T.border, backdropFilter: "blur(20px)" }}
    >
      {/* Spotlight effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl"
        style={{
          background: `radial-gradient(200px circle at ${pos.x}px ${pos.y}px, var(--accent-opacity-8), transparent 80%)`,
        }}
      />
      {/* Border glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: `inset 0 0 0 1px var(--accent-opacity-20)` }} />

      <div className="relative z-10">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
          style={{ background: T.accentTint, border: `1px solid var(--accent-opacity-15)` }}>
          <Icon className="w-5 h-5" style={{ color: T.accent }} />
        </div>
        <h3 className="text-base font-bold mb-2.5" style={{ color: T.textPrimary }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: T.textSecondary }}>{desc}</p>
      </div>
    </motion.div>
  );
}

// Stat card
function StatCard({ value, label, delay = 0 }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative group rounded-2xl p-7 border text-center overflow-hidden transition-all duration-200 hover:border-[var(--accent-opacity-20)]"
      style={{ background: "var(--glass-bg)", borderColor: T.border, backdropFilter: "blur(20px)" }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: `radial-gradient(200px circle at 50% 120%, var(--accent-opacity-15), transparent)` }} />
      <div className="relative text-4xl md:text-5xl font-black mb-2 tabular-nums"
        style={{ color: T.textPrimary, fontVariantNumeric: "tabular-nums" }}>
        <AnimatedCounter value={value} />
      </div>
      <div className="text-sm font-medium" style={{ color: T.textSecondary }}>{label}</div>
    </motion.div>
  );
}



// ─── Default Data ─────────────────────────────────────────────────────────────
const defaultSettings = [
  { key: "watch_demo_url", value: "#" },
  { key: "landing_paragraph", value: "License keys, HWID lock, real-time threat detection & AI-powered control — all in one dashboard. Ship protected software in minutes." },
  { key: "contact_email", value: "rinoxauth@gmail.com" },
  { key: "contact_phone", value: "+880 1917 797839" },
  { key: "contact_address", value: "Address: Khulna, Bangladesh" },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const scrollRef = useScrollAnimation();
  const [plans, setPlans] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const seoH1 = "AuthSys: Secure Authentication System & Cyber Security Login Platform for Developers";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, settingsRes] = await Promise.all([
          api.get("/billing/plans"),
          api.get("/admin/settings/public"),
        ]);
        if (plansRes.data?.length > 0) {
          setPlans([...plansRes.data].sort((a, b) => a.sort_order - b.sort_order).filter((p: any) => (p.is_active ?? true) && p.sort_order >= 1 && p.sort_order <= 4 && !/tester/i.test(p.name)));
        } else {
          setPlans(DEFAULT_PLANS);
        }
        if (settingsRes.data?.length > 0) {
          setSettings(prev => {
            const merged = [...prev];
            settingsRes.data.forEach((s: any) => {
              const idx = merged.findIndex(i => i.key === s.key);
              if (idx > -1) merged[idx] = s; else merged.push(s);
            });
            return merged;
          });
        }
      } catch (err) {
        console.error("Failed to fetch landing data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getVal = (key: string) => settings.find(s => s.key === key)?.value || "";

  return (
    <div
      ref={scrollRef}
      className="min-h-screen font-sans selection:bg-[var(--accent-opacity-15)]"
      style={{ background: T.bg, color: T.textPrimary }}
    >
      <h1 className="sr-only">{seoH1}</h1>

      <HeroSection
        demoUrl={getVal("watch_demo_url")}
        heroParagraph={getVal("landing_paragraph")}
      />

      <main>

        {/* ── SDK LANGUAGES TICKER ── */}
        <section className="border-y py-5 overflow-hidden" style={{ borderColor: T.border, background: "var(--glass-bg)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-8">
            <span className="text-xs font-semibold uppercase tracking-widest whitespace-nowrap shrink-0"
              style={{ color: T.textMuted }}>SDKs</span>
            <div className="flex-1 relative overflow-hidden mask-fade-sides">
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="flex gap-10 whitespace-nowrap"
              >
                {(() => {
                  const langs = [
                    { name: "Python", icon: SiPython, color: "#3776AB" },
                    { name: "JavaScript", icon: SiJavascript, color: "#F7DF1E" },
                    { name: "TypeScript", icon: SiTypescript, color: "#3178C6" },
                    { name: "C#", icon: SiDotnet, color: "#512BD4" },
                    { name: "C++", icon: SiCplusplus, color: "#00599C" },
                    { name: "Java", icon: SiOpenjdk, color: "#437291" },
                    { name: "Rust", icon: SiRust, color: "#000000" },
                    { name: "Go", icon: SiGo, color: "#00ADD8" },
                    { name: "PHP", icon: SiPhp, color: "#777BB4" },
                    { name: "Lua", icon: SiLua, color: "#000080" },
                    { name: "Swift", icon: SiSwift, color: "#F05138" },
                    { name: "Kotlin", icon: SiKotlin, color: "#7F52FF" },
                    { name: "Ruby", icon: SiRuby, color: "#CC342D" },
                    { name: "Dart", icon: SiDart, color: "#0175C2" },
                    { name: "Shell", icon: SiGnubash, color: "#4EAA25" },
                  ];
                  return [...langs, ...langs].map((lang, i) => {
                    const Icon = lang.icon;
                    return (
                      <span key={i} className="text-sm font-bold tracking-wide flex items-center gap-2.5"
                        style={{ color: T.textMuted }}>
                        <Icon className="w-4 h-4 shrink-0" color={lang.color} />
                        {lang.name}
                      </span>
                    );
                  });
                })()}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="py-20 px-4 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <StatCard value="2,000+" label="Active Developers" delay={0} />
            <StatCard value="50M+" label="Auth Requests Served" delay={0.1} />
            <StatCard value="99.9%" label="Platform Uptime" delay={0.2} />
            <StatCard value="<50ms" label="Avg Response Time" delay={0.3} />
          </div>
        </section>

        {/* ── FEATURES GRID ── */}
        <section id="features" className="py-20 px-4 max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <SectionLabel>Core Features</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-5 max-w-2xl mx-auto leading-[1.1]"
              style={{ color: T.textPrimary }}>
              Everything you need to<br />
              <span style={{ color: T.accent }}>protect your software</span>
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: T.textSecondary }}>
              Enterprise-grade security primitives, deployed in minutes.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Key, title: "License Key System", desc: "Time, lifetime, and usage-based keys. Bulk-generate up to 1000 keys at once with full lifecycle management." },
              { icon: Cpu, title: "HWID Lock", desc: "Hardware fingerprint binding prevents key sharing. CPU, motherboard, and MAC address signatures." },
              { icon: Bot, title: "AI Security Agent", desc: 'Natural language control. Type "Ban all users from suspicious IPs" — done instantly.' },
              { icon: BarChart3, title: "Real-time Analytics", desc: "Live login maps, suspicious activity heatmaps, risk scoring metrics, and behavioral anomaly alerts." },
              { icon: AlertTriangle, title: "Threat Detection", desc: "Impossible travel detection, auto-ban triggers, VPN/proxy flagging, and geofencing rules." },
              { icon: Webhook, title: "Webhook System", desc: "Instant event-driven notifications delivered to Discord, Slack, or any HTTPS endpoint." },
            ].map((feat, i) => (
              <FeatureCard key={i} {...feat} delay={i * 0.08} />
            ))}
          </div>
        </section>

        {/* ── AI AGENT SHOWCASE ── */}
        <section className="relative py-24 px-4 overflow-hidden border-y" style={{ borderColor: T.border }}>
          {/* Background */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${T.surface} 0%, ${T.bg} 100%)` }} />
          <GlowOrb x="80%" y="50%" color={T.accent} size={600} opacity={0.07} />
          <GlowOrb x="10%" y="60%" color="var(--ring)" size={400} opacity={0.05} />

          <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            {/* Text side */}
            <motion.div
              className="flex-1 max-w-xl"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <SectionLabel>World's First</SectionLabel>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-[1.05]"
                style={{ color: T.textPrimary }}>
                Meet your<br />
                <span style={{ color: T.accent }}>AI security</span><br />
                agent
              </h2>
              <p className="text-lg mb-10 leading-relaxed" style={{ color: T.textSecondary }}>
                Manage your entire user base in plain English. The agent understands context, analyzes patterns, and executes security commands in real time.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Ban users by complex behavioral criteria",
                  "Generate insights from login telemetry",
                  "Auto-resolve support tickets with context",
                  "Configure dynamic security policies",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex items-center gap-3 text-sm font-medium"
                    style={{ color: T.textPrimary }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: T.accentTint }}>
                      <Check className="w-3 h-3" style={{ color: T.accent }} strokeWidth={3} />
                    </div>
                    {item}
                  </motion.li>
                ))}
              </ul>
              <Link href="/register">
                <button
                  className="inline-flex items-center gap-2 h-12 px-7 rounded-xl font-semibold text-sm transition-all duration-200 hover:gap-3 active:scale-[0.97]"
                  style={{ background: T.accent, color: "white", boxShadow: `0 4px 24px ${T.accentGlow}` }}
                >
                  Try the AI Agent <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </motion.div>

            {/* Chat Mockup */}
            <motion.div
              className="flex-1 w-full max-w-lg"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="rounded-2xl border overflow-hidden shadow-2xl"
                style={{ background: T.bg, borderColor: T.border, boxShadow: `0 40px 80px rgba(0,0,0,0.6)` }}>
                {/* Window chrome */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b" style={{ background: T.surface, borderColor: T.border }}>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Bot className="w-4 h-4" style={{ color: T.accent }} />
                    <span className="text-xs font-semibold" style={{ color: T.textPrimary }}>AuthSys Agent</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] font-medium text-green-400">Live</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-6 space-y-5 h-[340px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                  {/* System message */}
                  <div className="text-center">
                    <span className="text-[10px] px-3 py-1 rounded-full" style={{ background: T.surface, color: T.textMuted }}>
                      Session started · Admin access granted
                    </span>
                  </div>

                  {/* User message 1 */}
                  <div className="flex justify-end">
                    <div className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm max-w-[80%]"
                      style={{ background: T.surface2, color: T.textPrimary }}>
                      Ban all users with risk score above 80
                    </div>
                  </div>

                  {/* Agent reply */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 }}
                    className="flex justify-start"
                  >
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[85%] space-y-2"
                      style={{ background: T.accentTint, border: `1px solid color-mix(in srgb, var(--primary) 20%, transparent)`, color: T.textPrimary }}>
                      <p>Scanning user database for risk score {">"} 80...</p>
                      <div className="h-px" style={{ background: `color-mix(in srgb, var(--primary) 20%, transparent)` }} />
                      <div className="flex items-center gap-2 text-xs font-mono" style={{ color: T.textSecondary }}>
                        <Activity className="w-3 h-3" style={{ color: T.accent }} />
                        Found 12 matching users
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: T.accent }}>
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        12 accounts banned successfully
                      </div>
                    </div>
                  </motion.div>

                  {/* User message 2 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 }}
                    className="flex justify-end"
                  >
                    <div className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm max-w-[80%]"
                      style={{ background: T.surface2, color: T.textPrimary }}>
                      Show me logins from Russia in the last 24h
                    </div>
                  </motion.div>

                  {/* Agent reply 2 */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.35 }}
                    className="flex justify-start"
                  >
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[85%]"
                      style={{ background: T.accentTint, border: `1px solid color-mix(in srgb, var(--primary) 20%, transparent)`, color: T.textPrimary }}>
                      <span className="text-xs font-mono" style={{ color: T.textSecondary }}>📍 3 logins detected from RU · 2 flagged as VPN</span>
                    </div>
                  </motion.div>

                  {/* Typing indicator */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.45 }}
                    className="flex justify-start"
                  >
                    <div className="flex gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm"
                      style={{ background: T.surface2 }}>
                      {[0, 0.15, 0.3].map((d, i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: d }}
                          className="w-2 h-2 rounded-full"
                          style={{ background: T.textMuted }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Input bar */}
                <div className="px-4 py-3 border-t flex items-center gap-3" style={{ borderColor: T.border, background: T.surface }}>
                  <div className="flex-1 h-9 rounded-lg px-3 text-xs flex items-center"
                    style={{ background: T.surface2, color: T.textMuted }}>
                    Ask the AI agent...
                  </div>
                  <button className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{ background: T.accent }}>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── SDK CODE TABS ── */}
        <SDKSection />

        {/* ── PRICING ── */}
        <PricingSection plans={plans} />

        {/* ── FAQ ── */}
        <FAQSection />

        {/* ── CTA BANNER ── */}
        <section className="py-24 px-4">
          <motion.div
            className="max-w-4xl mx-auto rounded-3xl relative overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Background layers */}
            <div className="absolute inset-0 rounded-3xl" style={{ background: T.surface, border: `1px solid color-mix(in srgb, var(--primary) 20%, transparent)` }} />
            <div className="absolute inset-0 rounded-3xl" style={{ background: "radial-gradient(ellipse at 50% 120%, color-mix(in srgb, var(--primary) 15%, transparent), transparent 70%)" }} />
            <GlowOrb x="20%" y="0%" color={T.accent} size={300} opacity={0.1} />
            <GlowOrb x="80%" y="100%" color="var(--ring)" size={300} opacity={0.06} />

            <div className="relative z-10 p-16 md:p-24 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 }}
              >
                <SectionLabel>Get Started Today</SectionLabel>
              </motion.div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-5 leading-[1.08]"
                style={{ color: T.textPrimary }}>
                Start protecting<br />your software today
              </h2>
              <p className="text-lg mb-10 max-w-md mx-auto" style={{ color: T.textSecondary }}>
                Join 2,000+ developers shipping with confidence. Free forever — upgrade when you're ready.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <button
                    className="inline-flex items-center gap-2 h-14 px-10 rounded-xl font-bold text-base transition-all duration-200 hover:gap-3 active:scale-[0.97]"
                    style={{ background: T.accent, color: "white", boxShadow: `0 8px 32px ${T.accentGlow}` }}
                  >
                    Get Started Free <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
                <Link href={getVal("watch_demo_url") || "#"}>
                  <button
                    className="inline-flex items-center gap-2 h-14 px-8 rounded-xl font-semibold text-base transition-all duration-200 hover:bg-white/8 active:scale-[0.97]"
                    style={{ background: "rgba(255,255,255,0.04)", color: T.textPrimary, border: `1px solid ${T.border}` }}
                  >
                    <Play className="w-4 h-4" style={{ color: T.accent }} fill="currentColor" />
                    Watch Demo
                  </button>
                </Link>
              </div>
              <p className="text-xs mt-5" style={{ color: T.textMuted }}>No credit card required · 5-minute setup · Cancel anytime</p>
            </div>
          </motion.div>
        </section>

      </main>

      <HoverFooter
        email={getVal("contact_email")}
        phone={getVal("contact_phone")}
        address={getVal("contact_address")}
        paragraph={getVal("landing_paragraph")}
        onSupportOpen={() => setIsSupportOpen(true)}
      />
    </div>
  );
}

// ─── SDK Section ──────────────────────────────────────────────────────────────
function SDKSection() {
  const [activeTab, setActiveTab] = useState("Python");
  const tabs = ["Python", "C#", "JavaScript", "C++"];

  const codeSnippets: any = {
    Python: `import authsys\n\n# Initialize with your API key\nclient = authsys.Client(api_key="sk_live_550e8400")\n\ntry:\n    # HWID-protected authentication\n    user = client.authenticate(\n        username="dev_rinox",\n        password="secure_password",\n        hwid=authsys.get_hwid()\n    )\n    print(f"Session: {user.session_id}")\nexcept authsys.AuthError as e:\n    print(f"Auth failed: {e.message}")`,
    "C#": `using AuthSys;\n\nvar auth = new AuthSysClient("sk_live_550e8400");\n\ntry {\n    var session = await auth.AuthenticateAsync(\n        username: "dev_rinox",\n        password: "secure_password",\n        hwid: HardwareID.Get()\n    );\n    Console.WriteLine($"Access granted: {session.Token}");\n} catch (AuthException ex) {\n    Console.WriteLine($"Security Error: {ex.Message}");\n}`,
    JavaScript: `import { AuthSys } from '@authsys/sdk';\n\nconst auth = new AuthSys('sk_live_550e8400');\n\nconst { user, error } = await auth.login({\n  username: 'dev_rinox',\n  password: 'secure_password',\n  hwid: await auth.getMachineId()\n});\n\nif (error) console.error(error);\nelse console.log('Authenticated:', user.id);`,
    "C++": `#include <authsys/security.hpp>\n\nauthsys::Client sdk("sk_live_550e8400");\n\nauto response = sdk.authenticate({\n    .username = "dev_rinox",\n    .password = "secure_password",\n    .hwid = authsys::generate_hwid()\n});\n\nif (response.ok()) {\n    std::cout << "Session: " << response.session_id;\n}`,
  };

  const langColors: any = {
    Python: "#3b9ddd",
    "C#": "#9b59b6",
    JavaScript: "#f0db4f",
    "C++": "#00599c",
  };

  return (
    <section className="py-24 px-4 relative border-y" style={{ borderColor: T.border }}>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${T.bg} 0%, ${T.surface}60 50%, ${T.bg} 100%)` }} />
      <div className="relative max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
        >
          <SectionLabel>Developer SDK</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4" style={{ color: T.textPrimary }}>
            Works with your stack
          </h2>
          <p style={{ color: T.textSecondary }}>Native SDKs for seamless integration in minutes.</p>
        </motion.div>

        <motion.div
          className="rounded-2xl border overflow-hidden"
          style={{ background: T.bg, borderColor: T.border, boxShadow: `0 40px 80px rgba(0,0,0,0.5)` }}
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Window chrome */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b" style={{ background: T.surface, borderColor: T.border }}>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Terminal className="w-4 h-4" style={{ color: T.textMuted }} />
              <span className="text-xs font-mono" style={{ color: T.textMuted }}>authsys_example.{activeTab === "C#" ? "cs" : activeTab === "JavaScript" ? "js" : activeTab === "Python" ? "py" : "cpp"}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b overflow-x-auto" style={{ background: T.surface, borderColor: T.border }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative px-6 py-3 text-sm font-semibold whitespace-nowrap transition-colors"
                style={{
                  color: activeTab === tab ? T.textPrimary : T.textMuted,
                  borderBottom: activeTab === tab ? `2px solid ${T.accent}` : "2px solid transparent",
                  background: activeTab === tab ? `color-mix(in srgb, var(--primary) 4%, transparent)` : "transparent",
                }}
              >
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: activeTab === tab ? langColors[tab] : "transparent" }} />
                  {tab}
                </span>
              </button>
            ))}
          </div>

          {/* Code */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-7"
            >
              <pre className="font-mono text-sm leading-relaxed overflow-x-auto" style={{ color: "var(--foreground)" }}>
                <code>{codeSnippets[activeTab]}</code>
              </pre>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Pricing Section ──────────────────────────────────────────────────────────
function PricingSection({ plans }: { plans: any[] }) {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 px-4 max-w-7xl mx-auto">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
      >
        <SectionLabel>Pricing</SectionLabel>
        <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-5" style={{ color: T.textPrimary }}>
          Flexible plans for every team
        </h2>
        <p className="text-sm max-w-lg mx-auto" style={{ color: T.textSecondary }}>
          Start free, scale fast. All plans include encryption, SSO, and community support.
        </p>
      </motion.div>

      <PricingGrid
        plans={plans}
        isYearly={yearly}
        onToggleYearly={setYearly}
        onSelectPlan={(plan) => window.location.href = '/register'}
      />

      <p className="text-center text-xs mt-8" style={{ color: T.textMuted }}>
        All plans include SSL encryption, 99.9% uptime SLA, and community support.
      </p>
    </section>
  );
}

// ─── FAQ Section ─────────────────────────────────────────────────────────────
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const faqs = [
    { q: "How does HWID locking work?", a: "We generate a unique fingerprint based on CPU, Motherboard, and MAC address. The license key is permanently bound to this hardware signature, making unauthorized transfers impossible." },
    { q: "Can I use this for private or commercial software?", a: "Yes. AuthSys is designed to be highly resistant to reverse engineering and memory tampering, making it suitable for both private tools and commercial applications." },
    { q: "What payment methods do you accept?", a: "We accept bKash, Nagad, Rocket, and all major credit cards via manual and automated processing. Crypto payments available on request." },
    { q: "How fast is the authentication response?", a: "Our global edge network delivers sub-50ms authentication responses on average. We maintain 99.9% uptime with active redundancy across multiple regions." },
    { q: "Is there an API I can integrate with?", a: "Yes — we offer REST APIs and native SDKs for Python, C#, JavaScript, and C++. Full documentation is available after signup." },
  ];

  return (
    <section className="py-20 px-4 max-w-3xl mx-auto">
      <motion.div
        className="text-center mb-14"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
      >
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: T.textPrimary }}>
          Frequently asked questions
        </h2>
      </motion.div>

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="rounded-2xl border overflow-hidden transition-colors"
            style={{
              background: openIdx === i ? T.surface2 : T.surface,
              borderColor: openIdx === i ? "color-mix(in srgb, var(--primary) 30%, transparent)" : T.border,
            }}
          >
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left transition-colors hover:bg-white/[0.02]"
            >
              <span className="font-semibold text-sm" style={{ color: T.textPrimary }}>{faq.q}</span>
              <motion.div 
                animate={{ rotate: openIdx === i ? 180 : 0 }} 
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <ChevronDown className="w-4 h-4 shrink-0" style={{ color: T.textMuted }} />
              </motion.div>
            </button>
            <AnimatePresence mode="wait">
              {openIdx === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ 
                    height: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                    opacity: { duration: 0.25, ease: [0.22, 1, 0.36, 1] }
                  }}
                  className="overflow-hidden"
                >
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="px-6 pb-5 text-sm leading-relaxed"
                    style={{ color: T.textSecondary }}
                  >
                    {faq.a}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  );
}