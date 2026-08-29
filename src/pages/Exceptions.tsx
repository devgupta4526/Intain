import { useDeferredValue, useEffect, useState } from 'react';
import { ArrowRight, Filter, Search, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { ExceptionRecord } from '../types';
import { EmptyState, SeverityBadge, Skeleton } from '../components/Common';

export function Exceptions() {
  const [items, setItems] = useState<ExceptionRecord[] | null>(null); const [severity, setSeverity] = useState(''); const [search, setSearch] = useState(''); const deferredSearch = useDeferredValue(search);
  useEffect(() => { const params = new URLSearchParams({ status: 'open' }); if (severity) params.set('severity', severity); if (deferredSearch) params.set('search', deferredSearch); api<ExceptionRecord[]>(`/exceptions?${params}`).then(setItems); }, [severity, deferredSearch]);
  const counts = items?.reduce<Record<string,number>>((acc, item) => ({ ...acc, [item.severity]: (acc[item.severity] ?? 0) + 1 }), {}) ?? {};
  return <div className="page-stack"><section className="hero-row"><div><p className="kicker"><span/> HUMAN REVIEW QUEUE</p><h1>Resolve what matters first.</h1><p>Evidence-rich exceptions, ranked by severity. AI is available on demand.</p></div><div className="queue-summary"><span><b>{items?.length ?? '—'}</b> open</span><span className="critical-text"><b>{counts.critical ?? 0}</b> critical</span></div></section>
    <div className="filter-bar"><label><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search loan or borrower ID"/></label><span className="filter-divider"/><Filter size={16}/>{['','critical','high','medium','low'].map((value) => <button key={value || 'all'} className={severity === value ? 'chip active' : 'chip'} onClick={() => setSeverity(value)}>{value || 'All severity'}</button>)}</div>
    <article className="panel queue-panel">{!items ? <Skeleton/> : items.length === 0 ? <EmptyState title="Queue cleared" body="No open exceptions match these filters."/> : <div className="exception-list">{items.map((item) => <Link to={`/loans/${item.loan_row_id}`} className="exception-row" key={item.id}><div className="exception-severity"><SeverityBadge severity={item.severity}/><span>#{item.id}</span></div><div className="exception-main"><div><strong>{item.rule_code.replaceAll('_',' ')}</strong><span className="loan-ref">{item.loan_id ?? 'Missing loan ID'}</span></div><p>{item.message}</p><small>{item.source_system} · Field: {item.field_name ?? 'record-level'} · Current: <code>{item.current_value ?? 'empty'}</code></small></div><div className="ai-ready"><Sparkles size={15}/>{item.ai_count ? `${item.ai_count} suggestion` : 'AI ready'}</div><ArrowRight size={17}/></Link>)}</div>}</article>
  </div>;
}

