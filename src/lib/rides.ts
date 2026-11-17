// Mock rides. Swap for /v1/admin/rides calls later. Statuses follow the design doc.
import { isStale, riders } from './dispatch';

export type RideStatus = 'REQUESTED' | 'OFFERED' | 'DRIVER_MATCHED' | 'DRIVER_ARRIVING' | 'IN_TRIP' | 'COMPLETED' | 'CANCELLED' | 'UNMATCHED';
export interface Ride {
  id: string; code: string; rider: string; phone: string; pickup: string; dropoff: string; vehicle: 'Boda' | 'Car'; fareMinor: number;
  status: RideStatus; requestedAt: string; offerExpiresAt?: string; driver?: { name: string; phone: string }; sos?: boolean; cancelReason?: string;
}
export const OFFER_SECONDS = 40;
const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();

const rides: Ride[] = [
  { id: 'ri1', code: 'R-1042', rider: 'Lucy Akinyi', phone: '+254701010101', pickup: 'Yaya Centre, Kilimani', dropoff: 'Sarit Centre, Westlands', vehicle: 'Car', fareMinor: 85000, status: 'REQUESTED', requestedAt: ago(1) },
  { id: 'ri2', code: 'R-1041', rider: 'Samuel Kiptoo', phone: '+254702020202', pickup: 'Prestige Plaza', dropoff: 'Nairobi CBD, Kencom', vehicle: 'Boda', fareMinor: 35000, status: 'UNMATCHED', requestedAt: ago(6) },
  { id: 'ri3', code: 'R-1039', rider: 'Naomi Chebet', phone: '+254703030303', pickup: 'Lavington Mall', dropoff: 'Junction Mall', vehicle: 'Boda', fareMinor: 28000, status: 'DRIVER_ARRIVING', requestedAt: ago(12), driver: { name: 'Peter Otieno', phone: '+254712000111' } },
  { id: 'ri4', code: 'R-1037', rider: 'Victor Onyango', phone: '+254704040404', pickup: 'Westgate Mall', dropoff: 'Karen Hospital', vehicle: 'Car', fareMinor: 210000, status: 'IN_TRIP', requestedAt: ago(30), driver: { name: 'Faith Wanjiru', phone: '+254722000222' }, sos: true },
  { id: 'ri5', code: 'R-1030', rider: 'Mercy Wanja', phone: '+254705050505', pickup: 'Adams Arcade', dropoff: 'Yaya Centre', vehicle: 'Boda', fareMinor: 25000, status: 'COMPLETED', requestedAt: ago(120), driver: { name: 'Kevin Mwangi', phone: '+254755000555' } },
];

const later = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 100));
const get = (id: string) => { const r = rides.find((x) => x.id === id); if (!r) throw new Error('Ride not found'); return r; };

export const ridesApi = {
  list: () => {
    // Mock of "no driver accepted in any stage": an expired offer becomes UNMATCHED.
    rides.forEach((r) => { if (r.status === 'OFFERED' && r.offerExpiresAt && new Date(r.offerExpiresAt) < new Date()) { r.status = 'UNMATCHED'; r.offerExpiresAt = undefined; } });
    return later(JSON.parse(JSON.stringify(rides)) as Ride[]);
  },
  offer: async (id: string) => {
    const r = get(id);
    if (r.status !== 'REQUESTED' && r.status !== 'UNMATCHED') throw new Error('Only new or unmatched rides can be offered.');
    r.status = 'OFFERED'; r.offerExpiresAt = new Date(Date.now() + OFFER_SECONDS * 1000).toISOString();
    return later(`Offer sent to online drivers. They have ${OFFER_SECONDS} seconds.`);
  },
  // Demo only: stands in for a driver tapping Accept on their SMS link.
  simulateAccept: async (id: string) => {
    const r = get(id);
    if (r.status !== 'OFFERED') throw new Error('This offer has already ended.');
    const d = riders.find((x) => x.availability === 'online' && !isStale(x) && x.active !== false);
    if (!d) throw new Error('No driver is online right now.');
    r.driver = { name: d.name, phone: d.phone }; r.status = 'DRIVER_MATCHED'; r.offerExpiresAt = undefined; d.availability = 'busy';
    return later(`${d.name} accepted. The customer sees the driver card and trip PIN.`);
  },
  cancel: async (id: string, reason: string) => {
    const r = get(id);
    if (r.status === 'COMPLETED' || r.status === 'CANCELLED') throw new Error('This ride is already finished.');
    if (!reason.trim()) throw new Error('Add a reason for the cancellation.');
    const d = riders.find((x) => x.name === r.driver?.name);
    if (d) d.availability = 'online';
    r.status = 'CANCELLED'; r.cancelReason = reason.trim(); r.offerExpiresAt = undefined; r.sos = false;
    return later('Ride cancelled.');
  },
};