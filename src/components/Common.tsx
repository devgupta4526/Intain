import { ArrowDownRight, ArrowUpRight, CheckCircle2, ShieldAlert } from 'lucide-react';

export function MetricCard({ label, value, detail, tone = 'teal', trend }: { label: string; value: string | number; detail: string; tone?: string; trend?: 'up' | 'down' }) {
  return <article className={`metric-card tone-${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-icon">{tone === 'green' ? <CheckCircle2 size={18}/> : <ShieldAlert size={18}/>}</span></div><strong>{value}</strong><p>{trend === 'up' ? <ArrowUpRight size={14}/> : trend === 'down' ? <ArrowDownRight size={14}/> : null}{detail}</p></article>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <span className={`severity severity-${severity}`}><i/>{severity}</span>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="empty-state"><CheckCircle2 size={28}/><strong>{title}</strong><p>{body}</p></div>;
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return <div className="skeleton-stack">{Array.from({ length: rows }, (_, index) => <div className="skeleton" key={index}/>)}</div>;
}

