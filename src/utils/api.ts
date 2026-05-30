// API base URL — hardcoded by build mode so it NEVER falls back to localhost.
// Development (vite dev): '' → Vite proxy forwards /api/* to http://localhost:3001
// Production  (vite build): Vercel backend, always absolute, no env-var dependency
export const API_BASE: string = import.meta.env.PROD
  ? 'https://finpulse-qgrv.vercel.app'
  : '';
