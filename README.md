# Deliv Admin (React + TypeScript + Vite + TanStack Query + Tailwind)

    npm install
    npm run dev        # http://localhost:5173/admin/

Demo sign-in accepts any email and password; pick a role to see permissions change.
All data comes from `src/lib/api.ts` (in-memory mock). To go live, replace each function with a
`fetch('/v1/admin/...', { credentials: 'include' })` call; Vite proxies `/v1` to localhost:8080.

Built: login shell, live order board, order detail (confirm for merchant, ready, assign, cancel, timeline).
Next: Dispatch, Merchants and menu editor, Couriers, Customers, Zones, Payments, Reports, Settings, Users and audit.
