// Mock couriers API. Works on the same rider list Dispatch uses, so changes show in both screens.
import { riders } from './dispatch';

const SEED: Record<string, [number, number, number]> = { // jobs today, earnings KES, cash held KES
  r1: [9, 3200, 4500], r2: [5, 1800, 0], r3: [3, 1100, 2300], r4: [7, 2500, 1200], r5: [6, 2100, 0], r6: [0, 0, 0],
};
riders.forEach((r) => {
  if (r.active !== undefined) return;
  const [jobs, earn, cash] = SEED[r.id] ?? [0, 0, 0];
  Object.assign(r, { active: true, jobs, earningsMinor: earn * 100, cashHeldMinor: cash * 100, plate: r.vehicle.match(/K\w{3} \d{3}\w/)?.[0] ?? '' });
});

const later = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
const get = (id: string) => { const r = riders.find((x) => x.id === id); if (!r) throw new Error('Courier not found'); return r; };
const PHONE = /^\+254\d{9}$/;

export const CONTAINERS = ['Kilimani', 'Westlands', 'CBD'];

export const couriers = {
  list: () => later(JSON.parse(JSON.stringify(riders)) as typeof riders),
  add: async (p: { name: string; phone: string; vehicle: string; container: string }) => {
    if (!p.name.trim()) throw new Error('Enter the courier name.');
    if (!PHONE.test(p.phone)) throw new Error('Phone must look like +254700000000.');
    if (riders.some((r) => r.phone === p.phone)) throw new Error('A courier with this phone number already exists.');
    riders.push({ id: 'r' + Date.now(), name: p.name.trim(), phone: p.phone, kind: 'courier', vehicle: p.vehicle.trim() || 'Not set', container: p.container,
      availability: 'offline', lastSeenMin: 9999, active: true, jobs: 0, earningsMinor: 0, cashHeldMinor: 0, plate: '' });
    return later(true);
  },
  update: async (id: string, p: { phone: string; vehicle: string; plate: string; container: string }) => {
    if (!PHONE.test(p.phone)) throw new Error('Phone must look like +254700000000.');
    Object.assign(get(id), p);
    return later(true);
  },
  setActive: async (id: string, active: boolean) => {
    const r = get(id);
    if (!active && r.availability === 'busy') throw new Error('This courier has a job in progress. Deactivate after it is delivered.');
    r.active = active;
    if (!active) r.availability = 'offline';
    return later(true);
  },
  recordHandover: async (id: string, kes: number) => {
    const r = get(id);
    const minor = Math.round(kes * 100);
    if (!(minor > 0)) throw new Error('Enter an amount above zero.');
    if (minor > (r.cashHeldMinor ?? 0)) throw new Error('That is more than the cash this courier is holding.');
    r.cashHeldMinor = (r.cashHeldMinor ?? 0) - minor;
    return later(`Recorded ${(minor / 100).toLocaleString('en-KE')} KES handed in by ${r.name}.`);
  },
};