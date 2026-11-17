import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { deliveryFee, zonesApi, type Pricing, type Promo, type Zone } from '../lib/zones';
import { can } from '../lib/permissions';
import { money } from '../lib/format';

type Run = (fn: () => Promise<unknown>) => void;
const box = 'rounded border border-stone-300 bg-white p-4';
const input = 'rounded border border-stone-300 px-2 py-1 text-sm';
const btn = 'rounded bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-40';
const ghost = 'rounded border border-stone-400 px-3 py-1.5 text-sm disabled:opacity-40';
const localNow = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const when = (iso: string) => new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });

export default function Zones() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'zones' | 'pricing' | 'promos'>('zones');
  const [sel, setSel] = useState('z1');
  const [msg, setMsg] = useState('');
  const q = useQuery({ queryKey: ['zones'], queryFn: zonesApi.all });
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['zones'] }); if (typeof d === 'string') setMsg(d); },
  });
  const run: Run = (fn) => { setMsg(''); m.mutate(fn); };

  if (!can(user!.role, 'zones.manage')) return <p className="text-stone-600">Only the owner can change zones and pricing.</p>;
  if (q.isLoading || !q.data) return <p>Loading zones…</p>;
  const { zones, pricing, promos } = q.data;
  const cur = zones.find((z) => z.id === sel);
  const TABS: [typeof tab, string][] = [['zones', 'Zones'], ['pricing', 'Service fee'], ['promos', 'Promo codes']];

  return (
    <div className="min-w-[900px] space-y-4">
      <div className="flex gap-2 text-sm">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded px-3 py-1.5 ${tab === k ? 'bg-accent text-white' : 'border border-stone-300 bg-white'}`}>{label}</button>
        ))}
      </div>
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}
      {m.error && <p className="text-sm text-red-700">{(m.error as Error).message}</p>}

      {tab === 'zones' && (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <div className="space-y-2">
            {zones.map((z) => (
              <button key={z.id} onClick={() => setSel(z.id)} className={`block w-full rounded border bg-white p-3 text-left text-sm ${sel === z.id ? 'border-accent ring-1 ring-accent' : 'border-stone-300'}`}>
                <div className="flex justify-between font-medium">{z.name}<span className={`rounded px-1.5 text-xs ${z.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>{z.active ? 'served' : 'off'}</span></div>
                <div className="text-xs text-stone-500">from {money(z.fee.baseMinor)}{z.scheduled && ' · change scheduled'}</div>
              </button>
            ))}
          </div>
          {cur && <ZoneDetail key={[cur.id, JSON.stringify(cur.fee), cur.active, cur.scheduled?.from].join('|')} z={cur} run={run} busy={m.isPending} />}
        </div>
      )}
      {tab === 'pricing' && <PricingTab key={pricing.serviceFeePct + '|' + pricing.serviceFeeCapMinor} p={pricing} run={run} />}
      {tab === 'promos' && <PromosTab rows={promos} run={run} />}
    </div>
  );
}

function ZoneDetail({ z, run, busy }: { z: Zone; run: Run; busy: boolean }) {
  const [d, setD] = useState({ base: String(z.fee.baseMinor / 100), km: String(z.fee.includedKm), perKm: String(z.fee.perKmMinor / 100), max: String(z.fee.maxMinor / 100) });
  const [from, setFrom] = useState(localNow());
  const [km, setKm] = useState('5');
  const f = (k: keyof typeof d, label: string, unit: string) => (
    <label className="block text-sm text-stone-600">{label}
      <div className="mt-1 flex items-center gap-1"><input className={input + ' w-full'} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} /><span className="text-xs text-stone-500">{unit}</span></div>
    </label>
  );
  return (
    <div className="space-y-4">
      <div className={box}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{z.name} delivery fee rule</h2>
          <button className={ghost} disabled={busy} onClick={() => run(() => zonesApi.setZoneActive(z.id, !z.active))}>{z.active ? 'Switch zone off' : 'Switch zone on'}</button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {f('base', 'Base fee', 'KES')}{f('km', 'Distance included', 'km')}{f('perKm', 'Each extra km', 'KES')}{f('max', 'Maximum fee', 'KES')}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm text-stone-600">Starts
            <input type="datetime-local" className={input + ' ml-2'} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <button className={btn} disabled={busy} onClick={() => run(() => zonesApi.saveFee(z.id, { base: Number(d.base), includedKm: Number(d.km), perKm: Number(d.perKm), max: Number(d.max) }, from))}>Save fee rule</button>
        </div>
        {z.scheduled && (
          <p className="mt-3 rounded bg-amber-50 p-2 text-sm text-amber-900">
            Scheduled for {when(z.scheduled.from)}: base {money(z.scheduled.fee.baseMinor)}, {z.scheduled.fee.includedKm} km included, {money(z.scheduled.fee.perKmMinor)} per extra km, max {money(z.scheduled.fee.maxMinor)}.
            <button className="ml-3 underline" onClick={() => run(() => zonesApi.cancelScheduled(z.id))}>Cancel change</button>
          </p>
        )}
      </div>
      <div className={box + ' text-sm'}>
        <h3 className="mb-2 font-semibold">Check a fee</h3>
        <div className="flex items-center gap-2">
          Distance <input className={input + ' w-20'} value={km} onChange={(e) => setKm(e.target.value)} /> km
          <span className="ml-3 text-lg font-semibold">{Number(km) >= 0 && km !== '' ? money(deliveryFee(z.fee, Number(km))) : '—'}</span>
          <span className="text-stone-500">using the rule that is live now</span>
        </div>
      </div>
    </div>
  );
}

function PricingTab({ p, run }: { p: Pricing; run: Run }) {
  const [pct, setPct] = useState(String(p.serviceFeePct));
  const [cap, setCap] = useState(String(p.serviceFeeCapMinor / 100));
  return (
    <div className={box + ' max-w-lg space-y-3 text-sm'}>
      <h2 className="font-semibold">Service fee</h2>
      <p className="text-stone-600">A percentage of the item subtotal, added to every order and capped so large orders are not overcharged.</p>
      <label className="block text-stone-600">Percent of subtotal<input className={input + ' mt-1 block w-32'} value={pct} onChange={(e) => setPct(e.target.value)} /></label>
      <label className="block text-stone-600">Maximum per order (KES)<input className={input + ' mt-1 block w-32'} value={cap} onChange={(e) => setCap(e.target.value)} /></label>
      <button className={btn} onClick={() => run(() => zonesApi.savePricing(Number(pct), Number(cap)))}>Save service fee</button>
    </div>
  );
}

function PromosTab({ rows, run }: { rows: Promo[]; run: Run }) {
  const blank = { code: '', kind: 'percent' as 'percent' | 'fixed', value: '', minOrder: '0', perUser: '1', total: '100', from: '', to: '' };
  const [n, setN] = useState(blank);
  const set = (k: keyof typeof blank, v: string) => setN({ ...n, [k]: v });
  return (
    <div className="space-y-4">
      <div className={box + ' flex flex-wrap items-end gap-2 text-sm'}>
        <label className="text-stone-600">Code<input className={input + ' mt-1 block w-32 uppercase'} value={n.code} onChange={(e) => set('code', e.target.value)} /></label>
        <label className="text-stone-600">Type<select className={input + ' mt-1 block'} value={n.kind} onChange={(e) => set('kind', e.target.value)}><option value="percent">Percent off</option><option value="fixed">Fixed KES off</option></select></label>
        <label className="text-stone-600">Value<input className={input + ' mt-1 block w-20'} value={n.value} onChange={(e) => set('value', e.target.value)} /></label>
        <label className="text-stone-600">Min order (KES)<input className={input + ' mt-1 block w-24'} value={n.minOrder} onChange={(e) => set('minOrder', e.target.value)} /></label>
        <label className="text-stone-600">Per user<input className={input + ' mt-1 block w-16'} value={n.perUser} onChange={(e) => set('perUser', e.target.value)} /></label>
        <label className="text-stone-600">Total uses<input className={input + ' mt-1 block w-20'} value={n.total} onChange={(e) => set('total', e.target.value)} /></label>
        <label className="text-stone-600">From<input type="date" className={input + ' mt-1 block'} value={n.from} onChange={(e) => set('from', e.target.value)} /></label>
        <label className="text-stone-600">To<input type="date" className={input + ' mt-1 block'} value={n.to} onChange={(e) => set('to', e.target.value)} /></label>
        <button className={btn} onClick={() => { run(() => zonesApi.addPromo({ code: n.code, kind: n.kind, value: Number(n.value), minOrder: Number(n.minOrder), perUser: Number(n.perUser), total: Number(n.total), from: n.from, to: n.to })); }}>Add promo</button>
      </div>
      <div className="rounded border border-stone-300 bg-white text-sm">
        {rows.map((r) => (
          <div key={r.id} className={`flex items-center gap-4 border-b border-stone-100 px-4 py-3 ${r.active ? '' : 'opacity-50'}`}>
            <span className="w-32 font-semibold">{r.code}</span>
            <span className="w-32">{r.kind === 'percent' ? `${r.value}% off` : `${money(r.value)} off`}</span>
            <span className="flex-1 text-stone-600">min order {money(r.minOrderMinor)} · {r.perUserLimit} per user · used {r.used} of {r.totalLimit} · {r.validFrom} to {r.validTo}</span>
            <button className={ghost} onClick={() => run(() => zonesApi.setPromoActive(r.id, !r.active))}>{r.active ? 'Switch off' : 'Switch on'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}