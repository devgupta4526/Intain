import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, History, Loader2, RotateCcw, UploadCloud } from 'lucide-react';
import { api, compactHash, dateTime } from '../api';

type Batch = { id: number; filename: string; source_hash: string; uploaded_at: string; total_rows: number; imported_rows: number; failed_rows: number; status: string; exception_count: number; uploaded_by_name: string };

export function Ingestion() {
  const [batches, setBatches] = useState<Batch[]>([]); const [drag, setDrag] = useState(false); const [busy, setBusy] = useState(false); const [result, setResult] = useState<Record<string, unknown> | null>(null); const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const refresh = () => api<Batch[]>('/batches').then(setBatches);
  useEffect(() => { refresh(); }, []);
  async function uploadFile(file?: File) {
    if (!file) return; setBusy(true); setError(''); setResult(null);
    const data = new FormData(); data.append('file', file); data.append('actorId', '1');
    try { const uploaded = await api<Record<string, unknown>>('/upload', { method: 'POST', body: data }); setResult(uploaded); await refresh(); }
    catch (value) { setError(value instanceof Error ? value.message : 'Upload failed.'); } finally { setBusy(false); }
  }
  async function reset() { if (!confirm('Reset the demo to its original sample tape?')) return; await api('/demo/reset', { method: 'POST', body: '{}' }); setResult(null); await refresh(); }
  return <div className="page-stack"><section className="hero-row"><div><p className="kicker"><span/> CONTROLLED INGESTION</p><h1>Bring messy data. Keep its provenance.</h1><p>Every source file is fingerprinted before normalization and validation begin.</p></div><button className="button subtle" onClick={reset}><RotateCcw size={15}/> Reset demo</button></section>
    <section className="ingest-grid"><article className="panel upload-panel"><div className={`drop-zone ${drag ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(event) => { event.preventDefault(); setDrag(false); uploadFile(event.dataTransfer.files[0]); }}>
      <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(event) => uploadFile(event.target.files?.[0])}/><span className="upload-icon">{busy ? <Loader2 className="spin"/> : <UploadCloud/>}</span><h3>{busy ? 'Parsing and validating…' : 'Drop a loan tape here'}</h3><p>CSV up to 10 MB · headers are normalized automatically</p><button className="button primary" disabled={busy} onClick={() => input.current?.click()}>Choose CSV file</button><small>Raw input is preserved alongside canonical values.</small></div>
      {error ? <p className="form-error">{error}</p> : null}{result ? <div className="upload-result"><CheckCircle2/><div><strong>Batch {String(result.batchId)} is ready</strong><p>{String(result.importedRows)} rows imported · {JSON.stringify(result.exceptions).match(/\d+/)?.[0] ?? 0} exceptions routed</p></div></div> : null}
    </article><article className="panel process-panel"><h3>What happens next</h3><ol className="process-list"><li><span>01</span><div><strong>Fingerprint</strong><p>SHA-256 source hash captures immutable lineage.</p></div></li><li><span>02</span><div><strong>Normalize</strong><p>Dates, currency, rates, codes, and status values align.</p></div></li><li><span>03</span><div><strong>Validate</strong><p>15 controls scan data integrity and cross-field consistency.</p></div></li><li><span>04</span><div><strong>Route</strong><p>Exceptions are severity-ranked for human review.</p></div></li></ol></article></section>
    <article className="panel"><header className="panel-header"><div><span className="panel-icon"><History size={18}/></span><div><h3>Import history</h3><p>Source lineage and processing outcomes</p></div></div></header><div className="table-scroll"><table><thead><tr><th>Source file</th><th>Uploaded</th><th>Rows</th><th>Exceptions</th><th>Fingerprint</th><th>Status</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td><span className="file-cell"><FileSpreadsheet size={18}/><span><strong>{batch.filename}</strong><small>by {batch.uploaded_by_name}</small></span></span></td><td>{dateTime(batch.uploaded_at)}</td><td>{batch.imported_rows} / {batch.total_rows}</td><td><span className="count-alert">{batch.exception_count}</span></td><td><code>{compactHash(batch.source_hash)}</code></td><td><span className="status success"><i/> Complete</span></td></tr>)}</tbody></table></div></article>
  </div>;
}

