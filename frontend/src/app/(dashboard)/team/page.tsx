'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useDeveloperMe } from '@/hooks/use-developer-queries';
import { isFeatureLocked } from '@/lib/plan-access';
import PremiumLocked from '@/components/PremiumLocked';

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  admin:     { label: 'Admin',     color: '#f97316', bg: 'rgba(249,115,22,0.12)',  icon: 'shield_person'   },
  moderator: { label: 'Moderator', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', icon: 'manage_accounts' },
  support:   { label: 'Support',   color: '#34d399', bg: 'rgba(52,211,153,0.12)', icon: 'support_agent'   },
};

const AVATAR_PALETTES = [
  ['#6366f1','#818cf8'], ['#ec4899','#f472b6'], ['#f59e0b','#fbbf24'],
  ['#10b981','#34d399'], ['#3b82f6','#60a5fa'], ['#8b5cf6','#a78bfa'],
];
function getAvatarPalette(name: string) {
  return AVATAR_PALETTES[name.charCodeAt(0) % AVATAR_PALETTES.length];
}

function MemberCard({ member, onRemove }: { member: any; onRemove: (id: number) => void; index: number }) {
  const role = roleConfig[member.role] || roleConfig.support;
  const [from, to] = getAvatarPalette(member.username);
  const initials = member.username.substring(0, 2).toUpperCase();

  return (
    <div className="member-card">
      <div className="card-top-bar" style={{ background: `linear-gradient(90deg,${from},${to})` }} />
      <div className="card-inner">
        <div className="card-header">
          <div className="avatar-wrap" style={{ background: `linear-gradient(135deg,${from},${to})` }}>
            <span className="avatar-text">{initials}</span>
          </div>
          <span className="role-badge" style={{ background: role.bg, color: role.color }}>
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{role.icon}</span>
            {role.label}
          </span>
        </div>

        <h3 className="member-name">{member.username}</h3>
        <p className="member-email">{member.email}</p>

        <div className="card-stats">
          <span className="stat-chip">
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>calendar_today</span>
            {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="stat-chip">
            <span className="material-symbols-outlined" style={{ fontSize: 12, color: '#34d399' }}>circle</span>
            Active
          </span>
        </div>

        <div className="card-footer">
          <div className="perm-row">
            {['read','write', member.role !== 'support' ? 'admin' : null].filter(Boolean).map(p => (
              <span key={p as string} className="perm-chip">{p}</span>
            ))}
          </div>
          <button className="remove-btn" onClick={() => onRemove(member.id)}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>person_remove</span>
          </button>
        </div>
      </div>
      <div className="card-glow" style={{ background: `radial-gradient(circle at 50% 0%,${from}1a 0%,transparent 70%)` }} />
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon-wrap" style={{ background: `${color}18`, color }}>
        <span className="material-symbols-outlined" style={{ fontSize: 19 }}>{icon}</span>
      </div>
      <div>
        <div className="stat-val">{value}</div>
        <div className="stat-lbl">{label}</div>
      </div>
    </div>
  );
}

export default function TeamManagementPage() {
  const confirm = useConfirm();
  const { data: profile, isFetched: profileLoaded } = useDeveloperMe(true);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'support' });
  const [inviting, setInviting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const locked = profileLoaded && isFeatureLocked('developer', profile?.subscription_tier);

  const fetchTeam = async () => {
    try {
      const res = await api.get('/developer/team');
      setMembers(res.data);
    } catch (err) { console.error('Failed to fetch team', err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (profileLoaded && !locked) {
      fetchTeam();
    }
  }, [locked, profileLoaded]);
  useEffect(() => { if (showInviteModal) setTimeout(() => inputRef.current?.focus(), 100); }, [showInviteModal]);

  if (locked) return <PremiumLocked feature="Team Management" tier="Developer" />;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      await api.post('/developer/team/invite', inviteData);
      toast.success('Team member invited successfully!');
      setShowInviteModal(false);
      setInviteData({ email: '', role: 'support' });
      fetchTeam();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to invite member');
    } finally { setInviting(false); }
  };

  const removeMember = async (id: number) => {
    const ok = await confirm({
      title: 'Remove team member?',
      message: 'Are you sure you want to remove this member from your team?',
      confirmLabel: 'Yes, remove', cancelLabel: 'No, cancel', variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/developer/team/${id}`);
      toast.success('Member removed');
      fetchTeam();
    } catch { toast.error('Failed to remove member'); }
  };

  const filtered = members.filter(m =>
    (m.username.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())) &&
    (filterRole === 'all' || m.role === filterRole)
  );

  const stats = {
    total: members.length,
    admins: members.filter(m => m.role === 'admin').length,
    moderators: members.filter(m => m.role === 'moderator').length,
    support: members.filter(m => m.role === 'support').length,
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="tm-root">

        {/* Header */}
        <div className="tm-header">
          <div>
            <nav className="tm-breadcrumb">
              <span>Enterprise</span>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>chevron_right</span>
              <span className="tm-bc-active">Staff & Access</span>
            </nav>
            <h2 className="tm-title">Team Management</h2>
            <p className="tm-subtitle">Manage roles, permissions and access for your team</p>
          </div>
          <button className="tm-invite-btn" onClick={() => setShowInviteModal(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>person_add</span>
            Invite Member
          </button>
        </div>

        {/* Stats */}
        <div className="tm-stats">
          <StatCard icon="groups"          value={stats.total}      label="Total Members" color="#a78bfa" />
          <StatCard icon="shield_person"   value={stats.admins}     label="Admins"        color="#f97316" />
          <StatCard icon="manage_accounts" value={stats.moderators} label="Moderators"    color="#60a5fa" />
          <StatCard icon="support_agent"   value={stats.support}    label="Support"       color="#34d399" />
        </div>

        {/* Toolbar */}
        <div className="tm-toolbar">
          <div className="tm-search-wrap">
            <span className="material-symbols-outlined tm-search-icon">search</span>
            <input className="tm-search" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="tm-search-clear" onClick={() => setSearch('')}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
              </button>
            )}
          </div>
          <div className="tm-filters">
            {['all','admin','moderator','support'].map(r => (
              <button key={r} className={`tm-filter-pill ${filterRole === r ? 'active' : ''}`} onClick={() => setFilterRole(r)}>
                {r === 'all' ? 'All Roles' : roleConfig[r]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="tm-grid">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="member-card" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <div className="card-top-bar" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="card-inner">
                  <div className="card-header">
                    <div className="skeleton" style={{ width: 46, height: 46, borderRadius: 13 }} />
                    <div className="skeleton" style={{ width: 76, height: 18, borderRadius: 7 }} />
                  </div>
                  <div className="skeleton" style={{ width: '60%', height: 16, borderRadius: 6, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: '85%', height: 12, borderRadius: 6, marginBottom: 12 }} />
                  <div className="card-stats">
                    <div className="skeleton" style={{ width: 80, height: 22, borderRadius: 6 }} />
                    <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 6 }} />
                  </div>
                  <div className="card-footer">
                    <div className="perm-row">
                      <div className="skeleton" style={{ width: 36, height: 18, borderRadius: 4 }} />
                      <div className="skeleton" style={{ width: 42, height: 18, borderRadius: 4 }} />
                    </div>
                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="tm-grid">
            {filtered.map((m, i) => <MemberCard key={m.id} member={m} onRemove={removeMember} index={i} />)}
          </div>
        ) : (
          <div className="tm-empty">
            <div className="tm-empty-icon-wrap">
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'rgba(255,255,255,0.15)' }}>group_off</span>
              <div className="tm-empty-ring" />
            </div>
            <h3 className="tm-empty-title">{search || filterRole !== 'all' ? 'No members found' : 'No team members yet'}</h3>
            <p className="tm-empty-sub">{search || filterRole !== 'all' ? 'Try adjusting your search or filter' : 'Invite your first colleague to get started'}</p>
            {!search && filterRole === 'all' && (
              <button className="tm-invite-btn-sm" onClick={() => setShowInviteModal(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>person_add</span>Invite Member
              </button>
            )}
          </div>
        )}

        {/* Modal */}
        {showInviteModal && (
          <div className="tm-overlay" onClick={() => setShowInviteModal(false)}>
            <div className="tm-modal" onClick={e => e.stopPropagation()}>
              <div className="tm-modal-header">
                <div className="tm-modal-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: 19, color: 'var(--primary)' }}>person_add</span>
                </div>
                <div>
                  <h3 className="tm-modal-title">Invite Member</h3>
                  <p className="tm-modal-sub">Add a staff member to your development team</p>
                </div>
                <button className="tm-modal-close" onClick={() => setShowInviteModal(false)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                </button>
              </div>

              <form onSubmit={handleInvite}>
                <div className="tm-field">
                  <label className="tm-label">Email Address</label>
                  <div className="tm-input-wrap">
                    <span className="material-symbols-outlined tm-input-icon">alternate_email</span>
                    <input ref={inputRef} type="email" required value={inviteData.email}
                      onChange={e => setInviteData({...inviteData, email: e.target.value})}
                      className="tm-input" placeholder="staff@example.com" />
                  </div>
                </div>

                <div className="tm-field">
                  <label className="tm-label">Assigned Role</label>
                  <div className="tm-role-grid">
                    {['support','moderator','admin'].map(r => {
                      const cfg = roleConfig[r];
                      const sel = inviteData.role === r;
                      return (
                        <button type="button" key={r} className={`tm-role-opt ${sel ? 'sel' : ''}`}
                          style={sel ? { borderColor: cfg.color, background: cfg.bg } as React.CSSProperties : {}}
                          onClick={() => setInviteData({...inviteData, role: r})}>
                          <span className="material-symbols-outlined" style={{ fontSize: 19, color: cfg.color }}>{cfg.icon}</span>
                          <span style={sel ? { color: cfg.color } as React.CSSProperties : {}}>{cfg.label}</span>
                          {sel && <span className="material-symbols-outlined tm-role-check" style={{ color: cfg.color }}>check_circle</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="tm-modal-actions">
                  <button type="button" className="tm-btn-cancel" onClick={() => setShowInviteModal(false)}>Cancel</button>
                  <button type="submit" className="tm-btn-submit" disabled={inviting}>
                    {inviting ? <><span className="tm-spinner" />Sending...</> : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>Send Invite</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const CSS = `
.tm-root {
  --bdr: rgba(255,255,255,0.07);
  --sur: rgba(255,255,255,0.03);
  padding: 1.5rem 0;
}

.skeleton {
  background: linear-gradient(110deg, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 70%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* HEADER */
.tm-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  flex-wrap: wrap; gap: 16px; margin-bottom: 2rem;
}
.tm-breadcrumb {
  display: flex; align-items: center; gap: 4px; margin-bottom: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--muted-foreground);
}
.tm-bc-active { color: var(--primary); }
.tm-title {
  font-size: 2.25rem; font-weight: 700; color: var(--foreground);
  margin: 0 0 6px; line-height: 1.1; letter-spacing: -0.02em;
}
.tm-subtitle { font-size: 13px; color: var(--muted-foreground); margin: 0; }

.tm-invite-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 22px; border-radius: 12px;
  border: 1px solid rgba(167,139,250,0.35);
  background: rgba(167,139,250,0.1);
  color: var(--primary); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
  box-shadow: 0 0 28px rgba(167,139,250,0.08);
}
.tm-invite-btn:hover { background: rgba(167,139,250,0.18); transform: translateY(-1px); box-shadow: 0 0 36px rgba(167,139,250,0.18); }
.tm-invite-btn:active { transform: scale(0.97); }

/* STATS */
.tm-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px,1fr));
  gap: 12px; margin-bottom: 1.75rem;
}
.stat-card {
  display: flex; align-items: center; gap: 14px;
  background: var(--sur); border: 1px solid var(--bdr);
  border-radius: 16px; padding: 16px 18px;
  transition: border-color 0.2s, transform 0.2s;
}
.stat-card:hover { border-color: rgba(255,255,255,0.12); transform: translateY(-2px); }
.stat-icon-wrap {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.stat-val { font-size: 20px; font-weight: 700; color: var(--foreground); line-height: 1; }
.stat-lbl { font-size: 11px; color: var(--muted-foreground); margin-top: 3px; }

/* TOOLBAR */
.tm-toolbar {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 1.5rem;
}
.tm-search-wrap { flex: 1; min-width: 220px; position: relative; display: flex; align-items: center; }
.tm-search-icon { position: absolute; left: 13px; font-size: 17px !important; color: var(--muted-foreground); }
.tm-search {
  width: 100%; background: var(--sur); border: 1px solid var(--bdr);
  border-radius: 11px; padding: 10px 36px 10px 40px;
  color: var(--foreground); font-size: 13px; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.tm-search::placeholder { color: var(--muted-foreground); opacity: 0.5; }
.tm-search:focus { border-color: rgba(167,139,250,0.4); box-shadow: 0 0 0 3px rgba(167,139,250,0.08); }
.tm-search-clear {
  position: absolute; right: 10px; background: none; border: none;
  cursor: pointer; color: var(--muted-foreground); display: flex; align-items: center;
  transition: color 0.15s;
}
.tm-search-clear:hover { color: var(--foreground); }
.tm-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.tm-filter-pill {
  padding: 6px 14px; border-radius: 12px; font-size: 11px; font-weight: 700;
  border: 1px solid var(--bdr); background: var(--sur);
  color: var(--muted-foreground); cursor: pointer; transition: all 0.17s;
}
.tm-filter-pill:hover { color: var(--foreground); border-color: rgba(255,255,255,0.14); }
.tm-filter-pill.active { background: rgba(167,139,250,0.1); border-color: rgba(167,139,250,0.35); color: var(--primary); }

/* GRID */
.tm-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(290px,1fr)); gap: 16px;
}
.member-card {
  position: relative; border-radius: 22px; overflow: hidden;
  border: 1px solid var(--bdr); background: var(--sur);
  transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s;
}
.member-card:hover {
  border-color: rgba(167,139,250,0.22);
  transform: translateY(-3px);
  box-shadow: 0 16px 48px -10px rgba(0,0,0,0.45);
}
.card-top-bar { height: 2.5px; }
.card-inner { padding: 20px 20px 16px; position: relative; z-index: 1; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.avatar-wrap {
  width: 46px; height: 46px; border-radius: 13px;
  display: flex; align-items: center; justify-content: center;
}
.avatar-text { font-size: 15px; font-weight: 700; color: #fff; letter-spacing: 0.02em; }
.role-badge {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 7px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
}
.member-name { font-size: 15px; font-weight: 700; color: var(--foreground); margin: 0 0 3px; }
.member-email { font-size: 11px; color: var(--muted-foreground); margin: 0 0 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-stats { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.stat-chip {
  display: flex; align-items: center; gap: 4px;
  background: rgba(255,255,255,0.04); border: 1px solid var(--bdr);
  border-radius: 6px; padding: 4px 9px; font-size: 10px; color: var(--muted-foreground);
}
.card-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 12px; border-top: 1px solid var(--bdr);
}
.perm-row { display: flex; gap: 5px; }
.perm-chip {
  font-size: 8px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  background: rgba(255,255,255,0.04); border: 1px solid var(--bdr);
  border-radius: 4px; padding: 3px 7px; color: var(--muted-foreground);
}
.remove-btn {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid transparent;
  background: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: rgba(248,113,113,0.4); transition: all 0.17s;
}
.remove-btn:hover { color: #f87171; background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.18); }
.card-glow { position: absolute; inset: 0; pointer-events: none; }

/* EMPTY */
.tm-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 70px 20px; text-align: center; gap: 10px;
  animation: tmFadeUp 0.4s ease;
}
.tm-empty-icon-wrap {
  position: relative; width: 64px; height: 64px; margin-bottom: 6px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.04); border: 1px solid var(--bdr); border-radius: 50%;
}
.tm-empty-ring {
  position: absolute; inset: -7px; border-radius: 50%;
  border: 1px dashed rgba(255,255,255,0.07);
  animation: tmSpin 14s linear infinite;
}
.tm-empty-title { font-size: 17px; font-weight: 700; color: var(--foreground); margin: 0; }
.tm-empty-sub { font-size: 13px; color: var(--muted-foreground); margin: 0; }
.tm-invite-btn-sm {
  display: flex; align-items: center; gap: 6px; margin-top: 6px;
  padding: 9px 18px; border-radius: 10px;
  border: 1px solid rgba(167,139,250,0.3); background: rgba(167,139,250,0.08);
  color: var(--primary); font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.tm-invite-btn-sm:hover { background: rgba(167,139,250,0.15); transform: translateY(-1px); }

/* MODAL */
.tm-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.72); backdrop-filter: blur(14px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
  animation: tmFadeIn 0.2s ease;
}
.tm-modal {
  width: 100%; max-width: 460px;
  background: #0f0f17; border: 1px solid rgba(255,255,255,0.09);
  border-radius: 26px; padding: 26px;
  animation: tmModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1);
  box-shadow: 0 32px 80px rgba(0,0,0,0.55);
  position: relative; overflow: hidden;
}
.tm-modal::before {
  content:''; position:absolute; top:0; left:0; right:0; height:180px;
  background: radial-gradient(ellipse at 50% -10%, rgba(167,139,250,0.1), transparent 70%);
  pointer-events:none;
}
.tm-modal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; position: relative; }
.tm-modal-icon {
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.2);
  display: flex; align-items: center; justify-content: center;
}
.tm-modal-title { font-size: 18px; font-weight: 700; color: var(--foreground); margin: 0 0 2px; }
.tm-modal-sub { font-size: 12px; color: var(--muted-foreground); margin: 0; }
.tm-modal-close {
  margin-left: auto; width: 30px; height: 30px; border-radius: 8px;
  border: 1px solid var(--bdr); background: none; cursor: pointer;
  color: var(--muted-foreground); display: flex; align-items: center; justify-content: center;
  transition: all 0.17s;
}
.tm-modal-close:hover { color: var(--foreground); background: rgba(255,255,255,0.06); }
.tm-field { margin-bottom: 20px; position: relative; }
.tm-label {
  display: block; font-size: 9px; font-weight: 700; letter-spacing: 0.13em;
  text-transform: uppercase; color: var(--muted-foreground); margin-bottom: 9px;
}
.tm-input-wrap { position: relative; display: flex; align-items: center; }
.tm-input-icon { position: absolute; left: 13px; font-size: 16px !important; color: var(--muted-foreground); opacity: 0.5; }
.tm-input {
  width: 100%; background: rgba(255,255,255,0.04); border: 1px solid var(--bdr);
  border-radius: 12px; padding: 12px 14px 12px 42px;
  color: var(--foreground); font-size: 13px; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
}
.tm-input::placeholder { color: var(--muted-foreground); opacity: 0.4; }
.tm-input:focus { border-color: rgba(167,139,250,0.45); box-shadow: 0 0 0 3px rgba(167,139,250,0.09); }
.tm-role-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
.tm-role-opt {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px; border-radius: 12px; border: 1px solid var(--bdr);
  background: rgba(255,255,255,0.03); cursor: pointer; transition: all 0.18s;
  font-size: 11px; font-weight: 700; color: var(--muted-foreground);
  position: relative;
}
.tm-role-opt:hover { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.05); }
.tm-role-opt.sel { transform: translateY(-2px); }
.tm-role-check { position: absolute; top: 7px; right: 7px; font-size: 13px !important; }
.tm-modal-actions { display: flex; gap: 10px; margin-top: 24px; }
.tm-btn-cancel {
  flex: 1; padding: 12px; border-radius: 12px;
  border: 1px solid var(--bdr); background: rgba(255,255,255,0.04);
  color: var(--muted-foreground); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.17s;
}
.tm-btn-cancel:hover { background: rgba(255,255,255,0.07); color: var(--foreground); }
.tm-btn-submit {
  flex: 1; padding: 12px; border-radius: 12px;
  background: linear-gradient(135deg, #a78bfa, #818cf8); border: none;
  color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 7px;
  transition: all 0.2s; box-shadow: 0 4px 18px rgba(167,139,250,0.28);
}
.tm-btn-submit:hover { box-shadow: 0 6px 24px rgba(167,139,250,0.42); transform: translateY(-1px); }
.tm-btn-submit:active { transform: scale(0.97); }
.tm-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.tm-spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  animation: tmSpin 0.7s linear infinite; display: inline-block;
}
@keyframes tmFadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes tmModalIn { from { opacity:0; transform:scale(0.93) translateY(14px); } to { opacity:1; transform:scale(1) translateY(0); } }
`;