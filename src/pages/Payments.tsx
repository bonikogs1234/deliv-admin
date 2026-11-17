import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { SECOND_APPROVER_ABOVE_MINOR, pay, type Payment, type Recon, type Refund } from '../lib/payments';
import { can } from '../lib/permissions';
import { money } from '../lib/format';

type Run = (fn: () => Promise<unknown>) => void;
const when = (iso: string) => new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });
const box = 'rounded border border-stone-300 bg-white';
const input = 'rounded border border-stone-300 px-2 py-1 text-sm';
const btn = 'rounded bg-accent px-2.5 py-1 text-sm text-white disabled:opacity-40';
const ghost = 'rounded border border-stone-400 px-2.5 py-1 text-sm disabled:opacity-40';
const BADGE: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-800', PENDING: 'bg-amber-100 text-amber-800', FAILED: 'bg-red-100 text-red-800',
  requested: 'bg-amber-100 text-amber-800', approved: 'bg-sky-100 text-sky-800', paid: 'bg-emerald-100 text-emerald-800', rejected: 'bg-stone-200 text-stone-600',
};
const Badge = ({ s }: { s: string }) => <span className={`rounded px-1.5 py-0.5 text-xs ${BADGE[s]}`}>{s.toLowerCase()}</span>;

export default function Payments() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'payments' | 'recon' | 'refunds'>('payments');
  const [msg, setMsg] = useState('');
  const q = useQuery({ queryKey: ['payments'], queryFn: pay.all, refetchInterval: 15000 });
  const m = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['payments'] }); if (typeof d === 'string') setMsg(d); },
  });
  const run: Run = (fn) => { setMsg(''); m.mutate(fn); };
  const role = user!.role;
  const by = user!.name;

  if (!can(role, 'payments.view')) return <p className="text-stone-600">Your role does not have access to payments.</p>;
  if (q.isLoading || !q.data) return <p>Loading payments…</p>;
  const { payments, recon, refunds } = q.data;
  const counts = { payments: payments.length, recon: recon.filter((r) => !r.resolution).length, refunds: refunds.filter((r) => r.status === 'requested' || r.status === 'approved').length };
  const TABS: [typeof tab, string][] = [['payments', 'Payments'], ['recon', 'Reconciliation'], ['refunds', 'Refunds']];

  return (
    <div className="min-w-[900px] space-y-3">
      <div className="flex gap-2 text-sm">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded px-3 py-1.5 ${tab === k ? 'bg-accent text-white' : 'border border-stone-300 bg-white'}`}>
            {label} <span className={tab === k ? 'text-white/80' : 'text-stone-500'}>{counts[k]}</span>
          </button>
        ))}
      </div>
      {msg && <p className="text-sm text-emerald-800">{msg}</p>}
      {m.error && <p className="text-sm text-red-700">{(m.error as Error).message}</p>}
      {tab === 'payments' && <PaymentsTab rows={payments} run={run} canRequest={can(role, 'refunds.request')} by={by} />}
      {tab === 'recon' && <ReconTab rows={recon} run={run} />}
      {tab === 'refunds' && <RefundsTab rows={refunds} run={run} by={by} canApprove={can(role, 'refunds.approve')} />}
    </div>
  );
}

const PCOLS = 'grid grid-cols-[0.7fr_0.7fr_0.8fr_1fr_1.3fr_1.5fr_1.2fr_0.8fr] gap-2';

function PaymentsTab({ rows, run, canRequest, by }: { rows: Payment[]; run: Run; canRequest: boolean; by: string }) {
  const [f, setF] = useState('ALL');
  const [rf, setRf] = useState<Payment | null>(null);
  const [amt, setAmt] = useState('');
  const [why, setWhy] = useState('');
  const shown = rows.filter((x) => f === 'ALL' || x.status === f);
  return (
    <div className="space-y-3">
      {rf && (
        <div className={`${box} flex flex-wrap items-center gap-2 p-3 text-sm`}>
          <b>Refund for order #{rf.orderCode}</b>
          <input className={input + ' w-28'} placeholder="Amount (KES)" value={amt} onChange={(e) => setAmt(e.target.value)} />
          <input className={input + ' w-72'} placeholder="Reason" value={why} onChange={(e) => setWhy(e.target.value)} />
          <button className={btn} onClick={() => { run(() => pay.requestRefund(rf.id, Number(amt), why, by)); setRf(null); setAmt(''); setWhy(''); }}>Request refund</button>
          <button className={ghost} onClick={() => setRf(null)}>Cancel</button>
        </div>
      )}
      <label className="text-sm text-stone-600">Status{' '}
        <select className={input} value={f} onChange={(e) => setF(e.target.value)}>{['ALL', 'PAID', 'PENDING', 'FAILED'].map((s) => <option key={s}>{s}</option>)}</select>
      </label>
      <div className={`${box} text-sm`}>
        <div className={`${PCOLS} border-b border-stone-300 px-3 py-2 text-xs font-semibold text-stone-500`}>
          <span>Order</span><span>Method</span><span>Status</span><span>Amount</span><span>Phone</span><span>Receipt or reason</span><span>Time</span><span />
        </div>
        {shown.map((x) => (
          <div key={x.id} className={`${PCOLS} items-center border-b border-stone-100 px-3 py-2`}>
            <span className="font-medium">#{x.orderCode}</span>
            <span>{x.method === 'MPESA' ? 'M-Pesa' : 'Cash'}</span>
            <span><Badge s={x.status} /></span>
            <span>{money(x.amountMinor)}{x.refundedMinor > 0 && <span className="block text-xs text-stone-500">refunded {money(x.refundedMinor)}</span>}</span>
            <span>{x.phone}</span>
            <span className="truncate text-stone-600">{x.receipt ?? x.failureReason ?? '—'}</span>
            <span className="text-stone-500">{when(x.at)}</span>
            <button className={ghost} disabled={!canRequest || x.status !== 'PAID' || x.refundedMinor >= x.amountMinor} onClick={() => { setRf(x); setAmt(String((x.amountMinor - x.refundedMinor) / 100)); }}>Refund</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const KIND: Record<Recon['kind'], string> = {
  unmatched_callback: 'M-Pesa callback with no matching payment',
  missing_callback: 'Payment with no callback',
  amount_mismatch: 'Amount does not match the order',
};

function ReconTab({ rows, run }: { rows: Recon[]; run: Run }) {
  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-sm text-stone-500">Nothing to reconcile.</p>}
      {rows.map((x) => <ReconRow key={x.id} x={x} run={run} />)}
    </div>
  );
}

function ReconRow({ x, run }: { x: Recon; run: Run }) {
  const [note, setNote] = useState('');
  return (
    <div className={`${box} p-3 text-sm ${x.resolution ? 'opacity-60' : ''}`}>
      <div className="flex justify-between">
        <b>{KIND[x.kind]}</b><span className="text-stone-500">{when(x.at)}</span>
      </div>
      <p className="mt-1 text-stone-600">
        {money(x.amountMinor)} from {x.phone}{x.receipt && ` · receipt ${x.receipt}`}{x.orderCode && ` · order #${x.orderCode}`}
        {x.expectedMinor && ` · order total is ${money(x.expectedMinor)}`}
      </p>
      {x.resolution ? <p className="mt-2 text-emerald-800">Resolved: {x.resolution}</p> : (
        <div className="mt-2 flex gap-2">
          <input className={input + ' flex-1'} placeholder="How was this resolved? e.g. Matched to order 4410 by phone" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className={btn} onClick={() => run(() => pay.resolve(x.id, note))}>Resolve</button>
        </div>
      )}
    </div>
  );
}

function RefundsTab({ rows, run, by, canApprove }: { rows: Refund[]; run: Run; by: string; canApprove: boolean }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-stone-500">Refunds above {money(SECOND_APPROVER_ABOVE_MINOR)} need a second person to approve. Phase 1 refunds are sent by hand from the M-Pesa business account.</p>
      {rows.length === 0 && <p className="text-sm text-stone-500">No refunds yet.</p>}
      {rows.map((r) => <RefundRow key={r.id} r={r} run={run} by={by} canApprove={canApprove} />)}
    </div>
  );
}

function RefundRow({ r, run, by, canApprove }: { r: Refund; run: Run; by: string; canApprove: boolean }) {
  const [receipt, setReceipt] = useState('');
  const needsSecond = r.amountMinor > SECOND_APPROVER_ABOVE_MINOR && r.requestedBy === by;
  return (
    <div className={`${box} p-3 text-sm`}>
      <div className="flex items-center justify-between">
        <span><b>Order #{r.orderCode}</b> · {money(r.amountMinor)} <Badge s={r.status} /></span>
        <span className="text-stone-500">{when(r.at)}</span>
      </div>
      <p className="mt-1 text-stone-600">{r.reason} · requested by {r.requestedBy}{r.approvedBy && ` · approved by ${r.approvedBy}`}{r.receipt && ` · receipt ${r.receipt}`}</p>
      {r.status === 'requested' && (
        <div className="mt-2 flex items-center gap-2">
          <button className={btn} disabled={!canApprove || needsSecond} onClick={() => run(() => pay.approve(r.id, by))}>Approve</button>
          <button className={ghost} disabled={!canApprove} onClick={() => run(() => pay.reject(r.id))}>Reject</button>
          {needsSecond && <span className="text-amber-700">Waiting for a second approver</span>}
          {!canApprove && <span className="text-stone-500">Your role can request but not approve</span>}
        </div>
      )}
      {r.status === 'approved' && (
        <div className="mt-2 flex items-center gap-2">
          <input className={input + ' w-44'} placeholder="M-Pesa receipt" value={receipt} onChange={(e) => setReceipt(e.target.value)} />
          <button className={btn} disabled={!canApprove} onClick={() => run(() => pay.markPaid(r.id, receipt))}>Mark paid</button>
          <button className={ghost} disabled={!canApprove} onClick={() => run(() => pay.reject(r.id))}>Reject</button>
        </div>
      )}
    </div>
  );
}