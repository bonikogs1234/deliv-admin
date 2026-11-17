import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { ridesApi, type Ride, type RideStatus } from '../lib/rides';
import { settingsApi } from '../lib/settings';
import { can } from '../lib/permissions';
import { ageMin, money } from '../lib/format';

const COLS: [string, RideStatus[], string][] = [
  ['Requested', ['REQUESTED'], 'border-t-amber-500'], ['Offered', ['OFFERED'], 'border-t-sky-500'],
  ['Driver on the way', ['DRIVER_MATCHED', 'DRIVER_ARRIVING'], 'border-t-violet-500'], ['In trip', ['IN_TRIP'], 'border-t-emerald-500'],
  ['Done', ['COMPLETED', 'CANCELLED', 'UNMATCHED'], 'border-t-stone-400'],
];
const btn = 'rounded bg-accent px-2.5 py-1 text-xs text-white disabled:opacity-40';
const ghost = 'rounded border border-stone-400 px-2.5 py-1 text-xs disabled:opacity-40';
const input = 'rounded border border-stone-300 px-2 py-1 text-sm';

export default function Rides() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const [cancelFor, setCancelFor] = useState<Ride | null>(null);
  const [reason, setReason] = useState('');
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const q = useQuery({ queryKey: ['rides'], queryFn: ridesApi.list, refetchInterval: 5000 });
  const flag = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get }).data?.ridesEnabled;
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['rides'] }); if (typeof d === 'string') setMsg(d); },
  });
  const run = (fn: () => Promise<unknown>) => { setMsg(''); m.mutate(fn); };

  if (!can(user!.role, 'rides.view')) return <p className="text-stone-600">Your role does not have access to rides.</p>;
  const act = can(user!.role, 'rides.act');
  const list = q.data ?? [];
  const sos = list.filter((r) => r.sos && r.status !== 'COMPLETED' && r.status !== 'CANCELLED');
  const left = (r: Ride) => Math.max(0, Math.round((new Date(r.offerExpiresAt!).getTime() - Date.now()) / 1000));

  return (
    <div className="min-w-[1100px] space-y-3">
      {flag === 'off' && <p className="rounded bg-stone-200 p-2 text-sm text-stone-700">Rides are switched off for customers in Settings. You are looking at sample rides.</p>}
      {sos.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <span><b>SOS</b> on ride {r.code}: {r.rider} is in a trip with {r.driver?.name}.</span>
          <a className="rounded bg-red-700 px-3 py-1 text-white" href={`tel:${r.phone}`}>Call {r.rider}</a>
        </div>
      ))}
      {cancelFor && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-stone-300 bg-white p-3 text-sm">
          <b>Cancel ride {cancelFor.code}</b>
          <input className={input + ' w-80'} placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className={btn} onClick={() => { run(() => ridesApi.cancel(cancelFor.id, reason)); setCancelFor(null); setReason(''); }}>Cancel ride</button>
          <button className={ghost} onClick={() => setCancelFor(null)}>Keep ride</button>
        </div>
      )}
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}
      {m.error && <p className="text-sm text-red-700">{(m.error as Error).message}</p>}

      <div className="grid grid-cols-5 gap-3">
        {COLS.map(([title, statuses, top]) => {
          const col = list.filter((r) => statuses.includes(r.status));
          return (
            <section key={title} className={`rounded border-t-4 bg-stone-200/60 p-2 ${top}`}>
              <h2 className="mb-2 flex justify-between px-1 text-sm font-semibold">{title}<span className="rounded-full bg-white px-2 text-xs font-medium text-stone-600">{col.length}</span></h2>
              <div className="space-y-2">
                {col.length === 0 && <p className="px-1 text-sm text-stone-500">No rides</p>}
                {col.map((r) => (
                  <div key={r.id} className="rounded border border-stone-300 bg-white p-3 text-sm">
                    <div className="flex justify-between font-semibold"><span>{r.code} · {r.vehicle}</span><span>{money(r.fareMinor)}</span></div>
                    <p className="mt-1 text-stone-700">{r.pickup} → {r.dropoff}</p>
                    <p className="mt-1 text-xs text-stone-500">{r.rider} · <a className="text-accent underline" href={`tel:${r.phone}`}>call</a> · {ageMin(r.requestedAt)} min ago</p>
                    {r.driver && <p className="text-xs text-stone-500">Driver: {r.driver.name} · <a className="text-accent underline" href={`tel:${r.driver.phone}`}>call</a></p>}
                    {r.status === 'OFFERED' && r.offerExpiresAt && <p className="mt-1 font-medium text-sky-700">Offer ends in {left(r)} s</p>}
                    {r.status === 'UNMATCHED' && <p className="mt-1 font-medium text-amber-700">No driver accepted</p>}
                    {r.status === 'CANCELLED' && <p className="mt-1 text-xs text-red-700">Cancelled: {r.cancelReason}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(r.status === 'REQUESTED' || r.status === 'UNMATCHED') && <button className={btn} disabled={!act} onClick={() => run(() => ridesApi.offer(r.id))}>Offer to drivers</button>}
                      {r.status === 'OFFERED' && <button className={ghost} title="Demo only: pretends a driver tapped Accept" onClick={() => run(() => ridesApi.simulateAccept(r.id))}>Simulate accept</button>}
                      {!['COMPLETED', 'CANCELLED'].includes(r.status) && <button className={ghost} disabled={!act} onClick={() => setCancelFor(r)}>Cancel</button>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}