import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Role } from './lib/permissions';

export interface User { name: string; email: string; role: Role }
interface AuthCtx { user: User | null; login: (u: User) => void; logout: () => void }

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

const IDLE_MS = 30 * 60 * 1000; // 30-minute idle timeout, per the design doc
const KEY = 'deliv-admin-user'; // demo only: the real app uses the server's cookie session
const load = (): User | null => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; } };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(load);
  const setUser = (u: User | null) => {
    setUserState(u);
    try { u ? sessionStorage.setItem(KEY, JSON.stringify(u)) : sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!user) return;
    let t = setTimeout(() => setUser(null), IDLE_MS);
    const reset = () => { clearTimeout(t); t = setTimeout(() => setUser(null), IDLE_MS); };
    const evs = ['click', 'keydown', 'mousemove'];
    evs.forEach((e) => window.addEventListener(e, reset));
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, reset)); };
  }, [user]);

  return <Ctx.Provider value={{ user, login: setUser, logout: () => setUser(null) }}>{children}</Ctx.Provider>;
}