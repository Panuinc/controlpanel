'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { SystemStats } from '@/types/stats';

interface StatsContextType {
  stats: SystemStats | null;
  history: { cpu: number[]; rxSec: number[]; txSec: number[]; timestamps: number[] };
  loading: boolean;
  error: string | null;
}

const StatsContext = createContext<StatsContextType>({
  stats: null,
  history: { cpu: [], rxSec: [], txSec: [], timestamps: [] },
  loading: true,
  error: null,
});

export function useStats() {
  return useContext(StatsContext);
}

const MAX_HISTORY = 30;

export default function StatsProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [history, setHistory] = useState<StatsContextType['history']>({
    cpu: [],
    rxSec: [],
    txSec: [],
    timestamps: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch');
      const data: SystemStats = await res.json();
      setStats(data);
      setError(null);

      setHistory((prev) => {
        const now = Date.now();
        const cpu = [...prev.cpu, data.cpu.usage].slice(-MAX_HISTORY);
        const rxSec = [...prev.rxSec, data.network.rxSec].slice(-MAX_HISTORY);
        const txSec = [...prev.txSec, data.network.txSec].slice(-MAX_HISTORY);
        const timestamps = [...prev.timestamps, now].slice(-MAX_HISTORY);
        return { cpu, rxSec, txSec, timestamps };
      });
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <StatsContext.Provider value={{ stats, history, loading, error }}>
      {children}
    </StatsContext.Provider>
  );
}
