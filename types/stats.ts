export interface CpuStats {
  usage: number;
  cores: number;
  model: string;
  speed: number;
}

export interface MemoryStats {
  total: number;
  used: number;
  free: number;
  usedPercent: number;
}

export interface DiskStats {
  fs: string;
  mount: string;
  size: number;
  used: number;
  available: number;
  usedPercent: number;
}

export interface NetworkStats {
  iface: string;
  rxSec: number;
  txSec: number;
  rxTotal: number;
  txTotal: number;
}

export interface OsInfo {
  hostname: string;
  platform: string;
  distro: string;
  release: string;
  uptime: number;
  arch: string;
}

export interface SystemStats {
  cpu: CpuStats;
  memory: MemoryStats;
  disk: DiskStats[];
  network: NetworkStats;
  os: OsInfo;
  loadAvg: number[];
  processes: number;
}
