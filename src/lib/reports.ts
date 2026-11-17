// Mock report data: 30 days of orders. Swap for /v1/admin/reports calls later.
export interface Day { date: string; orders: number; cancelled: number; gmvMinor: number; commissionMinor: number; courierPayMinor: number }

const build = (): Day[] => Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.now() - (29 - i) * 86400000);
  const orders = 40 + Math.round((((i * 37 + 11) % 17) / 17) * 30) + (d.getUTCDay() >= 5 ? 15 : 0);
  const avg = (1600 + Math.round((((i * 53) % 13) / 13) * 800)) * 100;
  const gmv = orders * avg;
  return { date: d.toISOString().slice(0, 10), orders, cancelled: Math.round(orders * 0.05), gmvMinor: gmv, commissionMinor: Math.round(gmv * 0.16), courierPayMinor: orders * 12000 };
});

export const MERCHANT_SHARES: [string, number, number][] = [['Mama Oliech Restaurant', 0.35, 15], ['Java House Westlands', 0.3, 18], ['Pizza Inn Kilimani', 0.2, 16], ['Kenchic Inn', 0.15, 14]];
export const reportsApi = { days: () => new Promise<Day[]>((r) => setTimeout(() => r(build()), 120)) };