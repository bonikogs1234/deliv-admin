// Mock API. To go live, replace each body with fetch('/v1/admin/...', { credentials: 'include' }).
import { COURIERS, orders } from './mock';
import type { Action, Order, OrderStatus } from './types';

const later = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150));
const clone = (o: Order): Order => JSON.parse(JSON.stringify(o));

export const api = {
  couriers: () => COURIERS,
  listOrders: () => later(orders.map(clone)),
  getOrder: async (id: string) => {
    const o = orders.find((x) => x.id === id);
    if (!o) throw new Error('Order not found');
    return later(clone(o));
  },
  act: async (id: string, a: Action, admin: string) => {
    const o = orders.find((x) => x.id === id);
    if (!o) throw new Error('Order not found');
    const push = (s: OrderStatus, note?: string) => {
      o.status = s;
      o.events.push({ status: s, actor: admin, at: new Date().toISOString(), note });
    };
    switch (a.type) {
      case 'confirm':
        if (o.status !== 'AWAITING_MERCHANT') throw new Error('This order is not waiting for the merchant.');
        if (!a.note.trim()) throw new Error('Add a note, for example "Confirmed by phone, ready in 20 min".');
        push('PREPARING', a.note.trim());
        break;
      case 'ready':
        if (o.status !== 'PREPARING') throw new Error('Only orders being prepared can be marked ready.');
        push('READY_FOR_PICKUP');
        break;
      case 'assign': {
        const c = COURIERS.find((x) => x.name === a.courier);
        if (!c) throw new Error('Choose a courier.');
        if (o.status !== 'PREPARING' && o.status !== 'READY_FOR_PICKUP') throw new Error('Couriers can be assigned while preparing or ready.');
        o.courier = c;
        push(o.status === 'READY_FOR_PICKUP' ? 'RIDER_ASSIGNED' : o.status, `Assigned to ${c.name}`);
        break;
      }
      case 'cancel':
        if (['PICKED_UP', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED'].includes(o.status)) throw new Error('Orders cannot be cancelled after pickup.');
        if (!a.reason.trim()) throw new Error('Add a reason for the cancellation.');
        push('CANCELLED', a.reason.trim());
        break;
    }
    return later(clone(o));
  },
};
