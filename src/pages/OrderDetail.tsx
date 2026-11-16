import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { api } from '../lib/api';
import { can } from '../lib/permissions';
import { money, STATUS_LABEL, time } from '../lib/format';
import type { Action } from '../lib/types';

export default function OrderDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [courier, setCourier] = useState('');

  const q = useQuery({ queryKey: ['order', id], queryFn: () => api.getOrder(id), refetchInterval: 10000 });
  const m = useMutation({
    mutationFn: (a: Action) => api.act(id, a, user!.name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      setNote(''); setReason('');
    },
  });

  if (q.isLoading) return <p>Loading order…</p>;
  if (q.error || !q.data) return <p className="text-red-700">Order not found. <Link to="/" className="underline">Back to the live board</Link></p>;

  const o = q.data;
  const role = user!.role;
  const box = 'rounded border border-stone-300 bg-white p-4';
  const input = 'w-full rounded border border-stone-300 px-2 py-1.5 text-sm';
  const btn = 'rounded bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-50';
  const total = o.items.reduce((s, i) => s + i.qty * i.unitMinor, 0);
  const canConfirm = can(role, 'orders.confirm') && o.status === 'AWAITING_MERCHANT';
  const canReady = can(role, 'orders.confirm') && o.status === 'PREPARING';
  const canAssign = can(role, 'orders.assign') && (o.status === 'PREPARING' || o.status === 'READY_FOR_PICKUP');
  const canCancel = can(role, 'orders.cancel') && !['PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED'].includes(o.status);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link to="/" className="text-sm text-accent underline">Live board</Link>
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Order #{o.code} · {o.merchantName}</h1>
        <span className="rounded bg-stone-200 px-2 py-1 text-sm">{STATUS_LABEL[o.status]}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className={box}>
          <h2 className="mb-2 font-semibold">Items</h2>
          {o.items.map((i) => (
            <div key={i.name} className="flex justify-between text-sm"><span>{i.qty} × {i.name}</span><span>{money(i.qty * i.unitMinor, o.currency)}</span></div>
          ))}
          <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-sm"><span>Items total</span><span>{money(total, o.currency)}</span></div>
          <div className="flex justify-between text-sm font-medium"><span>Order total</span><span>{money(o.amountMinor, o.currency)}</span></div>
          <p className="mt-2 text-xs text-stone-500">{o.paymentMethod === 'MPESA' ? 'M-Pesa' : 'Cash on delivery'} · {o.paymentStatus === 'PAID' ? 'paid' : 'payment pending'}</p>
        </section>

        <section className={box + ' space-y-1 text-sm'}>
          <h2 className="mb-2 font-semibold">Customer and delivery</h2>
          <p>{o.customer.name} · <a className="text-accent underline" href={`tel:${o.customer.phone}`}>{o.customer.phone}</a></p>
          <p>{o.address}</p>
          <p className="pt-2">Courier: {o.courier ? <>{o.courier.name} · <a className="text-accent underline" href={`tel:${o.courier.phone}`}>{o.courier.phone}</a></> : 'not assigned'}</p>
        </section>
      </div>

      <section className={box + ' space-y-3'}>
        <h2 className="font-semibold">Actions</h2>
        {!(canConfirm || canReady || canAssign || canCancel) && <p className="text-sm text-stone-500">No actions available for your role or this status.</p>}
        {canConfirm && (
          <div className="flex gap-2">
            <input className={input} placeholder="Note, e.g. Confirmed by phone, ready in 20 min" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className={btn} disabled={m.isPending} onClick={() => m.mutate({ type: 'confirm', note })}>Confirm for merchant</button>
          </div>
        )}
        {canReady && <button className={btn} disabled={m.isPending} onClick={() => m.mutate({ type: 'ready' })}>Mark ready for pickup</button>}
        {canAssign && (
          <div className="flex gap-2">
            <select className={input} value={courier} onChange={(e) => setCourier(e.target.value)}>
              <option value="">Choose a courier</option>
              {api.couriers().map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
            <button className={btn} disabled={m.isPending} onClick={() => m.mutate({ type: 'assign', courier })}>Assign courier</button>
          </div>
        )}
        {canCancel && (
          <div className="flex gap-2">
            <input className={input} placeholder="Reason for cancelling" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button className="rounded border border-red-700 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50" disabled={m.isPending} onClick={() => m.mutate({ type: 'cancel', reason })}>Cancel order</button>
          </div>
        )}
        {m.error && <p className="text-sm text-red-700">{(m.error as Error).message}</p>}
      </section>

      <section className={box}>
        <h2 className="mb-2 font-semibold">Timeline</h2>
        <ol className="space-y-1 text-sm">
          {[...o.events].reverse().map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-12 shrink-0 text-stone-500">{time(e.at)}</span>
              <span><span className="font-medium">{STATUS_LABEL[e.status]}</span> by {e.actor}{e.note && <span className="text-stone-600"> — {e.note}</span>}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
