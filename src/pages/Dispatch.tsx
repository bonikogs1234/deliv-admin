import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { api } from '../lib/api';
import { dispatch, isStale, type Rider } from '../lib/dispatch';
import { can } from '../lib/permissions';
import { ageMin, money, STATUS_LABEL } from '../lib/format';

export default function Dispatch() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sel, setSel] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const poll = { refetchInterval: 10000 };
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.listOrders, ...poll });
  const riders = useQuery({ queryKey: ['riders'], queryFn: dispatch.listRiders, ...poll });
  const offers = useQuery({ queryKey: ['offers'], queryFn: dispatch.listOffers, ...poll });
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => { ['orders', 'riders', 'offers', 'order'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setPicked([]); },
  });

  const canAssign = can(user!.role, 'orders.assign');
  const list = orders.data ?? [];
  const todo = list.filter((o) => (o.status === 'PREPARING' || o.status === 'READY_FOR_PICKUP') && !o.courier);
  const order = todo.find((o) => o.id === sel);
  const open = (offers.data ?? []).filter((f) => f.status === 'sent');
  const byContainer = (riders.data ?? []).reduce<Record<string, Rider[]>>((a, r) => ((a[r.container] ??= []).push(r), a), {});
  const code = (id: string) => list.find((o) => o.id === id)?.code ?? id;
  const name = (id: string) => riders.data?.find((r) => r.id === id)?.name ?? id;
  const box = 'rounded border border-stone-300 bg-white p-3';
  const btn = 'rounded bg-accent px-2.5 py-1 text-sm text-white disabled:opacity-40';
  const ghost = 'rounded border border-stone-400 px-2.5 py-1 text-sm disabled:opacity-40';

  return (
    <div className="grid min-w-[900px] gap-4 lg:grid-cols-[18rem_1fr]">
      <section>
        <h2 className="mb-2 text-sm font-semibold">Orders to dispatch <span className="text-stone-500">{todo.length}</span></h2>
        <div className="space-y-2">
          {todo.length === 0 && <p className="text-sm text-stone-400">Nothing waiting for a courier.</p>}
          {todo.map((o) => (
            <button key={o.id} onClick={() => { setSel(o.id); setPicked([]); }} className={`block w-full rounded border bg-white p-3 text-left text-sm ${sel === o.id ? 'border-accent ring-1 ring-accent' : 'border-stone-300'}`}>
              <div className="flex justify-between font-medium"><span>#{o.code}</span><span>{money(o.amountMinor, o.currency)}</span></div>
              <div className="text-stone-600">Pickup: {o.merchantName}</div>
              <div className="text-xs text-stone-500">{STATUS_LABEL[o.status]} · {ageMin(o.placedAt)} min · {open.filter((f) => f.orderId === o.id).length} open offers</div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className={box}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{order ? `Couriers for #${order.code}` : 'Couriers'}</h2>
            {order && <Link to={`/orders/${order.id}`} className="text-sm text-accent underline">Order detail</Link>}
          </div>
          {!canAssign && <p className="mt-1 text-sm text-stone-500">Your role can view dispatch but not send offers.</p>}
          {!order && canAssign && <p className="mt-1 text-sm text-stone-500">Choose an order on the left, then pick couriers.</p>}
          {Object.entries(byContainer).map(([c, rs]) => (
            <div key={c} className="mt-3">
              <h3 className="text-sm font-medium">{c} <span className="text-stone-500">{rs.filter((r) => r.availability === 'online' && !isStale(r)).length} online</span></h3>
              {rs.map((r) => {
                const stale = isStale(r);
                const free = r.availability === 'online' && !stale;
                return (
                  <div key={r.id} className="flex items-center gap-3 border-b border-stone-100 py-1.5 text-sm">
                    <input type="checkbox" disabled={!order || !canAssign || !free} checked={picked.includes(r.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, r.id] : picked.filter((x) => x !== r.id))} />
                    <span className="w-36 font-medium">{r.name}</span>
                    <span className="w-44 truncate text-stone-600">{r.vehicle}</span>
                    <span className={`w-16 rounded px-1.5 text-center text-xs ${stale ? 'bg-amber-100 text-amber-800' : r.availability === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200'}`}>{stale ? 'stale' : r.availability}</span>
                    <span className="flex-1 text-xs text-stone-500">seen {r.lastSeenMin >= 60 ? `${Math.floor(r.lastSeenMin / 60)} h` : `${r.lastSeenMin} min`} ago</span>
                    <button className={ghost} disabled={!order || !canAssign || r.availability === 'busy' || m.isPending} onClick={() => m.mutate(() => dispatch.assignDirect(order!.id, r.id, user!.name))}>Assign directly</button>
                  </div>
                );
              })}
            </div>
          ))}
          <button className={btn + ' mt-3'} disabled={!order || !canAssign || picked.length === 0 || m.isPending} onClick={() => m.mutate(() => dispatch.sendOffers(order!.id, picked))}>
            Send offer to {picked.length || 'selected'} {picked.length === 1 ? 'courier' : 'couriers'}
          </button>
          {m.error && <p className="mt-2 text-sm text-red-700">{(m.error as Error).message}</p>}
        </div>

        <div className={box}>
          <h2 className="mb-1 font-semibold">Open offers <span className="text-stone-500">{open.length}</span></h2>
          {open.length === 0 && <p className="text-sm text-stone-400">No offers waiting for an answer.</p>}
          {open.map((f) => (
            <div key={f.id} className="flex items-center gap-3 border-b border-stone-100 py-1.5 text-sm">
              <span className="w-16 font-medium">#{code(f.orderId)}</span>
              <span className="flex-1">{name(f.riderId)} · sent {ageMin(f.sentAt)} min ago</span>
              <button className={ghost} disabled={!canAssign || m.isPending} onClick={() => m.mutate(() => dispatch.withdraw(f.id))}>Withdraw</button>
              <button className={ghost} title="Demo only: pretends the courier tapped Accept" disabled={m.isPending} onClick={() => m.mutate(() => dispatch.simulateAccept(f.id))}>Simulate accept</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}