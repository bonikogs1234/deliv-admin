// Mock settings. Defaults come from the design doc. Swap for /v1/admin/settings calls later.
import { logAudit } from './audit';

export interface Settings {
  dispatchMode: 'manual' | 'auto_container'; stageSeconds: number; maxStages: number; maxRidersPerStage: number;
  merchantEscalationMin: number; supportPhone: string; maxCashOrderKes: number; firstOrderCashKes: number; noShowBlockAt: number;
  ridesEnabled: 'off' | 'zones' | 'all'; ridesZones: string[]; smsMerchant: string; smsCourier: string; smsDelivered: string;
}
export const ZONE_NAMES = ['Kilimani', 'Westlands', 'CBD', 'Karen'];

let s: Settings = {
  dispatchMode: 'auto_container', stageSeconds: 90, maxStages: 3, maxRidersPerStage: 5, merchantEscalationMin: 10,
  supportPhone: '+254700000000', maxCashOrderKes: 5000, firstOrderCashKes: 1500, noShowBlockAt: 3,
  ridesEnabled: 'off', ridesZones: [],
  smsMerchant: 'New Deliv order {code}. Accept or reject: {link}',
  smsCourier: 'Deliv job from {merchant}. Accept: {link}',
  smsDelivered: 'Your Deliv order {code} was delivered. Thank you!',
};
const later = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
const inRange = (n: number, lo: number, hi: number) => Number.isFinite(n) && n >= lo && n <= hi;

export const settingsApi = {
  get: () => later({ ...s, ridesZones: [...s.ridesZones] }),
  save: async (n: Settings, by: string) => {
    if (!inRange(n.stageSeconds, 30, 300)) throw new Error('Stage length must be between 30 and 300 seconds.');
    if (!inRange(n.maxStages, 1, 6)) throw new Error('Stages must be between 1 and 6.');
    if (!inRange(n.maxRidersPerStage, 0, 20)) throw new Error('Riders per stage must be between 0 and 20 (0 means everyone).');
    if (!inRange(n.merchantEscalationMin, 3, 30)) throw new Error('Merchant escalation must be between 3 and 30 minutes.');
    if (!/^\+254\d{9}$/.test(n.supportPhone)) throw new Error('Support phone must look like +254700000000.');
    if (!inRange(n.maxCashOrderKes, 500, 100000)) throw new Error('Maximum cash order must be between 500 and 100,000 KES.');
    if (!inRange(n.firstOrderCashKes, 0, n.maxCashOrderKes)) throw new Error('The first-order cash limit cannot be above the maximum cash order.');
    if (!inRange(n.noShowBlockAt, 1, 10)) throw new Error('Auto-block threshold must be between 1 and 10 no-shows.');
    if (n.ridesEnabled === 'zones' && n.ridesZones.length === 0) throw new Error('Choose at least one zone for rides, or pick Off or Everyone.');
    for (const [label, t, needLink] of [['Merchant SMS', n.smsMerchant, true], ['Courier SMS', n.smsCourier, true], ['Delivered SMS', n.smsDelivered, false]] as const) {
      if (!t.trim()) throw new Error(`${label} cannot be empty.`);
      if (t.length > 306) throw new Error(`${label} is longer than two SMS parts (306 characters).`);
      if (needLink && !t.includes('{link}')) throw new Error(`${label} must contain {link}.`);
    }
    const changed = (Object.keys(n) as (keyof Settings)[]).filter((k) => JSON.stringify(n[k]) !== JSON.stringify(s[k]));
    if (!changed.length) return later('No changes to save.');
    s = { ...n, ridesZones: [...n.ridesZones] };
    logAudit(by, 'settings.updated', 'settings', `Changed: ${changed.join(', ')}`);
    return later(`Saved. ${changed.length} setting${changed.length > 1 ? 's' : ''} changed and recorded in the audit log.`);
  },
};