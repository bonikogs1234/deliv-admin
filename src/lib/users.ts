// Mock admin accounts. Swap for /v1/admin/users calls later. Every change is written to the audit log.
import { logAudit } from './audit';
import type { Role } from './permissions';

export interface AdminUser { id: string; name: string; email: string; role: Role; active: boolean; totp: boolean; lastLoginAt?: string }
const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();

const users: AdminUser[] = [
  { id: 'u1', name: 'owner', email: 'owner@deliv.co.ke', role: 'OWNER', active: true, totp: true, lastLoginAt: ago(20) },
  { id: 'u2', name: 'wanjiku', email: 'wanjiku@deliv.co.ke', role: 'DISPATCHER', active: true, totp: true, lastLoginAt: ago(60) },
  { id: 'u3', name: 'support', email: 'support@deliv.co.ke', role: 'SUPPORT', active: true, totp: false, lastLoginAt: ago(1500) },
  { id: 'u4', name: 'finance', email: 'finance@deliv.co.ke', role: 'FINANCE', active: true, totp: true, lastLoginAt: ago(400) },
  { id: 'u5', name: 'catalog', email: 'catalog@deliv.co.ke', role: 'CATALOG', active: false, totp: true },
];

const later = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
const get = (id: string) => { const u = users.find((x) => x.id === id); if (!u) throw new Error('User not found'); return u; };
const activeOwners = () => users.filter((u) => u.role === 'OWNER' && u.active).length;

export const usersApi = {
  list: () => later(JSON.parse(JSON.stringify(users)) as AdminUser[]),
  add: async (p: { name: string; email: string; role: Role }, by: string) => {
    const email = p.email.trim().toLowerCase();
    if (!p.name.trim()) throw new Error('Enter a name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a valid email address.');
    if (users.some((u) => u.email === email)) throw new Error('An admin with this email already exists.');
    users.push({ id: 'u' + Date.now(), name: email.split('@')[0], email, role: p.role, active: true, totp: false });
    logAudit(by, 'user.created', `user ${email}`, `Role ${p.role.toLowerCase()}`);
    return later('Account created. They set a password and two-factor code at first sign-in.');
  },
  setRole: async (id: string, role: Role, by: string) => {
    const u = get(id);
    if (u.name === by) throw new Error('You cannot change your own role.');
    if (u.role === 'OWNER' && role !== 'OWNER' && activeOwners() <= 1) throw new Error('There must always be at least one active owner.');
    logAudit(by, 'user.role_changed', `user ${u.email}`, `${u.role.toLowerCase()} to ${role.toLowerCase()}`);
    u.role = role;
    return later('Role updated.');
  },
  setActive: async (id: string, active: boolean, by: string) => {
    const u = get(id);
    if (u.name === by) throw new Error('You cannot deactivate your own account.');
    if (!active && u.role === 'OWNER' && activeOwners() <= 1) throw new Error('There must always be at least one active owner.');
    u.active = active;
    logAudit(by, active ? 'user.reactivated' : 'user.deactivated', `user ${u.email}`, '');
    return later(active ? 'Account reactivated.' : 'Account deactivated. Their sessions end now.');
  },
  resetTwoFactor: async (id: string, by: string) => {
    const u = get(id);
    u.totp = false;
    logAudit(by, 'user.2fa_reset', `user ${u.email}`, '');
    return later('Two-factor reset. They must set it up again at next sign-in.');
  },
};