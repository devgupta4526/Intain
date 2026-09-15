import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Exceptions } from './pages/Exceptions';
import { Ingestion } from './pages/Ingestion';
import { LoanDetail } from './pages/LoanDetail';
import { Loans } from './pages/Loans';
import { VerifiedRecords } from './pages/Verified';
import { getSession, clearSession, saveSession } from './session';
import type { User } from './types';

export function App() {
  const [user, setUser] = useState<User | null>(() => getSession()?.user ?? null);

  function handleLogin(loggedIn: User) {
    saveSession(loggedIn);
    setUser(loggedIn);
  }

  function handleSignOut() {
    clearSession();
    setUser(null);
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const role = user.role;

  return (
    <Shell user={user} onSignOut={handleSignOut}>
      <Routes>
        <Route path="/" element={<Dashboard role={role} />} />
        <Route path="/ingestion" element={role === 'operator' ? <Ingestion /> : <Navigate to="/" replace />} />
        <Route path="/exceptions" element={role !== 'consumer' ? <Exceptions /> : <Navigate to="/" replace />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/loans/:id" element={<LoanDetail role={role} />} />
        <Route path="/verified" element={role !== 'operator' ? <VerifiedRecords /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
