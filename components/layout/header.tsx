'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/sites': 'Sites',
  '/files': 'File Manager',
  '/services': 'Services',
  '/terminal': 'Terminal',
  '/database': 'Database',
  '/docker': 'Docker',
  '/cron': 'Cron Jobs',
  '/firewall': 'Firewall',
  '/ssl': 'SSL Certificates',
  '/backups': 'Backups',
  '/notifications': 'Notifications',
  '/audit': 'Audit Log',
  '/users': 'Users',
  '/settings': 'Settings',
};

export default function Header() {
  const pathname = usePathname();

  const title = Object.entries(pageTitles).find(([path]) => pathname.startsWith(path))?.[1] || 'Control Panel';

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-white/10 bg-[#0a0a0a] px-6">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
    </header>
  );
}
