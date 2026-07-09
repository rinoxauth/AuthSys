/** Subscription tier levels — higher unlocks more dashboard features */

export type NavTier = 'tester' | 'developer' | 'seller';

const TIER_LEVEL: Record<string, number> = {
  free: 0,
  tester: 1,
  test: 1,
  developer: 2,
  dev: 2,
  pro: 3,
  seller: 3,
  enterprise: 4,
  ent: 4,
};

const NAV_REQUIRED_LEVEL: Record<NavTier, number> = {
  tester: 0,
  developer: 2,
  seller: 3,
};

export function getTierLevel(tier?: string | null): number {
  if (!tier) return 1;
  const key = tier.toLowerCase().trim();
  if (TIER_LEVEL[key] !== undefined) return TIER_LEVEL[key];
  if (key.includes('enterprise') || key.includes('ent')) return 4;
  if (key.includes('seller')) return 3;
  if (key.includes('developer') || key.includes('dev')) return 2;
  return 1;
}

export function isFeatureLocked(navTier: NavTier, userTier?: string | null): boolean {
  const level = getTierLevel(userTier);
  return level < NAV_REQUIRED_LEVEL[navTier];
}

export function canAccessNav(
  navTier: NavTier,
  userTier?: string | null,
  planFeatures?: string[],
  navItemName?: string,
): boolean {
  const level = getTierLevel(userTier);
  if (level >= NAV_REQUIRED_LEVEL[navTier]) return true;

  if (planFeatures?.length && navItemName) {
    const needle = navItemName.toLowerCase();
    return planFeatures.some((f) => {
      const feat = f.toLowerCase();
      return feat.includes(needle) || needle.includes(feat.split(' ')[0]);
    });
  }

  return false;
}

export function tierDisplayName(tier?: string | null, planName?: string | null): string {
  if (planName) return planName;
  if (!tier) return 'Tester';
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function canAccessAI(userTier?: string | null): boolean {
  if (!userTier) return false;
  const tier = userTier.toLowerCase().trim();
  return tier === 'enterprise' || tier === 'seller';
}

// ─── Plan badge helpers ────────────────────────────────────────────────────

export const PLAN_STYLES: Record<string, { bg: string; border: string; color: string; icon: string; label: string }> = {
  free:   { bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', color: 'text-zinc-400', icon: 'workspace_premium', label: 'Free' },
  tester: { bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', color: 'text-zinc-400', icon: 'science',            label: 'Tester' },
  dev:    { bg: 'bg-sky-500/10',  border: 'border-sky-500/20',  color: 'text-sky-400',  icon: 'code',               label: 'Developer' },
  developer: { bg: 'bg-sky-500/10',  border: 'border-sky-500/20',  color: 'text-sky-400',  icon: 'code',               label: 'Developer' },
  pro:    { bg: 'bg-violet-500/10', border: 'border-violet-500/20', color: 'text-violet-400', icon: 'rocket_launch',   label: 'Pro' },
  seller: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', color: 'text-amber-400', icon: 'store',            label: 'Seller' },
  enterprise: { bg: 'bg-gradient-to-r from-amber-500/20 to-rose-500/20', border: 'border-amber-500/30', color: 'text-amber-300', icon: 'workspace_premium', label: 'Enterprise' },
};

export function getPlanKey(tier?: string | null): string {
  if (!tier) return 'tester';
  const key = tier.toLowerCase().trim();
  if (key === 'ent' || key.includes('enterprise')) return 'enterprise';
  if (key === 'dev' || key === 'developer') return 'developer';
  if (key === 'pro') return 'pro';
  if (key === 'seller') return 'seller';
  if (key === 'free') return 'free';
  return 'tester';
}
