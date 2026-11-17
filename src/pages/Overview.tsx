import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { api } from '../lib/api';
import { couriers } from '../lib/couriers';
import { customers } from '../lib/customers';
import { isStale } from '../lib/dispatch';
import { pay } from '../lib/payments';
import { can } from '../lib/permissions';
import { ageMin, money, STATUS_LABEL } from '../lib/format';
import type { OrderStatus } from '../lib/types';

const TONE: Record<string, string> = { amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800', blue: 'bg-sky-100 text-sky-800', grey: 'bg-stone-200 text-stone-700' };
const STATUS_TONE = (s: OrderStatus) =>
  s === 'AWAITING_MERCHANT' || s === 'PLACED' ? 'bg-amber-100 text-amber-800' : s === 'PREPARING' ? 'bg-sky-100 text-sky-800'
  : s === 'READY_FOR_PICKUP' || s === 'RIDER_ASSIGNED' ? 'bg-violet-100 text-violet-800' : s === 'CANCELLED' ? 'bg-red-100 text-red-800'
  : s === 'DELIVERED' ? 'bg-stone-200 text-stone-700' : 'bg-emerald-100 text-emerald-800';

function Kpi({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded border border-stone-300 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${warn ? 'text-red-700' : ''}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    </div>
  );
}

export default function Overview() {
  const role = useAuth().user!.role;
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.listOrders, refetchInterval: 10000 }).data ?? [];
  const riders = (useQuery({ queryKey: ['couriers'], queryFn: couriers.list, refetchInterval: 10000 }).data ?? []).filter((r) => r.active !== false);
  const money_ = useQuery({ queryKey: ['payments'], queryFn: pay.all, enabled: can(role, 'payments.view') }).data;
  const cust = useQuery({ queryKey: ['customers'], queryFn: customers.list, enabled: can(role, 'customers.view') }).data;

  const active = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const late = active.filter((o) => ageMin(o.placedAt) >= 20).length;
  const toDispatch = orders.filter((o) => (o.status === 'PREPARING' || o.status === 'READY_FOR_PICKUP') && !o.courier).length;
  const value = orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.amountMinor, 0);
  const online = riders.filter((r) => r.availability === 'online' && !isStale(r)).length;
  const cash = riders.reduce((s, r) => s + (r.cashHeldMinor ?? 0), 0);

  const alerts: { n: number; text: string; to: string; tone: string }[] = [
    { n: toDispatch, text: 'orders need a courier', to: '/dispatch', tone: 'amber' },
    { n: late, text: 'orders have waited 20 minutes or more', to: '/board', tone: 'red' },
    { n: money_?.refunds.filter((r) => r.status === 'requested' || r.status === 'approved').length ?? 0, text: 'refunds are waiting', to: '/payments', tone: 'blue' },
    { n: money_?.recon.filter((r) => !r.resolution).length ?? 0, text: 'payments need reconciling', to: '/payments', tone: 'blue' },
    { n: cust?.filter((c) => c.deletionRequestedAt).length ?? 0, text: 'customers asked to be deleted', to: '/customers', tone: 'grey' },
  ].filter((a) => a.n > 0);
  const recent = [...orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Active orders" value={active.length} sub={`${orders.length} today in total`} />
        <Kpi label="Order value today" value={money(value)} sub="excluding cancelled" />
        <Kpi label="Couriers online" value={`${online} / ${riders.length}`} sub="seen in the last 3 hours" />
        <Kpi label="Cash held by couriers" value={money(cash)} sub="not yet handed in" warn={cash > 500000} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <section className="rounded border border-stone-300 bg-white p-4">
          <h2 className="mb-3 font-semibold">Needs attention</h2>
          {alerts.length === 0 && <p className="text-sm text-stone-500">Nothing needs attention right now.</p>}
          <div className="space-y-2">
            {alerts.map((a) => (
              <Link key={a.text} to={a.to} className="flex items-center gap-3 rounded border border-stone-200 p-2.5 text-sm hover:bg-stone-50">
                <span className={`grid h-7 min-w-7 place-items-center rounded px-1.5 text-sm font-semibold ${TONE[a.tone]}`}>{a.n}</span>
                <span className="flex-1">{a.text}</span><span className="text-stone-400">›</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded border border-stone-300 bg-white">
          <div className="flex items-center justify-between p-4 pb-2">
            <h2 className="font-semibold">Recent orders</h2>
            <Link to="/board" className="text-sm text-accent hover:underline">Open live board</Link>
          </div>
          <div className="text-sm">
            {recent.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="grid grid-cols-[4rem_1fr_9rem_6rem_4rem] items-center gap-3 border-t border-stone-100 px-4 py-2.5 hover:bg-stone-50">
                <span className="font-semibold">#{o.code}</span>
                <span className="truncate text-stone-700">{o.merchantName}</span>
                <span><span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_TONE(o.status)}`}>{STATUS_LABEL[o.status]}</span></span>
                <span className="text-right">{money(o.amountMinor, o.currency)}</span>
                <span className="text-right text-xs text-stone-500">{ageMin(o.placedAt)} min</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}