// Mirrors the role table in the design doc. The server still enforces every rule.
export type Role = 'OWNER' | 'DISPATCHER' | 'SUPPORT' | 'FINANCE' | 'CATALOG';
export type Cap =
  | 'orders.confirm' | 'orders.assign' | 'orders.cancel'
  | 'merchants.openclose' | 'merchants.edit' | 'menu.edit'
  | 'couriers.view' | 'couriers.edit';

const ORDERS: Cap[] = ['orders.confirm', 'orders.assign', 'orders.cancel'];
const CAPS: Record<Role, Cap[]> = {
  OWNER: [...ORDERS, 'merchants.openclose', 'merchants.edit', 'menu.edit', 'couriers.view', 'couriers.edit'],
  DISPATCHER: [...ORDERS, 'merchants.openclose', 'couriers.view', 'couriers.edit'],
  SUPPORT: ['couriers.view'],
  FINANCE: ['couriers.view'],
  CATALOG: ['merchants.openclose', 'merchants.edit', 'menu.edit'],
};

export const ROLES = Object.keys(CAPS) as Role[];
export const can = (role: Role, cap: Cap) => CAPS[role].includes(cap);