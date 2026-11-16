import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';

const NAV: [string, string | null][] = [
  ['Live board', '/'], ['Dispatch', '/dispatch'], ['Rides', null], ['Merchants and menu', '/merchants'], ['Couriers', null],
  ['Customers', null], ['Zones and pricing', null], ['Payments', null], ['Reports', null], ['Settings', null], ['Users and audit', null],
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-screen bg-stone-100 text-stone-900">
      <aside className="w-52 shrink-0 overflow-y-auto bg-stone-900 p-3 text-sm text-stone-300">
        <div className="mb-5 px-2 text-base font-semibold text-white">Deliv Admin</div>
        <nav className="space-y-0.5">
          {NAV.map(([label, to]) =>
            to ? (
              <NavLink key={label} to={to} end className={({ isActive }) => `block rounded px-2 py-1.5 ${isActive ? 'bg-accent text-white' : 'hover:bg-stone-800'}`}>{label}</NavLink>
            ) : (
              <div key={label} className="rounded px-2 py-1.5 text-stone-500" title="Not built yet">{label}</div>
            ),
          )}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-stone-300 bg-white px-4 py-2 text-sm">
          <span className="text-stone-500">Times shown in Nairobi</span>
          <span className="flex items-center gap-3">
            {user!.name} <span className="rounded bg-stone-200 px-2 py-0.5 text-xs">{user!.role.toLowerCase()}</span>
            <button onClick={logout} className="text-accent underline">Sign out</button>
          </span>
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}