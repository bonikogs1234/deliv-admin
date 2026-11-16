import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { isPaused, merchants, type Merchant } from '../lib/merchants';
import { can } from '../lib/permissions';
import { money, time } from '../lib/format';

type Run = (fn: () => Promise<unknown>) => void;
const input = 'rounded border border-stone-300 px-2 py-1 text-sm';
const btn = 'rounded bg-accent px-2.5 py-1 text-sm text-white disabled:opacity-40';
const ghost = 'rounded border border-stone-400 px-2.5 py-1 text-sm disabled:opacity-40';

export default function Merchants() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sel, setSel] = useState('m1');
  const [tab, setTab] = useState<'details' | 'menu'>('details');
  const [msg, setMsg] = useState('');
  const q = useQuery({ queryKey: ['merchants'], queryFn: merchants.list });
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['merchants'] }); if (typeof d === 'string') setMsg(d); },
  });
  const run: Run = (fn) => { setMsg(''); m.mutate(fn); };
  const list = q.data ?? [];
  const cur = list.find((x) => x.id === sel);
  const role = user!.role;

  if (q.isLoading) return <p>Loading merchants…</p>;
  return (
    <div className="grid min-w-[900px] gap-4 lg:grid-cols-[16rem_1fr]">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Merchants <span className="text-stone-500">{list.length}</span></h2>
        {list.map((x) => (
          <button key={x.id} onClick={() => setSel(x.id)} className={`block w-full rounded border bg-white p-3 text-left text-sm ${sel === x.id ? 'border-accent ring-1 ring-accent' : 'border-stone-300'}`}>
            <div className="font-medium">{x.name}</div>
            <div className="text-xs text-stone-500">{!x.active ? 'Deactivated' : isPaused(x) ? 'Paused' : x.open ? 'Open' : 'Closed'} · rating {x.rating}</div>
          </button>
        ))}
      </section>
      {cur && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 rounded border border-stone-300 bg-white p-3">
            <h1 className="flex-1 text-lg font-semibold">{cur.name}</h1>
            {isPaused(cur) && <span className="text-sm text-amber-700">Paused until {time(cur.pausedUntil!)}</span>}
            <button className={ghost} disabled={!can(role, 'merchants.openclose') || !cur.active || m.isPending} onClick={() => run(() => merchants.setOpen(cur.id, !cur.open))}>{cur.open ? 'Close now' : 'Open now'}</button>
            <button className={ghost} disabled={!can(role, 'merchants.openclose') || !cur.active || m.isPending} onClick={() => run(() => merchants.pause(cur.id, isPaused(cur) ? 0 : 60))}>{isPaused(cur) ? 'Resume' : 'Pause for an hour'}</button>
          </div>
          <div className="flex gap-2 text-sm">
            {(['details', 'menu'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1 ${tab === t ? 'bg-accent text-white' : 'bg-white border border-stone-300'}`}>{t === 'details' ? 'Details' : 'Menu'}</button>
            ))}
          </div>
          {tab === 'details' ? <Details key={cur.id + cur.commissionPct + cur.smsNumber} m={cur} run={run} busy={m.isPending} edit={can(role, 'merchants.edit')} /> : <Menu m={cur} run={run} edit={can(role, 'menu.edit')} />}
          {msg && <p className="text-sm text-emerald-800">{msg}</p>}
          {m.error && <p className="text-sm text-red-700">{(m.error as Error).message}</p>}
        </section>
      )}
    </div>
  );
}

function Details({ m, run, busy, edit }: { m: Merchant; run: Run; busy: boolean; edit: boolean }) {
  const [d, setD] = useState({ phone: m.phone, smsNumber: m.smsNumber, hours: m.hours, commission: String(m.commissionPct) });
  const f = (k: keyof typeof d, label: string) => (
    <label className="block text-sm text-stone-600">{label}
      <input className={input + ' mt-1 w-full'} disabled={!edit} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="space-y-3 rounded border border-stone-300 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2">
        {f('phone', 'Contact phone')}{f('smsNumber', 'SMS number for order links')}{f('hours', 'Opening hours')}{f('commission', 'Commission (%)')}
      </div>
      <p className="text-sm text-stone-500">Rating {m.rating} · {m.active ? 'Active' : 'Deactivated'}{!edit && ' · your role can view but not edit'}</p>
      <div className="flex gap-2">
        <button className={btn} disabled={!edit || busy} onClick={() => run(() => merchants.update(m.id, { phone: d.phone, smsNumber: d.smsNumber, hours: d.hours, commissionPct: Number(d.commission) }))}>Save changes</button>
        <button className={ghost} disabled={!edit || busy} onClick={() => run(() => merchants.testSms(m.id))}>Send test SMS</button>
        <button className={ghost} disabled={!edit || busy} onClick={() => run(() => merchants.update(m.id, { active: !m.active }))}>{m.active ? 'Deactivate' : 'Reactivate'}</button>
      </div>
    </div>
  );
}

function Menu({ m, run, edit }: { m: Merchant; run: Run; edit: boolean }) {
  const [pct, setPct] = useState('');
  const [add, setAdd] = useState({ cat: m.categories[0]?.id ?? '', name: '', price: '' });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded border border-stone-300 bg-white p-3 text-sm">
        <span className="font-medium">Change all prices by</span>
        <input className={input + ' w-20'} placeholder="e.g. 5" disabled={!edit} value={pct} onChange={(e) => setPct(e.target.value)} /> %
        <button className={btn} disabled={!edit || !pct} onClick={() => { run(() => merchants.bulkPrice(m.id, Number(pct))); setPct(''); }}>Apply to all items</button>
        <span className="mx-2 text-stone-300">|</span>
        <select className={input} disabled={!edit} value={add.cat} onChange={(e) => setAdd({ ...add, cat: e.target.value })}>{m.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input className={input + ' w-40'} placeholder="New item name" disabled={!edit} value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
        <input className={input + ' w-24'} placeholder="Price (KES)" disabled={!edit} value={add.price} onChange={(e) => setAdd({ ...add, price: e.target.value })} />
        <button className={btn} disabled={!edit} onClick={() => { run(() => merchants.addItem(m.id, add.cat, add.name, Number(add.price))); setAdd({ ...add, name: '', price: '' }); }}>Add item</button>
      </div>
      {m.categories.map((c) => (
        <div key={c.id} className="rounded border border-stone-300 bg-white p-3">
          <h3 className="mb-1 font-semibold">{c.name}</h3>
          {c.items.map((i) => (
            <div key={i.id} className={`flex items-center gap-3 border-b border-stone-100 py-1.5 text-sm ${i.available ? '' : 'text-stone-400'}`}>
              <span className="w-44 font-medium">{i.name}</span>
              <span className="flex-1 text-xs text-stone-500">{i.options.length ? i.options.map((o) => `${o.name}: ${o.required ? 'required' : 'optional'}, pick ${o.min}–${o.max}`).join(' · ') : 'No options'}</span>
              <input key={i.id + i.priceMinor} className={input + ' w-24 text-right'} disabled={!edit} defaultValue={i.priceMinor / 100}
                title={money(i.priceMinor)} onBlur={(e) => { const v = Math.round(Number(e.target.value) * 100); if (v !== i.priceMinor) run(() => merchants.setItem(m.id, i.id, { priceMinor: v })); }} />
              <button className={ghost} disabled={!edit} onClick={() => run(() => merchants.setItem(m.id, i.id, { available: !i.available }))}>{i.available ? 'Mark sold out' : 'Back in stock'}</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}