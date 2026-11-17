import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { customers, isActiveOrder, type Customer } from '../lib/customers';
import { can } from '../lib/permissions';
import { money } from '../lib/format';

type Run = (fn: () => Promise<unknown>) => void;
const box = 'rounded border border-stone-300 bg-white';
const input = 'rounded border border-stone-300 px-2 py-1 text-sm';
const btn = 'rounded bg-accent px-2.5 py-1 text-sm text-white disabled:opacity-40';
const ghost = 'rounded border border-stone-400 px-2.5 py-1 text-sm disabled:opacity-40';
const day = (iso: string) => new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' });
const digits = (s: string) => s.replace(/\D/g, '');

export default function Customers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState('c1');
  const [msg, setMsg] = useState('');
  const q = useQuery({ queryKey: ['customers'], queryFn: customers.list });
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['customers'] }); if (typeof d === 'string') setMsg(d); },
  });
  const run: Run = (fn) => { setMsg(''); m.mutate(fn); };
  const role = user!.role;

  if (!can(role, 'customers.view')) return <p className="text-stone-600">Your role does not have access to customers.</p>;
  if (q.isLoading) return <p>Loading customers…</p>;

  const term = search.trim();
  const list = (q.data ?? []).filter((c) => !term || (digits(term) && digits(c.phone).includes(digits(term))) || c.name.toLowerCase().includes(term.toLowerCase()));
  const cur = (q.data ?? []).find((c) => c.id === sel);

  return (
    <div className="grid min-w-[900px] gap-4 lg:grid-cols-[18rem_1fr]">
      <section className="space-y-2">
        <input className={input + ' w-full'} placeholder="Search by phone or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        {list.length === 0 && <p className="text-sm text-stone-500">No customers match.</p>}
        {list.map((c) => (
          <button key={c.id} onClick={() => { setSel(c.id); setMsg(''); }} className={`block w-full rounded border bg-white p-3 text-left text-sm ${sel === c.id ? 'border-accent ring-1 ring-accent' : 'border-stone-300'}`}>
            <div className="font-medium">{c.name}</div>
            <div className="text-xs text-stone-500">{c.phone}</div>
            <div className="mt-1 flex gap-1 text-xs">
              {c.blocked && <span className="rounded bg-red-100 px-1.5 text-red-800">blocked</span>}
              {c.noShows >= 3 && !c.blocked && <span className="rounded bg-amber-100 px-1.5 text-amber-800">{c.noShows} no-shows</span>}
              {c.deletionRequestedAt && <span className="rounded bg-stone-200 px-1.5 text-stone-700">deletion requested</span>}
            </div>
          </button>
        ))}
      </section>
      {cur && (
        <section className="space-y-3">
          {msg && <p className="text-sm text-emerald-800">{msg}</p>}
          {m.error && <p className="text-sm text-red-700">{(m.error as Error).message}</p>}
          <Detail key={[cur.id, cur.blocked, cur.credits.length, cur.deleted].join('|')} c={cur} run={run} busy={m.isPending} edit={can(role, 'customers.edit')} by={user!.name} />
        </section>
      )}
    </div>
  );
}

function Detail({ c, run, busy, edit, by }: { c: Customer; run: Run; busy: boolean; edit: boolean; by: string }) {
  const [reason, setReason] = useState('');
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const balance = c.credits.reduce((s, x) => s + x.amountMinor, 0);
  return (
    <>
      <div className={`${box} p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{c.name}</h1>
            <p className="text-sm text-stone-600">{c.phone} · customer since {day(c.joined)}</p>
          </div>
          <div className="text-right text-sm text-stone-600">
            <div>{c.orders.length} orders · <span className={c.noShows >= 3 ? 'font-medium text-amber-700' : ''}>{c.noShows} no-shows</span></div>
            <div>Credit: {money(balance)}</div>
          </div>
        </div>
        {c.blocked && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-800">Blocked: {c.blockReason}</p>}
        {!c.deleted && (
          <div className="mt-3 flex items-center gap-2">
            {!c.blocked && <input className={input + ' flex-1'} placeholder="Reason for blocking" disabled={!edit} value={reason} onChange={(e) => setReason(e.target.value)} />}
            <button className={c.blocked ? ghost : btn} disabled={!edit || busy} onClick={() => run(() => customers.block(c.id, !c.blocked, reason))}>{c.blocked ? 'Unblock customer' : 'Block customer'}</button>
          </div>
        )}
        {!edit && <p className="mt-2 text-xs text-stone-500">Your role can view customers but not change them.</p>}
      </div>

      {c.deletionRequestedAt && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <b>Deletion requested on {day(c.deletionRequestedAt)}.</b> Processing removes the name, phone number and addresses. Order history stays, without personal details.
          <div className="mt-2"><button className={btn} disabled={!edit || busy} onClick={() => run(() => customers.processDeletion(c.id))}>Process deletion</button></div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className={`${box} p-3 text-sm`}>
          <h2 className="mb-1 font-semibold">Addresses</h2>
          {c.addresses.length === 0 && <p className="text-stone-400">None on file</p>}
          {c.addresses.map((a) => <p key={a} className="border-b border-stone-100 py-1">{a}</p>)}
        </div>
        <div className={`${box} p-3 text-sm`}>
          <h2 className="mb-1 font-semibold">Credit notes</h2>
          {c.credits.length === 0 && <p className="text-stone-400">No credit given</p>}
          {c.credits.map((x) => <p key={x.id} className="border-b border-stone-100 py-1">{money(x.amountMinor)} · {x.note} <span className="text-stone-500">({x.by}, {day(x.at)})</span></p>)}
          {!c.deleted && (
            <div className="mt-2 flex flex-wrap gap-2">
              <input className={input + ' w-24'} placeholder="KES" disabled={!edit} value={amt} onChange={(e) => setAmt(e.target.value)} />
              <input className={input + ' flex-1'} placeholder="Why?" disabled={!edit} value={note} onChange={(e) => setNote(e.target.value)} />
              <button className={btn} disabled={!edit || busy} onClick={() => run(() => customers.addCredit(c.id, Number(amt), note, by))}>Add credit</button>
            </div>
          )}
        </div>
      </div>

      <div className={`${box} p-3 text-sm`}>
        <h2 className="mb-1 font-semibold">Order history</h2>
        {c.orders.map((x) => (
          <div key={x.code} className="flex justify-between border-b border-stone-100 py-1.5">
            <span><b>#{x.code}</b> · {x.merchant}</span>
            <span className="text-stone-600">{money(x.amountMinor)} · <span className={isActiveOrder(x.status) ? 'font-medium text-accent' : x.status === 'CANCELLED' ? 'text-red-700' : ''}>{x.status.toLowerCase().replace(/_/g, ' ')}</span> · {day(x.at)}</span>
          </div>
        ))}
      </div>
    </>
  );
}