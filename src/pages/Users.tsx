import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { auditApi } from '../lib/audit';
import { usersApi } from '../lib/users';
import { ROLES, can, type Role } from '../lib/permissions';

const box = 'rounded border border-stone-300 bg-white';
const input = 'rounded border border-stone-300 px-2 py-1 text-sm';
const btn = 'rounded bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-40';
const ghost = 'rounded border border-stone-400 px-2.5 py-1 text-sm disabled:opacity-40';
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }) : 'never');

export default function Users() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'users' | 'audit'>('users');
  const [msg, setMsg] = useState('');
  const [nu, setNu] = useState({ name: '', email: '', role: 'DISPATCHER' as Role });
  const [search, setSearch] = useState('');
  const [since, setSince] = useState('');
  const users = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const audit = useQuery({ queryKey: ['audit'], queryFn: auditApi.list });
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: (d) => { ['users', 'audit'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); if (typeof d === 'string') setMsg(d); },
  });
  const run = (fn: () => Promise<unknown>) => { setMsg(''); m.mutate(fn); };
  const by = user!.name;
  const edit = can(user!.role, 'users.manage');

  if (!can(user!.role, 'audit.view')) return <p className="text-stone-600">Your role does not have access to admin users or the audit log.</p>;

  const term = search.trim().toLowerCase();
  const rows = (audit.data ?? []).filter((a) => (!term || [a.actor, a.action, a.entity, a.detail].some((s) => s.toLowerCase().includes(term))) && (!since || a.at.slice(0, 10) >= since));

  return (
    <div className="min-w-[900px] space-y-4">
      <div className="flex gap-2 text-sm">
        {([['users', 'Admin users'], ['audit', 'Audit log']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded px-3 py-1.5 ${tab === k ? 'bg-accent text-white' : 'border border-stone-300 bg-white'}`}>{l}</button>
        ))}
      </div>
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}
      {m.error && <p className="text-sm text-red-700">{(m.error as Error).message}</p>}

      {tab === 'users' && (
        <>
          <div className={`${box} flex flex-wrap items-center gap-2 p-3 text-sm`}>
            <span className="font-medium">Add admin</span>
            <input className={input + ' w-36'} placeholder="Name" disabled={!edit} value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} />
            <input className={input + ' w-56'} placeholder="Email" disabled={!edit} value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} />
            <select className={input} disabled={!edit} value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r} value={r}>{r.toLowerCase()}</option>)}</select>
            <button className={btn} disabled={!edit || m.isPending} onClick={() => { run(() => usersApi.add(nu, by)); setNu({ ...nu, name: '', email: '' }); }}>Create account</button>
            {!edit && <span className="text-xs text-stone-500">Your role can view but not change accounts</span>}
          </div>
          <div className={`${box} text-sm`}>
            {(users.data ?? []).map((u) => (
              <div key={u.id} className={`grid grid-cols-[1.4fr_1.6fr_1fr_0.9fr_1.2fr_auto] items-center gap-3 border-b border-stone-100 px-4 py-3 ${u.active ? '' : 'opacity-50'}`}>
                <span className="font-medium">{u.name}</span>
                <span className="text-stone-600">{u.email}</span>
                <select className={input} disabled={!edit} value={u.role} onChange={(e) => run(() => usersApi.setRole(u.id, e.target.value as Role, by))}>{ROLES.map((r) => <option key={r} value={r}>{r.toLowerCase()}</option>)}</select>
                <span className={u.totp ? 'text-emerald-700' : 'text-amber-700'}>{u.totp ? '2FA on' : '2FA not set'}</span>
                <span className="text-xs text-stone-500">last sign-in {when(u.lastLoginAt)}</span>
                <span className="flex gap-2">
                  <button className={ghost} disabled={!edit} onClick={() => run(() => usersApi.resetTwoFactor(u.id, by))}>Reset 2FA</button>
                  <button className={ghost} disabled={!edit} onClick={() => run(() => usersApi.setActive(u.id, !u.active, by))}>{u.active ? 'Deactivate' : 'Reactivate'}</button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'audit' && (
        <>
          <div className="flex items-center gap-3 text-sm">
            <input className={input + ' w-72'} placeholder="Search by admin, action or entity" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="text-stone-600">Since <input type="date" className={input} value={since} onChange={(e) => setSince(e.target.value)} /></label>
            <span className="text-stone-500">{rows.length} entries</span>
          </div>
          <div className={`${box} text-sm`}>
            {rows.length === 0 && <p className="p-4 text-stone-500">No entries match.</p>}
            {rows.map((a) => (
              <div key={a.id} className="grid grid-cols-[9rem_6rem_14rem_1fr] gap-3 border-b border-stone-100 px-4 py-2.5">
                <span className="text-stone-500">{when(a.at)}</span><span className="font-medium">{a.actor}</span>
                <span className="font-mono text-xs text-stone-700">{a.action}</span><span className="text-stone-600">{a.entity}{a.detail && ` · ${a.detail}`}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}