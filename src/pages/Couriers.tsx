import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { CONTAINERS, couriers } from '../lib/couriers';
import { isStale, type Rider } from '../lib/dispatch';
import { can } from '../lib/permissions';
import { money } from '../lib/format';

type Run = (fn: () => Promise<unknown>) => void;
const input = 'rounded border border-stone-300 px-2 py-1 text-sm';
const btn = 'rounded bg-accent px-2.5 py-1 text-sm text-white disabled:opacity-40';
const ghost = 'rounded border border-stone-400 px-2.5 py-1 text-sm disabled:opacity-40';
const status = (r: Rider) => (r.active === false ? 'inactive' : isStale(r) ? 'stale' : r.availability);
const seen = (m: number) => (m >= 9999 ? 'not yet' : m >= 60 ? `${Math.floor(m / 60)} h ago` : `${m} min ago`);
const COLS = 'grid grid-cols-[1.4fr_1.6fr_1fr_0.9fr_1fr_0.5fr_1fr_1fr] gap-2';

export default function Couriers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sel, setSel] = useState('');
  const [msg, setMsg] = useState('');
  const [nu, setNu] = useState({ name: '', phone: '', vehicle: '', container: CONTAINERS[0] });
  const q = useQuery({ queryKey: ['couriers'], queryFn: couriers.list, refetchInterval: 10000 });
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: (d) => { ['couriers', 'riders'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); if (typeof d === 'string') setMsg(d); },
  });
  const run: Run = (fn) => { setMsg(''); m.mutate(fn); };
  const role = user!.role;
  const edit = can(role, 'couriers.edit');

  if (!can(role, 'couriers.view')) return <p className="text-stone-600">Your role does not have access to couriers.</p>;
  if (q.isLoading) return <p>Loading couriers…</p>;
  const list = q.data ?? [];
  const cur = list.find((r) => r.id === sel);
  const owed = list.reduce((s, r) => s + (r.cashHeldMinor ?? 0), 0);

  return (
    <div className="min-w-[1000px] space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded border border-stone-300 bg-white p-3 text-sm">
        <span className="font-medium">Add courier</span>
        <input className={input + ' w-36'} placeholder="Name" disabled={!edit} value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} />
        <input className={input + ' w-36'} placeholder="+254700000000" disabled={!edit} value={nu.phone} onChange={(e) => setNu({ ...nu, phone: e.target.value })} />
        <input className={input + ' w-44'} placeholder="Vehicle and plate" disabled={!edit} value={nu.vehicle} onChange={(e) => setNu({ ...nu, vehicle: e.target.value })} />
        <select className={input} disabled={!edit} value={nu.container} onChange={(e) => setNu({ ...nu, container: e.target.value })}>{CONTAINERS.map((c) => <option key={c}>{c}</option>)}</select>
        <button className={btn} disabled={!edit || m.isPending} onClick={() => { run(() => couriers.add(nu)); setNu({ ...nu, name: '', phone: '', vehicle: '' }); }}>Add courier</button>
        <span className="ml-auto text-stone-600">Cash held by couriers: <b>{money(owed)}</b></span>
      </div>
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}
      {m.error && <p className="text-sm text-red-700">{(m.error as Error).message}</p>}

      <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
        <div className="rounded border border-stone-300 bg-white text-sm">
          <div className={`${COLS} border-b border-stone-300 px-3 py-2 text-xs font-semibold text-stone-500`}>
            <span>Name</span><span>Vehicle</span><span>Container</span><span>Status</span><span>Last seen</span><span>Jobs</span><span>Earnings</span><span>Cash held</span>
          </div>
          {list.map((r) => (
            <button key={r.id} onClick={() => setSel(r.id)} className={`${COLS} w-full border-b border-stone-100 px-3 py-2 text-left ${sel === r.id ? 'bg-teal-50' : 'hover:bg-stone-50'} ${r.active === false ? 'text-stone-400' : ''}`}>
              <span className="font-medium">{r.name}</span><span className="truncate">{r.vehicle}</span><span>{r.container}</span><span>{status(r)}</span>
              <span>{seen(r.lastSeenMin)}</span><span>{r.jobs ?? 0}</span><span>{money(r.earningsMinor ?? 0)}</span>
              <span className={(r.cashHeldMinor ?? 0) > 0 ? 'font-medium text-amber-700' : ''}>{money(r.cashHeldMinor ?? 0)}</span>
            </button>
          ))}
        </div>
        {cur ? <Detail key={[cur.id, cur.phone, cur.vehicle, cur.container, cur.plate, cur.cashHeldMinor, cur.active].join('|')} r={cur} run={run} edit={edit} busy={m.isPending} /> : <p className="text-sm text-stone-500">Select a courier to see their profile.</p>}
      </div>
    </div>
  );
}

function Detail({ r, run, edit, busy }: { r: Rider; run: Run; edit: boolean; busy: boolean }) {
  const [d, setD] = useState({ phone: r.phone, vehicle: r.vehicle, plate: r.plate ?? '', container: r.container });
  const [cash, setCash] = useState('');
  const f = (k: 'phone' | 'vehicle' | 'plate', label: string) => (
    <label className="block text-sm text-stone-600">{label}
      <input className={input + ' mt-1 w-full'} disabled={!edit} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="space-y-3 rounded border border-stone-300 bg-white p-4">
      <h2 className="font-semibold">{r.name} <span className="text-sm font-normal text-stone-500">{status(r)}</span></h2>
      {f('phone', 'Phone')}{f('vehicle', 'Vehicle')}{f('plate', 'Plate')}
      <label className="block text-sm text-stone-600">Current container
        <select className={input + ' mt-1 w-full'} disabled={!edit} value={d.container} onChange={(e) => setD({ ...d, container: e.target.value })}>{CONTAINERS.map((c) => <option key={c}>{c}</option>)}</select>
      </label>
      <div className="flex gap-2">
        <button className={btn} disabled={!edit || busy} onClick={() => run(() => couriers.update(r.id, d))}>Save changes</button>
        <button className={ghost} disabled={!edit || busy} onClick={() => run(() => couriers.setActive(r.id, r.active === false))}>{r.active === false ? 'Reactivate' : 'Deactivate'}</button>
      </div>
      <div className="border-t border-stone-200 pt-3 text-sm">
        <p>Cash held, not yet handed in: <b>{money(r.cashHeldMinor ?? 0)}</b></p>
        <div className="mt-2 flex gap-2">
          <input className={input + ' w-28'} placeholder="Amount (KES)" disabled={!edit} value={cash} onChange={(e) => setCash(e.target.value)} />
          <button className={btn} disabled={!edit || busy || !cash} onClick={() => run(() => couriers.recordHandover(r.id, Number(cash)))}>Record handover</button>
        </div>
      </div>
      {!edit && <p className="text-xs text-stone-500">Your role can view couriers but not change them.</p>}
    </div>
  );
}