import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Activity, BadgeCheck, ChevronDown, CircleHelp, Database, FileCheck2, Gauge, LogOut, Menu, Search, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import type { Role, User } from '../types';
import { api } from '../api';

const nav = [
  { to: '/', label: 'Command center', icon: Gauge, roles: ['operator','reviewer','consumer'] },
  { to: '/ingestion', label: 'Data intake', icon: UploadCloud, roles: ['operator'] },
  { to: '/exceptions', label: 'Exception queue', icon: Sparkles, roles: ['operator','reviewer'] },
  { to: '/loans', label: 'Loan registry', icon: Database, roles: ['operator','reviewer','consumer'] },
  { to: '/verified', label: 'Verified records', icon: FileCheck2, roles: ['consumer','reviewer'] },
] as const;

export function Shell({ role, onRoleChange, children }: { role: Role; onRoleChange: (role: Role) => void; children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { api<User[]>('/users').then(setUsers).catch(() => setUsers([])); }, []);
  useEffect(() => setMobileOpen(false), [location.pathname]);
  const current = users.find((user) => user.role === role);
  const currentNav = nav.find((item) => item.to === location.pathname);
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><ShieldCheck size={22} /></span><span>VERITAS<small>Loan Copilot</small></span></div>
      <nav aria-label="Primary navigation">
        <p className="nav-label">Workspace</p>
        {nav.filter((item) => (item.roles as readonly string[]).includes(role)).map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <item.icon size={18} /><span>{item.label}</span>{item.to === '/exceptions' ? <b className="nav-pill">Live</b> : null}
        </NavLink>)}
      </nav>
      <div className="trust-card"><Activity size={18}/><div><strong>Evidence chain active</strong><span>SHA-256 audit sealing</span></div><span className="pulse" /></div>
      <div className="sidebar-bottom"><button className="nav-item ghost" onClick={() => window.alert('Please refer to the DEMO_SCRIPT.md and README.md in the repository for the demo guide.')}><CircleHelp size={18}/> Demo guide</button><button className="nav-item ghost" onClick={() => window.alert('Sign out is disabled in this demo environment. Please use the Role Switcher at the top right to change users.')}><LogOut size={18}/> Sign out</button></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle menu"><Menu size={20}/></button>
        <div><p className="eyebrow">{role} workspace</p><h2>{currentNav?.label ?? 'Loan intelligence'}</h2></div>
        <div className="top-actions"><label className="global-search"><Search size={17}/><input aria-label="Global search" placeholder="Search loans, borrowers…"/><kbd>⌘ K</kbd></label>
          <div className="role-switcher"><BadgeCheck size={17}/><select value={role} onChange={(event) => onRoleChange(event.target.value as Role)} aria-label="Switch demo role">
            <option value="operator">Data Operator</option><option value="reviewer">Reviewer</option><option value="consumer">Data Consumer</option>
          </select><ChevronDown size={14}/></div>
          <span className="avatar" title={current?.name}>{current?.initials ?? 'VC'}</span>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  </div>;
}

