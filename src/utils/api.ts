// Production (GitHub Pages): VITE_API_BASE=https://finpulse-qgrv.vercel.app
// Development: empty string → Vite proxy handles /api → localhost:3001
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '';
