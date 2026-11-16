import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { COLUMNS, ageMin, money, STATUS_LABEL } from '../lib/format';

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
          <section key={title} className="flex min-h-0 flex-col">
            <h2 className="mb-2 flex justify-between text-sm font-semibold">{title}<span className="text-stone-500">{col.length}</span></h2>
            <div className="space-y-2 overflow-y-auto">
              {col.length === 0 && <p className="text-sm text-stone-400">No orders</p>}
              {col.map((o) => {
                const age = ageMin(o.placedAt);
                const late = done ? '' : age >= 20 ? 'border-l-red-600' : age >= 10 ? 'border-l-amber-500' : 'border-l-stone-300';
                return (
                  <Link key={o.id} to={`/orders/${o.id}`} className={`block rounded border border-stone-300 border-l-4 bg-white p-3 text-sm hover:bg-stone-50 ${late || 'border-l-stone-300'}`}>
                    <div className="flex justify-between font-medium"><span>#{o.code}</span><span>{money(o.amountMinor, o.currency)}</span></div>
                    <div className="truncate text-stone-600">{o.merchantName}</div>
                    <div className="mt-1 flex justify-between text-xs text-stone-500">
                      <span>{o.paymentMethod === 'MPESA' ? 'M-Pesa' : 'Cash'} · {o.paymentStatus === 'PAID' ? 'paid' : 'pending'}</span>
                      <span>{done ? STATUS_LABEL[o.status] : `${age} min`}</span>
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
