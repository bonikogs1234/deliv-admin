// Mock customers API. Swap for /v1/admin/customers calls when the backend exists.
export interface CustOrder { code: string; merchant: string; amountMinor: number; status: string; at: string }
export interface Credit { id: string; amountMinor: number; note: string; by: string; at: string }
export interface Customer {
  id: string; name: string; phone: string; joined: string; noShows: number; blocked: boolean; blockReason?: string;
  addresses: string[]; credits: Credit[]; orders: CustOrder[]; deletionRequestedAt?: string; deleted?: boolean;
}

export const MAX_CREDIT_MINOR = 1000000; // one credit note is limited to KES 10,000
const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const DAY = 1440;
const o = (code: string, merchant: string, kes: number, status: string, min: number): CustOrder => ({ code, merchant, amountMinor: kes * 100, status, at: ago(min) });

const data: Customer[] = [
  { id: 'c1', name: 'Achieng Odhiambo', phone: '+254700111222', joined: ago(200 * DAY), noShows: 0, blocked: false, addresses: ['Argwings Kodhek Rd, Kilimani', 'Lenana Rd, Kilimani'], credits: [],
    orders: [o('4821', 'Mama Oliech Restaurant', 1850, 'AWAITING_MERCHANT', 12), o('3902', 'Java House Westlands', 780, 'DELIVERED', 3 * DAY), o('3411', 'Pizza Inn Kilimani', 2100, 'DELIVERED', 9 * DAY)] },
  { id: 'c2', name: 'Brian Kamau', phone: '+254711333444', joined: ago(60 * DAY), noShows: 3, blocked: false, addresses: ['Woodvale Grove, Westlands'], credits: [],
    orders: [o('1093', 'Java House Westlands', 980, 'AWAITING_MERCHANT', 3), o('0877', 'Kenchic Inn', 1760, 'CANCELLED', 5 * DAY)] },
  { id: 'c3', name: 'Carol Njeri', phone: '+254722555666', joined: ago(90 * DAY), noShows: 1, blocked: false, addresses: ['Lenana Rd, Kilimani'],
    credits: [{ id: 'cr1', amountMinor: 50000, note: 'Pizza arrived cold on order 7740', by: 'support', at: ago(2 * DAY) }],
    orders: [o('7740', 'Pizza Inn Kilimani', 2420, 'PREPARING', 18), o('6120', 'Mama Oliech Restaurant', 1340, 'DELIVERED', 6 * DAY)] },
  { id: 'c4', name: 'Dennis Otieno', phone: '+254733777888', joined: ago(30 * DAY), noShows: 4, blocked: true, blockReason: 'Repeated no-shows on cash orders', addresses: ['Ngong Rd, Adams Arcade'], credits: [],
    orders: [o('3356', 'Mama Oliech Restaurant', 1340, 'READY_FOR_PICKUP', 25), o('2201', 'Pizza Inn Kilimani', 1600, 'CANCELLED', 4 * DAY)] },
  { id: 'c5', name: 'Esther Wambui', phone: '+254744999000', joined: ago(400 * DAY), noShows: 0, blocked: false, addresses: ['Mombasa Rd, South B'], credits: [], deletionRequestedAt: ago(2 * DAY),
    orders: [o('2980', 'Kenchic Inn', 1760, 'DELIVERED', 8 * DAY)] },
  { id: 'c6', name: 'Grace Muthoni', phone: '+254755121212', joined: ago(120 * DAY), noShows: 0, blocked: false, addresses: ['Rhapta Rd, Westlands'], credits: [], deletionRequestedAt: ago(1 * DAY),
    orders: [o('5012', 'Kenchic Inn', 1760, 'ON_THE_WAY', 40)] },
];

const later = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
const get = (id: string) => { const c = data.find((x) => x.id === id); if (!c) throw new Error('Customer not found'); return c; };
export const isActiveOrder = (s: string) => !['DELIVERED', 'CANCELLED'].includes(s);

export const customers = {
  list: () => later(JSON.parse(JSON.stringify(data)) as Customer[]),
  block: async (id: string, blocked: boolean, reason: string) => {
    const c = get(id);
    if (blocked && !reason.trim()) throw new Error('Add a reason for blocking this customer.');
    c.blocked = blocked; c.blockReason = blocked ? reason.trim() : undefined;
    return later(blocked ? 'Customer blocked. They cannot place new orders.' : 'Customer unblocked.');
  },
  addCredit: async (id: string, kes: number, note: string, by: string) => {
    const minor = Math.round(kes * 100);
    if (!(minor > 0)) throw new Error('Enter an amount above zero.');
    if (minor > MAX_CREDIT_MINOR) throw new Error('A single credit note is limited to KES 10,000.');
    if (!note.trim()) throw new Error('Add a note saying why the credit is given.');
    get(id).credits.unshift({ id: 'cr' + Date.now(), amountMinor: minor, note: note.trim(), by, at: new Date().toISOString() });
    return later('Credit note added.');
  },
  processDeletion: async (id: string) => {
    const c = get(id);
    if (!c.deletionRequestedAt) throw new Error('This customer has not asked for deletion.');
    if (c.orders.some((x) => isActiveOrder(x.status))) throw new Error('This customer has an order in progress. Process the deletion after it is delivered or cancelled.');
    Object.assign(c, { name: 'Deleted customer', phone: '+254•••••••••', addresses: [], deleted: true, deletionRequestedAt: undefined, blocked: false });
    return later('Personal details removed. Order history is kept without a name or phone number.');
  },
};