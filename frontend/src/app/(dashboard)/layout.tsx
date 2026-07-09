'use client';
import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import dynamic from 'next/dynamic';
import { useApps, useDeveloperMe } from '@/hooks/use-developer-queries';
import { isFeatureLocked, tierDisplayName, getTierLevel } from '@/lib/plan-access';
import { getAvatarPalette, getInitials } from '@/lib/avatar';
import { PlanBadge } from '@/components/ui/plan-badge';
const AIChatWidget = dynamic(() => import('@/components/dashboard/AIChatWidget'), { ssr: false });
const CommandPalette = dynamic(() => import('@/components/dashboard/CommandPalette'), { ssr: false });
const NotificationBell = dynamic(() => import('@/components/notifications/NotificationBell'), { ssr: false });

const navItems = [
  { name: 'Overview', icon: 'dashboard', href: '/dashboard', tier: 'tester' },
  { name: 'Applications', icon: 'apps', href: '/applications', tier: 'tester' },
  { name: 'License Keys', icon: 'vpn_key', href: '/license-keys', tier: 'tester' },
  { name: 'Users', icon: 'group', href: '/users', tier: 'tester' },
  { name: 'Analytics', icon: 'insights', href: '/analytics', tier: 'tester' },
  { name: 'Blacklist', icon: 'block', href: '/blacklist', tier: 'tester' },
  { name: 'Variables', icon: 'code', href: '/variables', tier: 'tester' },
  // Developer Tier Features
  { name: 'Team', icon: 'groups', href: '/team', tier: 'developer' },
  { name: 'Organization', icon: 'corporate_fare', href: '/organization', tier: 'developer' },
  
  // Seller Tier Features
  { name: 'Chatrooms', icon: 'forum', href: '/chatrooms', tier: 'seller' },
  { name: 'Discord Bot', icon: 'smart_toy', href: '/discord-bot', tier: 'seller' },
  { name: 'Telegram Bot', icon: 'send', href: '/telegram-bot', tier: 'seller' },
  { name: 'Seller API', icon: 'api', href: '/seller-api', tier: 'seller' },

  // Premium Features
  { name: 'Security', icon: 'security', href: '/security', tier: 'developer' },
  { name: 'Scheduled', icon: 'schedule', href: '/scheduled', tier: 'seller' },

  { name: 'Audit Logs', icon: 'history', href: '/audit-logs', tier: 'tester' },
  { name: 'Settings', icon: 'settings', href: '/settings', tier: 'tester' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, selectedAppId, setSelectedAppId, logout, token } = useAuthStore();
  let { sidebar: sidebarPref, setSidebar: setSidebarPref } = useUIStore();
  // Migrate removed 'collapsed' state to 'expanded'
  if ((sidebarPref as string) === 'collapsed') {
    setSidebarPref('expanded');
    sidebarPref = 'expanded';
  }
  const hasToken = Boolean(token);
  const { data: apps = [] } = useApps(hasToken);
  const { data: profile, refetch: refetchProfile, isFetching: profileFetching } = useDeveloperMe(hasToken);
  const activeUser = profile ?? user;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarIcons = sidebarPref === 'icons';
  const sbCompact = sidebarIcons;

  useEffect(() => {
    setMounted(true);
    if (isLoggingOut) return;

    if (profile) {
      setUser(profile);
    }
  }, [profile, setUser, user, isLoggingOut]);

  useEffect(() => {
    if (!mounted || isLoggingOut) return;
    if (!token) {
      router.replace('/login');
    }
  }, [mounted, token, router, isLoggingOut]);

  useEffect(() => {
    if (apps.length === 0) return;
    const valid = selectedAppId && apps.some((a) => a.id === selectedAppId);
    if (!valid) {
      setSelectedAppId(apps[0].id);
    }
  }, [apps, selectedAppId, setSelectedAppId]);

  useEffect(() => {
    if (!hasToken) return;
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 1) {
        api.get(`/developer/analytics/search?q=${searchQuery}`).then(res => {
          setSearchResults(res.data);
          setShowSearch(true);
        });
      } else {
        setShowSearch(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, hasToken]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    router.replace('/login');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[var(--muted-foreground)] font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-body-md text-[var(--foreground)] selection:bg-[var(--accent-opacity-15)] min-h-screen bg-[var(--background)] overflow-visible">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--accent-opacity-8)] blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--accent-opacity-8)] blur-[150px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[30%] left-[50%] w-[30%] h-[30%] rounded-full bg-[var(--ring)]/3 blur-[100px] animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[55] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Lock body scroll when mobile sidebar is open */}
      {sidebarOpen && <style>{`body { overflow: hidden; }`}</style>}

      <aside className={`fixed left-0 top-0 max-h-screen h-dvh border-r border-[var(--border)] bg-[var(--glass-bg)] backdrop-blur-xl flex flex-col shadow-2xl z-[60] transition-all duration-300 lg:translate-x-0 ${sidebarIcons ? 'w-[72px]' : 'w-[260px]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`pt-8 pb-4 flex justify-between items-center shrink-0 ${sbCompact ? 'px-2' : 'px-5'}`}>
          <div className={sbCompact ? 'w-full flex justify-center' : ''}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center shadow-lg shadow-[var(--accent-opacity-20)] shrink-0">
                <span className="material-symbols-outlined text-[var(--primary-foreground)] font-black text-xl">shield</span>
              </div>
              {!sbCompact && (
                <div>
                  <h1 className="font-black text-white tracking-tighter text-xl leading-none">RinoxAuth</h1>
                  <p className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-[0.2em] mt-1 font-bold opacity-70">Enterprise Security</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-[var(--muted-foreground)]"
              onClick={() => setSidebarPref(sidebarIcons ? 'expanded' : 'icons')}
              title={sidebarIcons ? 'Expand sidebar' : 'Icons only'}
            >
              <span className="material-symbols-outlined text-sm">{sidebarIcons ? 'chevron_right' : 'chevron_left'}</span>
            </button>
            <button 
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-[var(--muted-foreground)]"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto custom-scrollbar min-h-0 overscroll-contain">
          <div className={`py-1 ${sbCompact ? 'px-1' : 'px-2'}`}>
            {mounted && navItems.map((item, idx) => {
              const userTier = activeUser?.subscription_tier || activeUser?.plan?.name || 'tester';
              const locked = isFeatureLocked(item.tier as 'tester' | 'developer' | 'seller', userTier);
              const isActive = pathname === item.href;
              const content = (
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.25, ease: 'easeOut' }}
                  className={`flex items-center gap-3 w-full relative group sidebar-item ${
                    sbCompact ? 'justify-center p-2.5' : 'px-5 py-2.5'
                  } ${
                    isActive && !locked ? 'sidebar-item-active' : ''
                  } ${locked ? 'sidebar-item-locked' : ''}`}
                >
                  <span className="material-symbols-outlined text-[18px]" style={isActive && !locked ? { fontVariationSettings: "'FILL' 1" } : locked ? { color: 'var(--primary)', fontSize: '16px' } : {}}>{locked ? 'lock' : item.icon}</span>
                  {!sbCompact && <span className="text-sm font-semibold tracking-tight whitespace-nowrap">{item.name}</span>}
                  {!sbCompact && locked && (
                    <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider sidebar-pro-badge">
                      Pro
                    </span>
                  )}
                  {sbCompact && locked && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full sidebar-pro-dot" />
                  )}
                </motion.div>
              );
              return (
                <Link key={item.name} href={locked ? `/premium-locked?feature=${encodeURIComponent(item.name)}&tier=${item.tier}` : item.href} onClick={() => setSidebarOpen(false)} className="block sidebar-link">
                  {content}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-[var(--border)] pb-6 pt-3 px-2">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-all duration-200 rounded-lg sidebar-item ${sbCompact ? 'justify-center p-2.5' : 'px-4 py-2.5'}`}
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            {!sbCompact && <span className="text-sm font-semibold tracking-tight">Sign Out</span>}
          </button>
        </div>
      </aside>

      <header className={`fixed top-0 right-0 top-navbar flex justify-between items-center px-3 lg:px-8 z-50 transition-all duration-300 ${sidebarIcons ? 'lg:w-[calc(100%-72px)]' : 'lg:w-[calc(100%-260px)]'}`}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 rounded-xl bg-[var(--glass-bg)] border border-[var(--border)] text-[var(--muted-foreground)]"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="material-symbols-outlined text-lg">menu</span>
          </button>
          
          <div className="relative hidden sm:block shrink-0">
             <select
              value={selectedAppId || ''}
              onChange={(e) => setSelectedAppId(parseInt(e.target.value))}
              className="appearance-none bg-[var(--glass-bg)] border border-[var(--border)] rounded-xl px-4 py-2 pr-10 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]/40 transition-all cursor-pointer hover:bg-[var(--accent-opacity-8)]"
             >
               <option value="" disabled>Select Application</option>
               {apps.map(app => (
                 <option key={app.id} value={app.id} className="bg-[var(--card)] text-[var(--foreground)]">{app.name.toUpperCase()}</option>
               ))}
             </select>
             <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--primary)] text-sm">expand_more</span>
          </div>
          <div className="h-6 w-px bg-[var(--border)] hidden sm:block shrink-0"></div>
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary)] text-[18px]">search</span>
            <input
              className="w-full bg-[var(--glass-bg)] border border-[var(--border)] rounded-full pl-10 pr-4 py-1.5 text-xs font-medium focus:ring-1 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]/40 focus:bg-[var(--card)] placeholder:text-[var(--muted-foreground)] outline-none"
              placeholder="Search..."
              type="text"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchQuery.length > 1) setShowSearch(true); }}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            />
            {showSearch && searchResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-2xl z-[100] p-3 max-h-[320px] overflow-y-auto custom-scrollbar">
                {searchResults.apps?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted-foreground)] px-2 mb-1">Applications</p>
                    {searchResults.apps.map((app: any) => (
                      <button
                        key={app.id}
                        onClick={() => router.push(`/applications/${app.id}`)}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--accent-opacity-8)] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm text-[var(--primary)]">apps</span>
                        <span className="truncate">{app.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.keys?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted-foreground)] px-2 mb-1">License Keys</p>
                    {searchResults.keys.map((keyObj: any) => (
                      <button
                        key={keyObj.id}
                        onClick={() => router.push('/license-keys')}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--accent-opacity-8)] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm text-[var(--primary)]">vpn_key</span>
                        <span className="font-mono truncate">{keyObj.key_value}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.users?.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted-foreground)] px-2 mb-1">Users</p>
                    {searchResults.users.map((u: any) => (
                      <button
                        key={u.id}
                        onClick={() => router.push('/users')}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--accent-opacity-8)] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm text-[var(--primary)]">group</span>
                        <span className="truncate">{u.username}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!searchResults.apps?.length && !searchResults.keys?.length && !searchResults.users?.length && (
                  <p className="text-center text-xs text-[var(--muted-foreground)] py-3 font-medium">No results found</p>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {mounted && activeUser && (
            <button
              type="button"
              onClick={() => refetchProfile()}
              className="hidden sm:flex items-center gap-2.5 px-2 py-0.5"
            >
              <PlanBadge tier={activeUser?.subscription_tier} planName={activeUser?.plan?.name} />
            </button>
          )}
          <NotificationBell />
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="text-right hidden md:block">
              <p className="text-[11px] font-black text-[var(--foreground)] leading-none mb-1">
                {mounted ? (activeUser?.username?.toUpperCase() || 'DEVELOPER') : 'DEVELOPER'}
              </p>
              <p className="text-[9px] text-[var(--muted-foreground)] font-bold tracking-tight">
                {mounted ? (activeUser?.email || '') : ''}
              </p>
            </div>
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-sm text-[var(--primary-foreground)] uppercase shadow-lg overflow-hidden shrink-0"
              suppressHydrationWarning
              style={mounted ? (activeUser?.avatar_url ? {} : { backgroundImage: `linear-gradient(135deg, ${getAvatarPalette(activeUser?.username || '')[0]}, ${getAvatarPalette(activeUser?.username || '')[1]})` }) : {}}
            >
              {mounted && activeUser?.avatar_url ? (
                <img src={activeUser.avatar_url} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                mounted ? getInitials(activeUser?.username || '') : 'AD'
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={`transition-all duration-300 mt-[56px] pt-10 p-4 lg:p-10 min-h-screen relative z-10 overflow-visible ${sidebarOpen ? 'blur-md lg:blur-none' : ''} ${sidebarIcons ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}>
        <div className="max-w-[1600px] mx-auto overflow-visible">
          {children}
        </div>
      </main>


      <AIChatWidget />
      <CommandPalette />
    </div>
  );
}
