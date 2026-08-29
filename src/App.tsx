import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { Dashboard } from './pages/Dashboard';
import { Exceptions } from './pages/Exceptions';
import { Ingestion } from './pages/Ingestion';
import { LoanDetail } from './pages/LoanDetail';
import { Loans } from './pages/Loans';
import { VerifiedRecords } from './pages/Verified';
import type { Role } from './types';

export function App() {
  const [role, setRole] = useState<Role>(() => (localStorage.getItem('veritas-role') as Role) || 'operator');
  function changeRole(value: Role) { localStorage.setItem('veritas-role', value); setRole(value); }
  return <Shell role={role} onRoleChange={changeRole}><Routes>
    <Route path="/" element={<Dashboard role={role}/>}/>
    <Route path="/ingestion" element={role === 'operator' ? <Ingestion/> : <Navigate to="/" replace/>}/>
    <Route path="/exceptions" element={role !== 'consumer' ? <Exceptions/> : <Navigate to="/" replace/>}/>
    <Route path="/loans" element={<Loans/>}/><Route path="/loans/:id" element={<LoanDetail role={role}/>}/>
    <Route path="/verified" element={role !== 'operator' ? <VerifiedRecords/> : <Navigate to="/" replace/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></Shell>;
}

