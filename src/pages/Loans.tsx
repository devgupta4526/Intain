import { useDeferredValue, useEffect, useState } from 'react';
import { ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, money } from '../api';
import type { Loan } from '../types';
import { EmptyState, Skeleton } from '../components/Common';

export function Loans() {
  const [loans, setLoans] = useState<Loan[] | null>(null); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const deferred = useDeferredValue(search);
  useEffect(() => { const params = new URLSearchParams(); if (deferred) params.set('search', deferred); if (status) params.set('status', status); api<Loan[]>(`/loans?${params}`).then(setLoans); }, [deferred,status]);
  return <div className="page-stack"><section className="hero-row"><div><p className="kicker"><span/> CANONICAL REGISTRY</p><h1>Every loan, one explainable record.</h1><p>Trace normalized values back to their original source row.</p></div></section><div className="filter-bar"><label><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search loan or borrower ID"/></label>{['','valid','invalid'].map((value) => <button className={status === value ? 'chip active' : 'chip'} onClick={() => setStatus(value)} key={value || 'all'}>{value || 'All records'}</button>)}</div>
    <article className="panel"><div className="table-scroll">{!loans ? <Skeleton/> : loans.length === 0 ? <EmptyState title="No records found" body="Try a different loan or borrower ID."/> : <table><thead><tr><th>Loan</th><th>Borrower</th><th>Type</th><th>Original principal</th><th>Current balance</th><th>Quality</th><th>State</th><th/></tr></thead><tbody>{loans.map((loan) => <tr key={loan.id}><td><strong>{loan.loan_id ?? <span className="missing">Missing ID</span>}</strong></td><td>{loan.borrower_id}</td><td className="capitalize">{loan.loan_type?.replaceAll('_',' ')}</td><td>{loan.original_principal == null ? '—' : money.format(loan.original_principal)}</td><td>{loan.current_balance == null ? '—' : money.format(loan.current_balance)}</td><td>{loan.is_verified ? <span className="status verified"><ShieldCheck size={14}/> Verified</span> : loan.validation_status === 'valid' ? <span className="status success"><i/> Passed</span> : <span className="status danger"><i/> {loan.open_exception_count} issues</span>}</td><td>{loan.borrower_state}</td><td><Link className="row-action" to={`/loans/${loan.id}`} aria-label={`Open ${loan.loan_id}`}><ArrowRight size={17}/></Link></td></tr>)}</tbody></table>}</div></article>
  </div>;
}

