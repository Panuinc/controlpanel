'use client';

import StatsProvider from '@/components/dashboard/stats-provider';
import CpuGauge from '@/components/dashboard/cpu-gauge';
import RamGauge from '@/components/dashboard/ram-gauge';
import DiskUsage from '@/components/dashboard/disk-usage';
import NetworkChart from '@/components/dashboard/network-chart';
import SystemInfoCard from '@/components/dashboard/system-info-card';
import { useStats } from '@/components/dashboard/stats-provider';

function DashboardContent() {
  const { loading, error } = useStats();

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl border border-white/10 bg-white/5" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-400">{error}</p>
        <p className="mt-1 text-sm text-zinc-500">Make sure the server is running on your VPS</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CpuGauge />
      <RamGauge />
      <NetworkChart />
      <DiskUsage />
      <SystemInfoCard />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <StatsProvider>
      <DashboardContent />
    </StatsProvider>
  );
}
