// API base URL — includes /api so every fetch just appends the endpoint name.
// Development (vite dev): '' → Vite proxy forwards /api/* to http://localhost:3001
// Production  (vite build): Vercel backend with /api prefix, no env-var dependency
export const API_BASE: string = import.meta.env.PROD
  ? 'https://finpulse-backend-node.vercel.app/api'
  : '';
