'use client';

import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/files': 'File Manager',
  '/services': 'Services',
  '/terminal': 'Terminal',
};

export default function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Control Panel';

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-white/10 bg-[#0a0a0a] px-6">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
    </header>
  );
}
