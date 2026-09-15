import { useEffect, useState } from 'react';
import { ShieldCheck, ArrowRight, UploadCloud, Sparkles, FileCheck2, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { saveSession } from '../session';
import type { User } from '../types';

const PERSONAS: Record<string, { icon: typeof UploadCloud; color: string; bg: string; border: string; tag: string; desc: string }> = {
  operator: {
    icon: UploadCloud,
    color: '#0b6b5d',
    bg: 'linear-gradient(145deg,#e6f5f0,#f0faf7)',
    border: '#b8ddd3',
    tag: 'Data Operator',
    desc: 'Upload loan tapes, monitor ingestion quality, track batch history and system health.',
  },
  reviewer: {
    icon: Sparkles,
    color: '#5a3d99',
    bg: 'linear-gradient(145deg,#f0ecfb,#f8f5ff)',
    border: '#cfc4e8',
    tag: 'Reviewer',
    desc: 'Triage exceptions, generate AI evidence, edit fields, and approve verified records.',
  },
  consumer: {
    icon: FileCheck2,
    color: '#315f91',
    bg: 'linear-gradient(145deg,#eaf1fb,#f3f7fd)',
    border: '#b8ceea',
    tag: 'Data Consumer',
    desc: 'Browse sealed records, download verified CSV exports, and consume the REST API.',
  },
};

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState<number | null>(null);

  useEffect(() => {
    api<User[]>('/users')
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleSignIn(user: User) {
    setSigningIn(user.id);
    // Small delay for tactile feedback
    await new Promise((r) => setTimeout(r, 380));
    saveSession(user);
    onLogin(user);
  }

  return (
    <div className="login-page">
      {/* Left panel */}
      <div className="login-left">
        <div className="login-brand">
          <span className="login-brand-mark"><ShieldCheck size={24} /></span>
          <span>VERITAS<small>Loan Copilot</small></span>
        </div>

        <div className="login-hero">
          <p className="login-kicker">
            <span /> Intain FinTech Challenge 2026
          </p>
          <h1>Turn messy loan&nbsp;tapes into trusted, verified records.</h1>
          <p className="login-sub">
            Select your role below to sign in instantly. No password required in demo mode.
          </p>
        </div>

        <ul className="login-features">
          {[
            '15-rule deterministic validation engine',
            'AI evidence layer — separated from decisions',
            'SHA-256 hash-linked audit chain',
            'Three role-based workspaces',
          ].map((f) => (
            <li key={f}><CheckCircle2 size={15} />{f}</li>
          ))}
        </ul>

        <p className="login-footer">
          Veritas doesn&apos;t ask you to trust it — it gives you a record you can verify.
        </p>
      </div>

      {/* Right panel — sign-in cards */}
      <div className="login-right">
        <div className="login-card-wrapper">
          <div className="login-card-header">
            <h2>Choose your workspace</h2>
            <p>Three roles, one click. Each persona has a dedicated view.</p>
          </div>

          {loading ? (
            <div className="login-skeletons">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />
              ))}
            </div>
          ) : (
            <div className="persona-grid">
              {users.map((user) => {
                const meta = PERSONAS[user.role];
                if (!meta) return null;
                const Icon = meta.icon;
                const busy = signingIn === user.id;
                return (
                  <button
                    key={user.id}
                    className={`persona-card ${busy ? 'persona-card--busy' : ''}`}
                    style={{ background: meta.bg, borderColor: meta.border }}
                    onClick={() => handleSignIn(user)}
                    disabled={signingIn !== null}
                  >
                    <div className="persona-icon" style={{ background: meta.color }}>
                      <Icon size={20} color="white" />
                    </div>
                    <div className="persona-body">
                      <div className="persona-top">
                        <div>
                          <strong>{user.name}</strong>
                          <span className="persona-tag" style={{ color: meta.color }}>{meta.tag}</span>
                        </div>
                        <div className="persona-avatar" style={{ background: meta.color }}>
                          {user.initials}
                        </div>
                      </div>
                      <p className="persona-desc">{meta.desc}</p>
                    </div>
                    <div className="persona-cta" style={{ color: meta.color }}>
                      {busy ? (
                        <span className="persona-spinner" />
                      ) : (
                        <>
                          <span>Sign in as {user.name.split(' ')[0]}</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <p className="login-note">
            <ShieldCheck size={12} />
            Demo environment — session stored locally. All audit events are attributed to the signed-in user.
          </p>
        </div>
      </div>
    </div>
  );
}
