// Mock audit log. Settings and Users write to it; the real backend records every admin action.
export interface AuditEntry { id: string; at: string; actor: string; action: string; entity: string; detail: string }
const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();

const log: AuditEntry[] = [
  { id: 'a1', at: ago(15), actor: 'wanjiku', action: 'order.confirm_for_merchant', entity: 'order 7740', detail: 'Confirmed by phone, ready in 20 min' },
  { id: 'a2', at: ago(95), actor: 'owner', action: 'zone.fee_changed', entity: 'zone Kilimani', detail: 'Base fee 150 to 180 KES' },
  { id: 'a3', at: ago(300), actor: 'finance', action: 'refund.approved', entity: 'order 4410', detail: 'KES 1,200' },
  { id: 'a4', at: ago(1500), actor: 'owner', action: 'user.created', entity: 'user wanjiku', detail: 'Role dispatcher' },
  { id: 'a5', at: ago(2900), actor: 'support', action: 'customer.blocked', entity: 'customer Dennis Otieno', detail: 'Repeated no-shows' },
];

export const logAudit = (actor: string, action: string, entity: string, detail: string) => {
  log.unshift({ id: 'a' + Date.now() + Math.random().toString(36).slice(2, 5), at: new Date().toISOString(), actor, action, entity, detail });
};
export const auditApi = { list: () => new Promise<AuditEntry[]>((r) => setTimeout(() => r(JSON.parse(JSON.stringify(log))), 100)) };