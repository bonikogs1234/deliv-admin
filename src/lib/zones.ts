// Mock zones, fee rules and promos. Swap for /v1/admin/zones, /pricing and /promos calls later.
export interface Fee { baseMinor: number; includedKm: number; perKmMinor: number; maxMinor: number }
export interface Zone { id: string; name: string; active: boolean; fee: Fee; scheduled?: { fee: Fee; from: string } }
export interface Pricing { serviceFeePct: number; serviceFeeCapMinor: number }
export interface Promo {
  id: string; code: string; kind: 'percent' | 'fixed'; value: number; minOrderMinor: number;
  perUserLimit: number; totalLimit: number; used: number; validFrom: string; validTo: string; active: boolean;
}

const fee = (base: number, km: number, perKm: number, max: number): Fee => ({ baseMinor: base * 100, includedKm: km, perKmMinor: perKm * 100, maxMinor: max * 100 });
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const zoneList: Zone[] = [
  { id: 'z1', name: 'Kilimani', active: true, fee: fee(150, 2, 30, 400) },
  { id: 'z2', name: 'Westlands', active: true, fee: fee(180, 2, 35, 450) },
  { id: 'z3', name: 'CBD', active: true, fee: fee(120, 1.5, 30, 350) },
  { id: 'z4', name: 'Karen', active: false, fee: fee(250, 3, 40, 700) },
];
const pricing: Pricing = { serviceFeePct: 5, serviceFeeCapMinor: 10000 };
const promoList: Promo[] = [
  { id: 'pr1', code: 'WELCOME100', kind: 'fixed', value: 10000, minOrderMinor: 50000, perUserLimit: 1, totalLimit: 500, used: 132, validFrom: day(-30), validTo: day(60), active: true },
  { id: 'pr2', code: 'LUNCH10', kind: 'percent', value: 10, minOrderMinor: 80000, perUserLimit: 3, totalLimit: 1000, used: 410, validFrom: day(-10), validTo: day(20), active: true },
];

const later = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
const zone = (id: string) => { const z = zoneList.find((x) => x.id === id); if (!z) throw new Error('Zone not found'); return z; };

/** Delivery fee for a distance: base covers the included km, then a rate per extra km, up to the maximum. */
export const deliveryFee = (f: Fee, km: number) =>
  Math.round(Math.min(f.maxMinor, f.baseMinor + Math.max(0, km - f.includedKm) * f.perKmMinor) / 100) * 100;

const applyDue = () => zoneList.forEach((z) => { if (z.scheduled && new Date(z.scheduled.from) <= new Date()) { z.fee = z.scheduled.fee; z.scheduled = undefined; } });

export const zonesApi = {
  all: () => { applyDue(); return later(JSON.parse(JSON.stringify({ zones: zoneList, pricing, promos: promoList })) as { zones: Zone[]; pricing: Pricing; promos: Promo[] }); },
  setZoneActive: async (id: string, active: boolean) => { zone(id).active = active; return later(active ? 'Zone is now served.' : 'Zone switched off. Customers there cannot order.'); },
  saveFee: async (id: string, kes: { base: number; includedKm: number; perKm: number; max: number }, fromLocal: string) => {
    if ([kes.base, kes.includedKm, kes.perKm, kes.max].some((n) => !Number.isFinite(n) || n < 0)) throw new Error('Enter numbers of zero or more in every field.');
    if (kes.max < kes.base) throw new Error('The maximum fee cannot be lower than the base fee.');
    const from = new Date(fromLocal);
    if (isNaN(from.getTime())) throw new Error('Choose when the change starts.');
    const f: Fee = { baseMinor: Math.round(kes.base * 100), includedKm: kes.includedKm, perKmMinor: Math.round(kes.perKm * 100), maxMinor: Math.round(kes.max * 100) };
    const z = zone(id);
    if (from.getTime() <= Date.now() + 60000) { z.fee = f; z.scheduled = undefined; return later('New fee rule is live.'); }
    z.scheduled = { fee: f, from: from.toISOString() };
    return later('Change scheduled. The current rule stays until then.');
  },
  cancelScheduled: async (id: string) => { zone(id).scheduled = undefined; return later('Scheduled change cancelled.'); },
  savePricing: async (pct: number, capKes: number) => {
    if (!(pct >= 0 && pct <= 15)) throw new Error('Service fee must be between 0 and 15 percent.');
    if (!(capKes >= 0)) throw new Error('Enter a cap of zero or more.');
    pricing.serviceFeePct = pct; pricing.serviceFeeCapMinor = Math.round(capKes * 100);
    return later('Service fee saved.');
  },
  addPromo: async (p: { code: string; kind: 'percent' | 'fixed'; value: number; minOrder: number; perUser: number; total: number; from: string; to: string }) => {
    const code = p.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(code)) throw new Error('Code must be 4 to 12 letters or numbers.');
    if (promoList.some((x) => x.code === code)) throw new Error('That code already exists.');
    if (!(p.value > 0) || (p.kind === 'percent' && p.value > 100)) throw new Error(p.kind === 'percent' ? 'Percent must be between 1 and 100.' : 'Enter a discount above zero.');
    if (!(p.perUser >= 1) || !(p.total >= 1)) throw new Error('Limits must be at least 1.');
    if (!p.from || !p.to || p.to < p.from) throw new Error('Choose valid dates. The end date must not be before the start.');
    promoList.unshift({ id: 'pr' + Date.now(), code, kind: p.kind, value: p.kind === 'fixed' ? Math.round(p.value * 100) : p.value, minOrderMinor: Math.round(p.minOrder * 100), perUserLimit: p.perUser, totalLimit: p.total, used: 0, validFrom: p.from, validTo: p.to, active: true });
    return later('Promo code added.');
  },
  setPromoActive: async (id: string, active: boolean) => { const p = promoList.find((x) => x.id === id); if (p) p.active = active; return later(active ? 'Promo switched on.' : 'Promo switched off.'); },
};