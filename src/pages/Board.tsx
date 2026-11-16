import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { COLUMNS, ageMin, money, STATUS_LABEL } from '../lib/format';

const TOP = ['border-t-amber-500', 'border-t-sky-500', 'border-t-violet-500', 'border-t-emerald-500', 'border-t-stone-400'];

export default function Board() {
  // Polling every 10 s is the doc's fallback; swap for the admin:orders WebSocket later.
  const { data = [], isLoading, error } = useQuery({ queryKey: ['orders'], queryFn: api.listOrders, refetchInterval: 10000 });
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  if (isLoading) return <p>Loading orders…</p>;
  if (error) return <p className="text-red-700">Could not load orders. Check your connection and try again.</p>;

  return (
    <div className="grid h-full min-w-[1100px] grid-cols-5 gap-3">
      {COLUMNS.map(([title, statuses], i) => {
        const col = data.filter((o) => statuses.includes(o.status));
        const done = i === 4;
        return (
          <section key={title} className={`flex min-h-0 flex-col rounded border-t-4 bg-stone-200/60 p-2 ${TOP[i]}`}>
            <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-semibold">
              {title}
              <span className="rounded-full bg-white px-2 text-xs font-medium text-stone-600">{col.length}</span>
            </h2>
            <div className="space-y-2 overflow-y-auto">
              {col.length === 0 && <p className="px-1 text-sm text-stone-500">No orders</p>}
              {col.map((o) => {
                const age = ageMin(o.placedAt);
                const edge = done ? 'border-l-stone-300' : age >= 20 ? 'border-l-red-600' : age >= 10 ? 'border-l-amber-500' : 'border-l-stone-300';
                const ageText = age >= 20 ? 'font-medium text-red-700' : age >= 10 ? 'font-medium text-amber-700' : 'text-stone-500';
                return (
                  <Link key={o.id} to={`/orders/${o.id}`} className={`block rounded border border-l-4 border-stone-300 bg-white p-3 text-sm hover:bg-stone-50 ${edge}`}>
                    <div className="flex justify-between font-semibold"><span>#{o.code}</span><span>{money(o.amountMinor, o.currency)}</span></div>
                    <div className="mt-0.5 truncate text-stone-700">{o.merchantName}</div>
                    <div className="mt-1.5 flex justify-between text-xs text-stone-500">
                      <span>{o.paymentMethod === 'MPESA' ? 'M-Pesa' : 'Cash'} · {o.paymentStatus === 'PAID' ? 'paid' : 'pending'}</span>
                      {done
                        ? <span className={o.status === 'CANCELLED' ? 'font-medium text-red-700' : ''}>{STATUS_LABEL[o.status]}</span>
                        : <span className={ageText}>{age} min</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
