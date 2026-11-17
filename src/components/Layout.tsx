import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';

const GROUPS: [string, [string, string][]][] = [
  ['Operations', [['Overview', '/'], ['Live board', '/board'], ['Dispatch', '/dispatch'], ['Rides', '/rides']]],
  ['Catalog', [['Merchants and menu', '/merchants']]],
  ['People', [['Couriers', '/couriers'], ['Customers', '/customers']]],
  ['Money', [['Zones and pricing', '/zones'], ['Payments', '/payments'], ['Reports', '/reports']]],
  ['Admin', [['Settings', '/settings'], ['Users and audit', '/users']]],
];
const TITLES: Record<string, string> = Object.fromEntries(GROUPS.flatMap(([, items]) => items));
const TITLE_BY_PATH: Record<string, string> = Object.fromEntries(Object.entries(TITLES).map(([label, path]) => [path, label]));

const nairobi = () =>
  new Date().toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [now, setNow] = useState(nairobi);
  useEffect(() => { const t = setInterval(() => setNow(nairobi()), 20000); return () => clearInterval(t); }, []);
  const title = pathname.startsWith('/orders') ? 'Order' : TITLE_BY_PATH[pathname] ?? 'Deliv Admin';

  return (
    <div className="flex h-screen bg-stone-100 text-stone-900">
      <aside className="flex w-56 shrink-0 flex-col overflow-y-auto bg-stone-900 px-3 py-4 text-sm text-stone-300">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded bg-accent font-semibold text-white">D</span>
          <span className="font-semibold text-white">Deliv <span className="font-normal text-stone-400">Admin</span></span>
        </div>
        {GROUPS.map(([group, items]) => (
          <div key={group} className="mb-4">
            <div className="mb-1 px-2 text-xs uppercase tracking-wide text-stone-500">{group}</div>
            {items.map(([label, to]) => (
              <NavLink key={label} to={to} end className={({ isActive }) => `block rounded px-3 py-1.5 ${isActive ? 'bg-white/10 font-medium text-white shadow-[inset_3px_0_0_#6b8cf0]' : 'hover:bg-white/5 hover:text-white'}`}>{label}</NavLink>
            ))}
          </div>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-stone-300 bg-white px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            <p className="text-xs text-stone-500">Nairobi · {now}</p>
          </div>
          <span className="flex items-center gap-3 text-sm">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-xs font-semibold uppercase text-accent">{user!.name.slice(0, 1)}</span>
            <span className="leading-tight">{user!.name}<span className="block text-xs text-stone-500">{user!.role.toLowerCase()}</span></span>
            <button onClick={logout} className="ml-2 rounded border border-stone-300 px-2.5 py-1 text-stone-600 hover:bg-stone-100">Sign out</button>
          </span>
        </header>
        <main key={pathname} className="page-enter flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}