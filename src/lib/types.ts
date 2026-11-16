export type OrderStatus =
  | 'PLACED' | 'AWAITING_MERCHANT' | 'PREPARING' | 'READY_FOR_PICKUP' | 'RIDER_ASSIGNED'
  | 'PICKED_UP' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';

export interface OrderEvent { status: OrderStatus; actor: string; at: string; note?: string }

export interface Order {
  id: string; code: string; merchantName: string; status: OrderStatus;
  paymentMethod: 'MPESA' | 'CASH'; paymentStatus: 'PENDING' | 'PAID';
  amountMinor: number; currency: string; placedAt: string;
  customer: { name: string; phone: string }; address: string;
  items: { name: string; qty: number; unitMinor: number }[];
  courier?: { name: string; phone: string };
  events: OrderEvent[];
}

export type Action =
  | { type: 'confirm'; note: string }
  | { type: 'ready' }
  | { type: 'assign'; courier: string }
  | { type: 'cancel'; reason: string };
