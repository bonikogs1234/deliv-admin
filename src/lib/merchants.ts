// Mock merchants and menus. Swap for /v1/admin/merchants/... calls when the backend exists.
export interface Option { name: string; required: boolean; min: number; max: number; choices: string[] }
export interface Item { id: string; name: string; priceMinor: number; available: boolean; options: Option[] }
export interface Category { id: string; name: string; items: Item[] }
export interface Merchant {
  id: string; name: string; phone: string; smsNumber: string; hours: string; open: boolean; pausedUntil?: string;
  commissionPct: number; rating: number; active: boolean; categories: Category[];
}

const it = (id: string, name: string, kes: number, options: Option[] = []): Item => ({ id, name, priceMinor: kes * 100, available: true, options });
const size: Option = { name: 'Size', required: true, min: 1, max: 1, choices: ['Regular', 'Large'] };
const extras: Option = { name: 'Extras', required: false, min: 0, max: 3, choices: ['Cheese', 'Bacon', 'Avocado'] };

const data: Merchant[] = [
  { id: 'm1', name: 'Mama Oliech Restaurant', phone: '+25420111001', smsNumber: '+254700100100', hours: '09:00–22:00', open: true, commissionPct: 15, rating: 4.6, active: true,
    categories: [{ id: 'c1', name: 'Mains', items: [it('i1', 'Fried tilapia', 1200), it('i2', 'Beef stew', 670)] }, { id: 'c2', name: 'Sides', items: [it('i3', 'Ugali', 150), it('i4', 'Kachumbari', 350)] }] },
  { id: 'm2', name: 'Java House Westlands', phone: '+25420111002', smsNumber: '+254700200200', hours: '07:00–21:00', open: true, commissionPct: 18, rating: 4.4, active: true,
    categories: [{ id: 'c3', name: 'Food', items: [it('i5', 'Chicken wrap', 390, [extras]), it('i6', 'Breakfast bowl', 650)] }, { id: 'c4', name: 'Drinks', items: [it('i7', 'Iced latte', 200, [size])] }] },
  { id: 'm3', name: 'Pizza Inn Kilimani', phone: '+25420111003', smsNumber: '+254700300300', hours: '10:00–23:00', open: false, commissionPct: 16, rating: 4.1, active: true,
    categories: [{ id: 'c5', name: 'Pizza', items: [it('i8', 'Large pepperoni', 1600, [size, extras]), it('i9', 'Margherita', 1200, [size])] }, { id: 'c6', name: 'Sides', items: [it('i10', 'Garlic bread', 410)] }] },
  { id: 'm4', name: 'Kenchic Inn', phone: '+25420111004', smsNumber: '+254700400400', hours: '10:00–22:00', open: true, commissionPct: 14, rating: 3.9, active: false,
    categories: [{ id: 'c7', name: 'Chicken', items: [it('i11', 'Chicken bucket', 1760), it('i12', 'Quarter chicken', 550)] }] },
];

const later = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));
const get = (id: string) => { const m = data.find((x) => x.id === id); if (!m) throw new Error('Merchant not found'); return m; };
export const isPaused = (m: Merchant) => !!m.pausedUntil && new Date(m.pausedUntil) > new Date();

export const merchants = {
  list: () => later(JSON.parse(JSON.stringify(data)) as Merchant[]),
  setOpen: async (id: string, open: boolean) => { const m = get(id); m.open = open; m.pausedUntil = undefined; return later(true); },
  pause: async (id: string, minutes: number) => { get(id).pausedUntil = minutes ? new Date(Date.now() + minutes * 60000).toISOString() : undefined; return later(true); },
  update: async (id: string, p: Partial<Pick<Merchant, 'phone' | 'smsNumber' | 'hours' | 'commissionPct' | 'active'>>) => {
    if (p.commissionPct !== undefined && (isNaN(p.commissionPct) || p.commissionPct < 0 || p.commissionPct > 50)) throw new Error('Commission must be between 0 and 50 percent.');
    if (p.smsNumber !== undefined && !/^\+254\d{9}$/.test(p.smsNumber)) throw new Error('SMS number must look like +254700000000.');
    Object.assign(get(id), p); return later(true);
  },
  testSms: async (id: string) => later(`Test SMS queued to ${get(id).smsNumber}.`),
  setItem: async (mid: string, itemId: string, p: Partial<Pick<Item, 'priceMinor' | 'available'>>) => {
    if (p.priceMinor !== undefined && (!Number.isFinite(p.priceMinor) || p.priceMinor <= 0)) throw new Error('Enter a price above zero.');
    const item = get(mid).categories.flatMap((c) => c.items).find((x) => x.id === itemId);
    if (!item) throw new Error('Item not found');
    Object.assign(item, p); return later(true);
  },
  bulkPrice: async (mid: string, pct: number) => {
    if (!Number.isFinite(pct) || pct === 0 || pct < -50 || pct > 100) throw new Error('Enter a change between -50 and 100 percent.');
    get(mid).categories.forEach((c) => c.items.forEach((i) => (i.priceMinor = Math.max(100, Math.round((i.priceMinor * (1 + pct / 100)) / 100) * 100))));
    return later(true);
  },
  addItem: async (mid: string, catId: string, name: string, kes: number) => {
    if (!name.trim()) throw new Error('Enter an item name.');
    if (!(kes > 0)) throw new Error('Enter a price above zero.');
    get(mid).categories.find((c) => c.id === catId)!.items.push(it('i' + Date.now(), name.trim(), kes));
    return later(true);
  },
};