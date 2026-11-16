// Mock dispatch API (design doc: GET /dispatch/board, POST /orders/{id}/offers, DELETE /offers/{id}).
import { orders } from './mock';
import type { Order } from './types';

export const STALE_MIN = 180; // dispatch.stale_after_minutes

export interface Rider {
  id: string; name: string; phone: string; kind: 'courier' | 'driver'; vehicle: string;
  container: string; availability: 'online' | 'busy' | 'offline'; lastSeenMin: number;
}
export interface Offer { id: string; orderId: string; riderId: string; status: 'sent' | 'accepted' | 'declined' | 'expired'; sentAt: string }

const riders: Rider[] = [
  { id: 'r1', name: 'Peter Otieno', phone: '+254712000111', kind: 'courier', vehicle: 'Motorbike KMEA 123A', container: 'Kilimani', availability: 'busy', lastSeenMin: 2 },
  { id: 'r2', name: 'Faith Wanjiru', phone: '+254722000222', kind: 'courier', vehicle: 'Motorbike KMFB 456B', container: 'Kilimani', availability: 'online', lastSeenMin: 6 },
  { id: 'r3', name: 'Hassan Ali', phone: '+254733000333', kind: 'courier', vehicle: 'Motorbike KMDC 789C', container: 'Kilimani', availability: 'online', lastSeenMin: 200 },
  { id: 'r4', name: 'Mercy Atieno', phone: '+254744000444', kind: 'courier', vehicle: 'Bicycle', container: 'Westlands', availability: 'online', lastSeenMin: 4 },
  { id: 'r5', name: 'Kevin Mwangi', phone: '+254755000555', kind: 'courier', vehicle: 'Motorbike KMGD 321D', container: 'Westlands', availability: 'online', lastSeenMin: 11 },
  { id: 'r6', name: 'Joseph Kariuki', phone: '+254766000666', kind: 'courier', vehicle: 'Motorbike KMHE 654E', container: 'CBD', availability: 'offline', lastSeenMin: 45 },
];
const offers: Offer[] = [];
const later = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const find = (id: string) => { const o = orders.find((x) => x.id === id); if (!o) throw new Error('Order not found'); return o; };
const rider = (id: string) => { const r = riders.find((x) => x.id === id); if (!r) throw new Error('Rider not found'); return r; };
export const isStale = (r: Rider) => r.lastSeenMin >= STALE_MIN;

function take(o: Order, r: Rider, admin: string, note: string) {
  if (offers.some((f) => f.orderId === o.id && f.status === 'accepted') || o.courier) throw new Error('JOB_TAKEN: this job already has a courier.');
  o.courier = { name: r.name, phone: r.phone };
  const status = o.status === 'READY_FOR_PICKUP' ? 'RIDER_ASSIGNED' : o.status;
  o.status = status;
  o.events.push({ status, actor: admin, at: new Date().toISOString(), note });
  r.availability = 'busy';
  offers.filter((f) => f.orderId === o.id && f.status === 'sent').forEach((f) => (f.status = 'expired'));
}

export const dispatch = {
  listRiders: () => later(copy(riders)),
  listOffers: () => later(copy(offers)),
  sendOffers: async (orderId: string, riderIds: string[]) => {
    const o = find(orderId);
    if (o.courier) throw new Error('This order already has a courier.');
    const targets = riderIds.map(rider).filter((r) => r.availability === 'online' && !isStale(r));
    if (!targets.length) throw new Error('Pick at least one online courier who was seen recently.');
    targets.forEach((r) => {
      if (!offers.some((f) => f.orderId === orderId && f.riderId === r.id && f.status === 'sent'))
        offers.push({ id: 'f' + (offers.length + 1), orderId, riderId: r.id, status: 'sent', sentAt: new Date().toISOString() });
    });
    return later(true);
  },
  withdraw: async (offerId: string) => {
    const f = offers.find((x) => x.id === offerId);
    if (f && f.status === 'sent') f.status = 'expired';
    return later(true);
  },
  assignDirect: async (orderId: string, riderId: string, admin: string) => {
    take(find(orderId), rider(riderId), admin, `Assigned directly to ${rider(riderId).name}`);
    return later(true);
  },
  // Demo only: stands in for the courier tapping Accept on their SMS link. First accept wins.
  simulateAccept: async (offerId: string) => {
    const f = offers.find((x) => x.id === offerId);
    if (!f || f.status !== 'sent') throw new Error('JOB_TAKEN: this offer is no longer open.');
    const r = rider(f.riderId);
    take(find(f.orderId), r, r.name + ' (courier link)', 'Accepted offer');
    f.status = 'accepted';
    return later(true);
  },
};