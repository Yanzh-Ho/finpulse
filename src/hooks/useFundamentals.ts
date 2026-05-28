import { useState, useEffect } from 'react';

export interface Fundamentals {
  pe: string;
  eps: string;
  cap: string;
  beta: string;
  div: string;
  profitMargin: string;
  revenueGrowth: string;
  vol: string;
  avgVol: string;
  analysts: { buy: number; hold: number; sell: number };
  target: { lo: number; mid: number; hi: number };
  summary: string;
  limitedData?: boolean;
}

export function useFundamentals(ticker: string | null) {
  const [data, setData] = useState<Fundamentals | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticker) { setData(null); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/fundamentals/${encodeURIComponent(ticker)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((json: { data: Fundamentals | null }) => {
        if (!cancelled) { setData(json.data); setLoading(false); }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticker]);

  return { data, loading };
}
