import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';

const GROUPS: [string, [string, string | null][]][] = [
  ['Operations', [['Live board', '/'], ['Dispatch', '/dispatch'], ['Rides', null]]],
  ['Catalog', [['Merchants and menu', '/merchants']]],
  ['People', [['Couriers', '/couriers'], ['Customers', null]]],
  ['Money', [['Zones and pricing', null], ['Payments', null], ['Reports', null]]],
  ['Admin', [['Settings', null], ['Users and audit', null]]],
];

const nairobi = () =>
  new Date().toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [now, setNow] = useState(nairobi);
  useEffect(() => { const t = setInterval(() => setNow(nairobi()), 20000); return () => clearInterval(t); }, []);

  return (
    <div className="flex h-screen bg-stone-100 text-stone-900">
      <aside className="flex w-56 shrink-0 flex-col overflow-y-auto bg-stone-900 px-3 py-4 text-sm text-stone-300">
        <div className="mb-5 flex items-center gap-2 px-2">
          <span className="grid h-7 w-7 place-items-center rounded bg-accent font-semibold text-white">D</span>
          <span className="font-semibold text-white">Deliv <span className="font-normal text-stone-400">Admin</span></span>
        </div>
        {GROUPS.map(([group, items]) => (
          <div key={group} className="mb-4">
            <div className="mb-1 px-2 text-xs text-stone-500">{group}</div>
            {items.map(([label, to]) =>
              to ? (
                <NavLink key={label} to={to} end className={({ isActive }) => `block rounded px-2 py-1.5 ${isActive ? 'bg-accent font-medium text-white' : 'hover:bg-stone-800 hover:text-white'}`}>{label}</NavLink>
              ) : (
                <div key={label} className="rounded px-2 py-1.5 text-stone-600" title="Not built yet">{label}</div>
              ),
            )}
          </div>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-stone-300 bg-white px-5 py-2.5 text-sm">
          <span className="text-stone-600">Nairobi · <span className="font-medium text-stone-900">{now}</span></span>
          <span className="flex items-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-xs font-semibold uppercase text-accent">{user!.name.slice(0, 1)}</span>
            <span>{user!.name}</span>
            <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{user!.role.toLowerCase()}</span>
            <button onClick={logout} className="text-stone-500 hover:text-accent">Sign out</button>
          </span>
        </header>
        <main className="flex-1 overflow-auto p-5">{children}</main>
      </div>
    </div>
  );
}