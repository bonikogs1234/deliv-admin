import type { OrderStatus } from './types';

export const money = (minor: number, currency = 'KES') =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency }).format(minor / 100);

export const ageMin = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Awaiting payment', AWAITING_MERCHANT: 'Awaiting merchant', PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for pickup', RIDER_ASSIGNED: 'Rider assigned', PICKED_UP: 'Picked up',
  ON_THE_WAY: 'On the way', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
};

export const COLUMNS: [string, OrderStatus[]][] = [
  ['Awaiting merchant', ['PLACED', 'AWAITING_MERCHANT']],
  ['Preparing', ['PREPARING']],
  ['Ready for pickup', ['READY_FOR_PICKUP', 'RIDER_ASSIGNED']],
  ['Out for delivery', ['PICKED_UP', 'ON_THE_WAY']],
  ['Done today', ['DELIVERED', 'CANCELLED']],
];
