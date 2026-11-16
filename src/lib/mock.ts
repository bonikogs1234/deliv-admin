import type { Order, OrderEvent, OrderStatus } from './types';

const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const ev = (status: OrderStatus, actor: string, m: number, note?: string): OrderEvent => ({ status, actor, at: ago(m), note });
const base = { currency: 'KES' };

export const COURIERS = [
  { name: 'Peter Otieno', phone: '+254712000111' },
  { name: 'Faith Wanjiru', phone: '+254722000222' },
  { name: 'Hassan Ali', phone: '+254733000333' },
];

export const orders: Order[] = [
  { ...base, id: 'o1', code: '4821', merchantName: 'Mama Oliech Restaurant', status: 'AWAITING_MERCHANT', paymentMethod: 'MPESA', paymentStatus: 'PAID', amountMinor: 185000, placedAt: ago(12),
    customer: { name: 'Achieng', phone: '+254700111222' }, address: 'Argwings Kodhek Rd, Kilimani', items: [{ name: 'Fried tilapia', qty: 1, unitMinor: 120000 }, { name: 'Ugali', qty: 2, unitMinor: 15000 }, { name: 'Kachumbari', qty: 1, unitMinor: 35000 }],
    events: [ev('PLACED', 'customer', 13), ev('AWAITING_MERCHANT', 'system', 12, 'M-Pesa payment confirmed')] },
  { ...base, id: 'o2', code: '1093', merchantName: 'Java House Westlands', status: 'AWAITING_MERCHANT', paymentMethod: 'CASH', paymentStatus: 'PENDING', amountMinor: 98000, placedAt: ago(3),
    customer: { name: 'Brian', phone: '+254711333444' }, address: 'Woodvale Grove, Westlands', items: [{ name: 'Chicken wrap', qty: 2, unitMinor: 39000 }, { name: 'Iced latte', qty: 1, unitMinor: 20000 }],
    events: [ev('AWAITING_MERCHANT', 'customer', 3)] },
  { ...base, id: 'o3', code: '7740', merchantName: 'Pizza Inn Kilimani', status: 'PREPARING', paymentMethod: 'MPESA', paymentStatus: 'PAID', amountMinor: 242000, placedAt: ago(18),
    customer: { name: 'Carol', phone: '+254722555666' }, address: 'Lenana Rd, Kilimani', items: [{ name: 'Large pepperoni', qty: 1, unitMinor: 160000 }, { name: 'Garlic bread', qty: 2, unitMinor: 41000 }],
    events: [ev('AWAITING_MERCHANT', 'system', 18), ev('PREPARING', 'Wanjiku (admin)', 15, 'Confirmed by phone, ready in 20 min')] },
  { ...base, id: 'o4', code: '3356', merchantName: 'Mama Oliech Restaurant', status: 'READY_FOR_PICKUP', paymentMethod: 'CASH', paymentStatus: 'PENDING', amountMinor: 134000, placedAt: ago(25),
    customer: { name: 'Dennis', phone: '+254733777888' }, address: 'Ngong Rd, Adams Arcade', items: [{ name: 'Beef stew', qty: 2, unitMinor: 67000 }],
    events: [ev('AWAITING_MERCHANT', 'customer', 25), ev('PREPARING', 'merchant link', 22), ev('READY_FOR_PICKUP', 'merchant link', 4)] },
  { ...base, id: 'o5', code: '5012', merchantName: 'Kenchic Inn', status: 'ON_THE_WAY', paymentMethod: 'MPESA', paymentStatus: 'PAID', amountMinor: 176000, placedAt: ago(40),
    customer: { name: 'Esther', phone: '+254744999000' }, address: 'Mombasa Rd, South B', items: [{ name: 'Chicken bucket', qty: 1, unitMinor: 176000 }],
    courier: COURIERS[0],
    events: [ev('AWAITING_MERCHANT', 'system', 40), ev('PREPARING', 'merchant link', 37), ev('READY_FOR_PICKUP', 'merchant link', 20), ev('RIDER_ASSIGNED', 'courier link', 18), ev('PICKED_UP', 'courier link', 12), ev('ON_THE_WAY', 'system', 10)] },
  { ...base, id: 'o6', code: '2287', merchantName: 'Java House Westlands', status: 'DELIVERED', paymentMethod: 'CASH', paymentStatus: 'PAID', amountMinor: 65000, placedAt: ago(70),
    customer: { name: 'Grace', phone: '+254755121212' }, address: 'Rhapta Rd, Westlands', items: [{ name: 'Breakfast bowl', qty: 1, unitMinor: 65000 }],
    courier: COURIERS[1],
    events: [ev('AWAITING_MERCHANT', 'customer', 70), ev('PREPARING', 'merchant link', 66), ev('DELIVERED', 'courier link', 30, 'Cash collected')] },
];
