// Mirrors the role table in the design doc. The server still enforces every rule.
export type Role = 'OWNER' | 'DISPATCHER' | 'SUPPORT' | 'FINANCE' | 'CATALOG';
export type Cap =
  | 'orders.confirm' | 'orders.assign' | 'orders.cancel'
  | 'merchants.openclose' | 'merchants.edit' | 'menu.edit'
  | 'couriers.view' | 'couriers.edit'
  | 'payments.view' | 'refunds.request' | 'refunds.approve'
  | 'customers.view' | 'customers.edit'
  | 'zones.manage' | 'settings.manage'
  | 'rides.view' | 'rides.act'
  | 'reports.view' | 'audit.view' | 'users.manage';

const ORDERS: Cap[] = ['orders.confirm', 'orders.assign', 'orders.cancel'];
const CAPS: Record<Role, Cap[]> = {
  OWNER: [...ORDERS, 'merchants.openclose', 'merchants.edit', 'menu.edit', 'couriers.view', 'couriers.edit', 'payments.view', 'refunds.request', 'refunds.approve', 'customers.view', 'customers.edit', 'zones.manage', 'settings.manage', 'rides.view', 'rides.act', 'reports.view', 'audit.view', 'users.manage'],
  DISPATCHER: [...ORDERS, 'merchants.openclose', 'couriers.view', 'couriers.edit', 'refunds.request', 'customers.view', 'rides.view', 'rides.act'],
  SUPPORT: ['couriers.view', 'refunds.request', 'customers.view', 'customers.edit', 'rides.view'],
  FINANCE: ['couriers.view', 'payments.view', 'refunds.request', 'refunds.approve', 'customers.view', 'rides.view', 'reports.view', 'audit.view'],
  CATALOG: ['merchants.openclose', 'merchants.edit', 'menu.edit'],
};

export const ROLES = Object.keys(CAPS) as Role[];
export const can = (role: Role, cap: Cap) => CAPS[role].includes(cap);