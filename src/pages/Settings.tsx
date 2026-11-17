import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { ZONE_NAMES, settingsApi, type Settings } from '../lib/settings';
import { can } from '../lib/permissions';

type NumKey = 'stageSeconds' | 'maxStages' | 'maxRidersPerStage' | 'merchantEscalationMin' | 'maxCashOrderKes' | 'firstOrderCashKes' | 'noShowBlockAt';
const box = 'rounded border border-stone-300 bg-white p-4 space-y-3';
const input = 'rounded border border-stone-300 px-2 py-1 text-sm';
const btn = 'rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40';

export default function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const q = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get });
  const m = useMutation({
    mutationFn: (n: Settings) => settingsApi.save(n, user!.name),
    onSuccess: (d) => { setMsg(d); qc.invalidateQueries({ queryKey: ['settings'] }); qc.invalidateQueries({ queryKey: ['audit'] }); },
  });
  if (!can(user!.role, 'settings.manage')) return <p className="text-stone-600">Only the owner can change settings.</p>;
  if (q.isLoading || !q.data) return <p>Loading settings…</p>;
  return <Form key={JSON.stringify(q.data)} init={q.data} onSave={(n) => { setMsg(''); m.mutate(n); }} busy={m.isPending} msg={msg} err={m.error as Error | null} />;
}

function Form({ init, onSave, busy, msg, err }: { init: Settings; onSave: (s: Settings) => void; busy: boolean; msg: string; err: Error | null }) {
  const [d, setD] = useState<Settings>(init);
  const N = (k: NumKey, label: string, unit: string, hint?: string) => (
    <label className="block text-sm text-stone-600">{label}
      <div className="mt-1 flex items-center gap-2">
        <input className={input + ' w-24'} value={String(d[k])} onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) setD({ ...d, [k]: v }); }} />
        <span className="text-xs text-stone-500">{unit}</span>
      </div>
      {hint && <span className="text-xs text-stone-400">{hint}</span>}
    </label>
  );
  const T = (k: 'smsMerchant' | 'smsCourier' | 'smsDelivered', label: string) => (
    <label className="block text-sm text-stone-600">{label}
      <textarea className={input + ' mt-1 w-full'} rows={2} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
      <span className="text-xs text-stone-400">{d[k].length} characters</span>
    </label>
  );
  const toggleZone = (z: string) => setD({ ...d, ridesZones: d.ridesZones.includes(z) ? d.ridesZones.filter((x) => x !== z) : [...d.ridesZones, z] });

  return (
    <div className="max-w-3xl space-y-4">
      <section className={box}>
        <h2 className="font-semibold">Dispatch</h2>
        <label className="block text-sm text-stone-600">Mode
          <select className={input + ' mt-1 block'} value={d.dispatchMode} onChange={(e) => setD({ ...d, dispatchMode: e.target.value as Settings['dispatchMode'] })}>
            <option value="auto_container">Automatic by container</option><option value="manual">Manual only</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {N('stageSeconds', 'Time per stage', 'seconds')}{N('maxStages', 'Containers tried', 'stages')}
          {N('maxRidersPerStage', 'Riders texted per stage', 'riders', '0 means everyone')}{N('merchantEscalationMin', 'Alert when merchant is silent', 'minutes')}
        </div>
      </section>

      <section className={box}>
        <h2 className="font-semibold">Order limits</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {N('maxCashOrderKes', 'Largest cash order', 'KES')}{N('firstOrderCashKes', 'Cash limit, first order', 'KES')}{N('noShowBlockAt', 'Block after', 'no-shows')}
        </div>
      </section>

      <section className={box}>
        <h2 className="font-semibold">Rides (feature flag)</h2>
        <div className="flex gap-4 text-sm">
          {([['off', 'Off'], ['zones', 'Selected zones'], ['all', 'Everyone']] as const).map(([v, l]) => (
            <label key={v} className="flex items-center gap-1.5"><input type="radio" checked={d.ridesEnabled === v} onChange={() => setD({ ...d, ridesEnabled: v })} />{l}</label>
          ))}
        </div>
        {d.ridesEnabled === 'zones' && (
          <div className="flex gap-4 text-sm">{ZONE_NAMES.map((z) => <label key={z} className="flex items-center gap-1.5"><input type="checkbox" checked={d.ridesZones.includes(z)} onChange={() => toggleZone(z)} />{z}</label>)}</div>
        )}
      </section>

      <section className={box}>
        <h2 className="font-semibold">SMS and support</h2>
        <label className="block text-sm text-stone-600">Support phone<input className={input + ' mt-1 block w-48'} value={d.supportPhone} onChange={(e) => setD({ ...d, supportPhone: e.target.value })} /></label>
        {T('smsMerchant', 'To merchant, new order (use {code} and {link})')}
        {T('smsCourier', 'To courier, job offer (use {merchant} and {link})')}
        {T('smsDelivered', 'To customer, delivered (use {code})')}
      </section>

      {msg && <p className="text-sm text-emerald-800">{msg}</p>}
      {err && <p className="text-sm text-red-700">{err.message}</p>}
      <button className={btn} disabled={busy} onClick={() => onSave(d)}>Save settings</button>
    </div>
  );
}