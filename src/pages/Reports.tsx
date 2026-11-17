import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { MERCHANT_SHARES, reportsApi } from '../lib/reports';
import { can } from '../lib/permissions';
import { money } from '../lib/format';

const box = 'rounded border border-stone-300 bg-white';
const input = 'rounded border border-stone-300 px-2 py-1 text-sm';
const iso = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

function download(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

export default function Reports() {
  const { user } = useAuth();
  const [from, setFrom] = useState(iso(6));
  const [to, setTo] = useState(iso(0));
  const q = useQuery({ queryKey: ['reports'], queryFn: reportsApi.days });
  if (!can(user!.role, 'reports.view')) return <p className="text-stone-600">Your role does not have access to reports.</p>;
  if (q.isLoading || !q.data) return <p>Loading reports…</p>;

  const days = q.data.filter((d) => d.date >= from && d.date <= to);
  const sum = (k: 'orders' | 'cancelled' | 'gmvMinor' | 'commissionMinor' | 'courierPayMinor') => days.reduce((s, d) => s + d[k], 0);
  const max = Math.max(1, ...days.map((d) => d.orders));
  const statements = MERCHANT_SHARES.map(([name, share, pct]) => {
    const gross = Math.round(sum('gmvMinor') * share);
    const commission = Math.round((gross * pct) / 100);
    return { name, orders: Math.round(sum('orders') * share), gross, pct, commission, payable: gross - commission };
  });
  const cards: [string, string][] = [['Orders', String(sum('orders'))], ['Order value', money(sum('gmvMinor'))], ['Commission', money(sum('commissionMinor'))], ['Courier pay', money(sum('courierPayMinor'))]];

  return (
    <div className="min-w-[900px] space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="text-stone-600">From <input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-stone-600">To <input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        {([['Last 7 days', 6], ['Last 30 days', 29]] as const).map(([l, n]) => <button key={l} className="rounded border border-stone-400 px-2.5 py-1" onClick={() => { setFrom(iso(n)); setTo(iso(0)); }}>{l}</button>)}
        <span className="ml-auto flex gap-2">
          <button className="rounded border border-stone-400 px-2.5 py-1" onClick={() => download('daily.csv', [['Date', 'Orders', 'Cancelled', 'Order value KES', 'Commission KES', 'Courier pay KES'], ...days.map((d) => [d.date, d.orders, d.cancelled, d.gmvMinor / 100, d.commissionMinor / 100, d.courierPayMinor / 100])])}>Export daily CSV</button>
          <button className="rounded border border-stone-400 px-2.5 py-1" onClick={() => download('merchant-statements.csv', [['Merchant', 'Orders', 'Gross KES', 'Commission %', 'Commission KES', 'Payable KES'], ...statements.map((s) => [s.name, s.orders, s.gross / 100, s.pct, s.commission / 100, s.payable / 100])])}>Export statements CSV</button>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map(([l, v]) => <div key={l} className={`${box} p-4`}><div className="text-xs font-medium uppercase tracking-wide text-stone-500">{l}</div><div className="mt-1 text-2xl font-semibold">{v}</div></div>)}
      </div>

      <div className={`${box} p-4`}>
        <h2 className="mb-3 font-semibold">Orders per day</h2>
        {days.length === 0 ? <p className="text-sm text-stone-500">No data in this range.</p> : (
          <div className="flex h-36 items-end gap-1">
            {days.map((d) => <div key={d.date} title={`${d.date}: ${d.orders} orders`} className="flex-1 rounded-t bg-accent/80 hover:bg-accent" style={{ height: `${(d.orders / max) * 100}%` }} />)}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${box} text-sm`}>
          <h2 className="p-4 pb-2 font-semibold">Merchant statements</h2>
          <div className="grid grid-cols-[1.6fr_0.6fr_1fr_1fr] gap-2 border-b border-stone-200 px-4 pb-2 text-xs font-semibold text-stone-500"><span>Merchant</span><span>Orders</span><span>Commission</span><span>Payable</span></div>
          {statements.map((s) => (
            <div key={s.name} className="grid grid-cols-[1.6fr_0.6fr_1fr_1fr] gap-2 border-b border-stone-100 px-4 py-2"><span className="truncate">{s.name}</span><span>{s.orders}</span><span>{money(s.commission)} <span className="text-xs text-stone-400">({s.pct}%)</span></span><span className="font-medium">{money(s.payable)}</span></div>
          ))}
        </div>
        <div className={`${box} max-h-80 overflow-y-auto text-sm`}>
          <h2 className="p-4 pb-2 font-semibold">Daily detail</h2>
          {[...days].reverse().map((d) => (
            <div key={d.date} className="grid grid-cols-[1fr_0.6fr_0.6fr_1.2fr] gap-2 border-t border-stone-100 px-4 py-1.5"><span>{d.date}</span><span>{d.orders}</span><span className="text-stone-500">{d.cancelled} cancelled</span><span className="text-right">{money(d.gmvMinor)}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}