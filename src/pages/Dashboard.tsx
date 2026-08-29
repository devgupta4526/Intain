import { useEffect, useState } from 'react';
import { ArrowRight, Check, Clock3, FileSearch, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Role, Summary } from '../types';
import { MetricCard, SeverityBadge, Skeleton } from '../components/Common';

export function Dashboard({ role }: { role: Role }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => { api<Summary>('/summary').then(setSummary); }, []);
  if (!summary) return <Skeleton rows={6}/>;
  const copy = role === 'operator' ? ['Data quality command center', 'Monitor every file from arrival to clean canonical data.'] : role === 'reviewer' ? ['Good afternoon, Arjun', 'Your prioritized review queue is ready. AI suggestions remain under your control.'] : ['Trusted data, ready to use', 'Inspect verified records, evidence history, and export-ready datasets.'];
  return <div className="page-stack">
    <section className="hero-row"><div><p className="kicker"><span/> LIVE CONTROL ROOM</p><h1>{copy[0]}</h1><p>{copy[1]}</p></div><div className="hero-actions"><span className="last-sync"><Clock3 size={15}/> Refreshed just now</span><Link className="button primary" to={role === 'operator' ? '/ingestion' : role === 'reviewer' ? '/exceptions' : '/verified'}>{role === 'operator' ? 'Import loan tape' : role === 'reviewer' ? 'Start reviewing' : 'Open verified data'} <ArrowRight size={16}/></Link></div></section>
    <section className="metrics-grid"><MetricCard label="Portfolio records" value={summary.loans.total} detail={`Across ${summary.batches} source batch${summary.batches === 1 ? '' : 'es'}`} tone="blue"/><MetricCard label="Data quality score" value={`${summary.qualityScore}%`} detail="Rules-based verified at intake" tone="green" trend="up"/><MetricCard label="Open exceptions" value={summary.exceptions.open} detail={`${summary.exceptions.critical} critical · ${summary.exceptions.high} high`} tone="amber"/><MetricCard label="Verified records" value={summary.verified} detail="Cryptographically sealed" tone="teal"/></section>
    <section className="dashboard-grid">
      <article className="panel wide"><header className="panel-header"><div><span className="panel-icon"><FileSearch size={18}/></span><div><h3>Exception intelligence</h3><p>Prioritized by business impact and confidence</p></div></div><Link to="/exceptions">View queue <ArrowRight size={15}/></Link></header>
        <div className="rule-list">{summary.byRule.map((rule, index) => <div className="rule-row" key={rule.code}><span className="rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{rule.code.replaceAll('_',' ')}</strong><small>Rule-based control · {rule.count} affected record{rule.count === 1 ? '' : 's'}</small></div><SeverityBadge severity={rule.severity}/><b>{rule.count}</b></div>)}</div>
      </article>
      <article className="panel trust-panel"><header className="panel-header"><div><span className="panel-icon green"><ShieldCheck size={18}/></span><div><h3>Trust posture</h3><p>Live system controls</p></div></div></header>
        <div className="score-ring" style={{ '--score': `${summary.qualityScore * 3.6}deg` } as React.CSSProperties}><span><b>{summary.qualityScore}</b><small>/ 100</small></span></div>
        <ul className="check-list"><li><Check/> Source lineage captured</li><li><Check/> Audit chain verified</li><li><Check/> AI requires human action</li><li><Check/> Canonical records hashed</li></ul>
      </article>
    </section>
    <section className="explain-banner"><span><Sparkles size={20}/></span><div><strong>AI that explains—never decides.</strong><p>Veritas surfaces evidence and suggested corrections. Every data change and final decision stays with a named human reviewer.</p></div><Link to="/exceptions">See it in action <ArrowRight size={15}/></Link></section>
  </div>;
}

