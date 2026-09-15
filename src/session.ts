import type { Role, User } from './types';

const SESSION_KEY = 'veritas-session';

export type Session = { user: User };

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(user: User): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getRole(): Role | null {
  return getSession()?.user.role ?? null;
}
