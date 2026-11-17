// Mock payments API. Swap for /v1/admin/payments, /reconciliation and /refunds calls later.
export type PayStatus = 'PAID' | 'PENDING' | 'FAILED';
export interface Payment {
  id: string; orderCode: string; method: 'MPESA' | 'CASH'; status: PayStatus; amountMinor: number;
  phone: string; receipt?: string; failureReason?: string; at: string; refundedMinor: number;
}
export interface Recon {
  id: string; kind: 'unmatched_callback' | 'missing_callback' | 'amount_mismatch'; phone: string; amountMinor: number;
  expectedMinor?: number; receipt?: string; orderCode?: string; at: string; resolution?: string;
}
export interface Refund {
  id: string; paymentId: string; orderCode: string; amountMinor: number; reason: string; requestedBy: string; at: string;
  status: 'requested' | 'approved' | 'paid' | 'rejected'; approvedBy?: string; receipt?: string;
}

export const SECOND_APPROVER_ABOVE_MINOR = 500000; // refunds above KES 5,000 need a second person

const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const p = (id: string, orderCode: string, method: Payment['method'], status: PayStatus, amountMinor: number, phone: string, m: number, extra: Partial<Payment> = {}): Payment =>
  ({ id, orderCode, method, status, amountMinor, phone, at: ago(m), refundedMinor: 0, ...extra });

const payments: Payment[] = [
  p('p1', '4821', 'MPESA', 'PAID', 185000, '+254700111222', 12, { receipt: 'SGH7K2L9QX' }),
  p('p2', '7740', 'MPESA', 'PAID', 242000, '+254722555666', 18, { receipt: 'SGH7K2L9QY' }),
  p('p3', '5012', 'MPESA', 'PAID', 176000, '+254744999000', 40, { receipt: 'SGH7K2L9QZ' }),
  p('p4', '2287', 'CASH', 'PAID', 65000, '+254755121212', 70),
  p('p5', '6001', 'MPESA', 'FAILED', 89000, '+254711333444', 25, { failureReason: 'USER_CANCELLED' }),
  p('p6', '6002', 'MPESA', 'PENDING', 120000, '+254700999888', 1),
  p('p7', '3109', 'MPESA', 'PAID', 920000, '+254733101010', 300, { receipt: 'SGH7K2M1AB' }),
];
const recon: Recon[] = [
  { id: 'x1', kind: 'unmatched_callback', phone: '+254799888777', amountMinor: 150000, receipt: 'SGH7K2N4CD', at: ago(90) },
  { id: 'x2', kind: 'missing_callback', phone: '+254700999888', amountMinor: 120000, orderCode: '6002', at: ago(8) },
  { id: 'x3', kind: 'amount_mismatch', phone: '+254722303030', amountMinor: 98000, expectedMinor: 108000, receipt: 'SGH7K2P5EF', orderCode: '3110', at: ago(200) },
];
const refunds: Refund[] = [
  { id: 'rf1', paymentId: 'p2', orderCode: '7740', amountMinor: 50000, reason: 'Pizza arrived cold', requestedBy: 'support', at: ago(30), status: 'requested' },
];

const later = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const refund = (id: string) => { const r = refunds.find((x) => x.id === id); if (!r) throw new Error('Refund not found'); return r; };

export const pay = {
  all: () => later(copy({ payments, recon, refunds })),
  requestRefund: async (paymentId: string, kes: number, reason: string, by: string) => {
    const x = payments.find((q) => q.id === paymentId);
    if (!x || x.status !== 'PAID') throw new Error('Only paid payments can be refunded.');
    const minor = Math.round(kes * 100);
    if (!(minor > 0)) throw new Error('Enter an amount above zero.');
    if (!reason.trim()) throw new Error('Add a reason for the refund.');
    const open = refunds.filter((r) => r.paymentId === paymentId && (r.status === 'requested' || r.status === 'approved')).reduce((s, r) => s + r.amountMinor, 0);
    if (minor > x.amountMinor - x.refundedMinor - open) throw new Error('That is more than is left to refund on this payment.');
    refunds.unshift({ id: 'rf' + Date.now(), paymentId, orderCode: x.orderCode, amountMinor: minor, reason: reason.trim(), requestedBy: by, at: new Date().toISOString(), status: 'requested' });
    return later('Refund requested. It now waits for approval.');
  },
  approve: async (id: string, by: string) => {
    const r = refund(id);
    if (r.status !== 'requested') throw new Error('This refund is not waiting for approval.');
    if (r.amountMinor > SECOND_APPROVER_ABOVE_MINOR && r.requestedBy === by) throw new Error('Refunds above KES 5,000 need a second person to approve. Ask another Finance or Owner user.');
    r.status = 'approved'; r.approvedBy = by;
    return later('Approved. Send the money by M-Pesa, then record the receipt number.');
  },
  reject: async (id: string) => {
    const r = refund(id);
    if (r.status !== 'requested' && r.status !== 'approved') throw new Error('This refund is already closed.');
    r.status = 'rejected';
    return later('Refund rejected.');
  },
  markPaid: async (id: string, receipt: string) => {
    const r = refund(id);
    if (r.status !== 'approved') throw new Error('Approve the refund first.');
    const code = receipt.trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(code)) throw new Error('An M-Pesa receipt has 10 letters and numbers, for example SGH7K2L9QX.');
    r.status = 'paid'; r.receipt = code;
    payments.find((x) => x.id === r.paymentId)!.refundedMinor += r.amountMinor;
    return later('Refund recorded as paid.');
  },
  resolve: async (id: string, note: string) => {
    const x = recon.find((q) => q.id === id);
    if (!x) throw new Error('Item not found');
    if (!note.trim()) throw new Error('Add a note saying how this was resolved.');
    x.resolution = note.trim();
    return later('Marked as resolved.');
  },
};