import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Activity, ChevronDown, CircleHelp, Database, FileCheck2, Gauge, LogOut, Menu, Search, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import type { Role, User } from '../types';

const nav = [
  { to: '/', label: 'Command center', icon: Gauge, roles: ['operator', 'reviewer', 'consumer'] },
  { to: '/ingestion', label: 'Data intake', icon: UploadCloud, roles: ['operator'] },
  { to: '/exceptions', label: 'Exception queue', icon: Sparkles, roles: ['operator', 'reviewer'] },
  { to: '/loans', label: 'Loan registry', icon: Database, roles: ['operator', 'reviewer', 'consumer'] },
  { to: '/verified', label: 'Verified records', icon: FileCheck2, roles: ['consumer', 'reviewer'] },
] as const;

const roleColors: Record<Role, string> = {
  operator: '#0b6b5d',
  reviewer: '#5a3d99',
  consumer: '#315f91',
};

const roleLabels: Record<Role, string> = {
  operator: 'Data Operator',
  reviewer: 'Reviewer',
  consumer: 'Data Consumer',
};

export function Shell({ user, onSignOut, children }: {
  user: User;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const role = user.role;

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    function handleClick() { setShowUserMenu(false); }
    if (showUserMenu) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showUserMenu]);

  const currentNav = nav.find((item) => item.to === location.pathname);
  const accentColor = roleColors[role];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><ShieldCheck size={22} /></span>
          <span>VERITAS<small>Loan Copilot</small></span>
        </div>

        {/* Signed-in user card */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar" style={{ background: accentColor }}>
            {user.initials}
          </div>
          <div className="sidebar-user-info">
            <strong>{user.name}</strong>
            <span>{roleLabels[role]}</span>
          </div>
        </div>

        <nav aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {nav
            .filter((item) => (item.roles as readonly string[]).includes(role))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.to === '/exceptions' ? <b className="nav-pill">Live</b> : null}
              </NavLink>
            ))}
        </nav>

        <div className="trust-card">
          <Activity size={18} />
          <div>
            <strong>Evidence chain active</strong>
            <span>SHA-256 audit sealing</span>
          </div>
          <span className="pulse" />
        </div>

        <div className="sidebar-bottom">
          <button className="nav-item ghost" onClick={() => window.alert('See docs/LIVE_DEMO_WALKTHROUGH.md for the step-by-step demo guide.')}>
            <CircleHelp size={18} /> Demo guide
          </button>
          <button className="nav-item ghost sign-out-btn" onClick={onSignOut}>
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
            <Menu size={20} />
          </button>

          <div>
            <p className="eyebrow">{roleLabels[role]} workspace</p>
            <h2>{currentNav?.label ?? 'Loan intelligence'}</h2>
          </div>

          <div className="top-actions">
            <label className="global-search">
              <Search size={17} />
              <input aria-label="Global search" placeholder="Search loans, borrowers…" />
              <kbd>⌘ K</kbd>
            </label>

            {/* User menu */}
            <div className="user-menu-wrapper" onClick={(e) => { e.stopPropagation(); setShowUserMenu((v) => !v); }}>
              <div className="user-pill">
                <span className="avatar" style={{ background: accentColor, color: 'white' }} title={user.name}>
                  {user.initials}
                </span>
                <div className="user-pill-info">
                  <strong>{user.name}</strong>
                  <span>{roleLabels[role]}</span>
                </div>
                <ChevronDown size={13} style={{ color: '#99a8a5', flexShrink: 0 }} />
              </div>

              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <span className="avatar-lg" style={{ background: accentColor }}>{user.initials}</span>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                  <hr className="dropdown-divider" />
                  <button className="dropdown-item sign-out" onClick={onSignOut}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
