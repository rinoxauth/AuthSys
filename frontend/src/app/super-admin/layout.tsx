'use client';
import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';

interface NavGroup { label: string; items: { name: string; icon: string; href: string }[] }

const navGroups: NavGroup[] = [
  {
    label: 'MONITORING',
    items: [
      { name: 'Overview', icon: 'dashboard', href: '/super-admin/dashboard' },
      { name: 'Platform Status', icon: 'monitor_heart', href: '/super-admin/status' },
      { name: 'Audit Logs', icon: 'history', href: '/super-admin/audit-logs' },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { name: 'Developers', icon: 'engineering', href: '/super-admin/developers' },
      { name: 'Applications', icon: 'apps', href: '/super-admin/applications' },
      { name: 'End Users', icon: 'group', href: '/super-admin/end-users' },
      { name: 'Admins', icon: 'admin_panel_settings', href: '/super-admin/admins' },
    ],
  },
  {
    label: 'BILLING',
    items: [
      { name: 'Pricing Plans', icon: 'card_membership', href: '/super-admin/plans' },
      { name: 'Custom Plans', icon: 'tune', href: '/super-admin/custom-plans' },
      { name: 'Payments', icon: 'payments', href: '/super-admin/payments' },
    ],
  },
  {
    label: 'PLATFORM',
    items: [
      { name: 'Rate Limits', icon: 'speed', href: '/super-admin/rate-limits' },
      { name: 'SDKs', icon: 'deployed_code', href: '/super-admin/sdk' },
      { name: 'AI Control', icon: 'smart_toy', href: '/super-admin/ai' },
      { name: 'Backup & Restore', icon: 'backup', href: '/super-admin/backup' },
      { name: 'Settings', icon: 'settings', href: '/super-admin/settings' },
    ],
  },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('admin_token');
    if (!token && pathname !== '/super-admin/login') {
      router.push('/super-admin/login');
    }
  }, [pathname]);

  if (!mounted) return null;
  if (pathname === '/super-admin/login') return <>{children}</>;

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/super-admin/login');
  };

  return (
    <div className="font-body-md text-[var(--foreground)] selection:bg-[var(--primary)]/30 min-h-screen bg-[var(--background)]">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--primary)]/5 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--primary)]/5 blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

       {/* Mobile Overlay */}
       {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[55] lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 h-full border-r border-white/5 bg-[var(--card)]/90 lg:bg-[var(--card)]/40 backdrop-blur-2xl flex flex-col py-5 shadow-2xl z-[60] transition-all duration-300 lg:translate-x-0 w-[260px] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-6 mb-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/60 flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
              <span className="material-symbols-outlined text-black font-black text-xl">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="font-black text-white tracking-tighter text-xl leading-none">SuperAdmin</h1>
              <p className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-[0.2em] mt-1 font-bold opacity-70">Core Protocol</p>
            </div>
          </div>
          <button 
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-[var(--muted-foreground)]"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        
        <nav className="flex-1 px-3 space-y-5 overflow-y-auto custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-4 mb-1.5 text-[9px] font-black text-[var(--muted-foreground)] uppercase tracking-[0.2em] opacity-50">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border ${
                        isActive 
                          ? 'text-[var(--primary)] font-bold bg-[var(--primary)]/10 active-nav-glow border-[var(--primary)]/20' 
                          : 'text-[var(--muted-foreground)] hover:text-white hover:bg-white/5 border-transparent'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
                      <span className="text-sm font-semibold tracking-tight">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 mt-auto pt-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-bold">Terminate Session</span>
          </button>
        </div>
      </aside>

      <header className="fixed top-0 right-0 lg:w-[calc(100%-260px)] w-full h-16 bg-[var(--background)]/95 backdrop-blur-xl border-b border-white/5 flex justify-between items-center px-4 lg:px-8 z-50">
        <div className="flex items-center gap-4">
          <button 
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-[var(--muted-foreground)]"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h2 className="text-sm font-black text-white uppercase tracking-[0.15em]">
            {(() => {
              const match = navGroups.flatMap(g => g.items).find(i => pathname === i.href || pathname.startsWith(i.href + '/'));
              return match?.name || 'Admin Console';
            })()}
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">System Online</span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)]/20 to-transparent flex items-center justify-center font-black text-sm text-[var(--primary)] uppercase shadow-lg shadow-[var(--primary)]/10">
             AD
          </div>
        </div>
      </header>

      <main className="lg:ml-[260px] pt-16 px-4 lg:px-8 py-4 lg:py-6 min-h-screen">
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
      </main>
    </div>
  );
}
