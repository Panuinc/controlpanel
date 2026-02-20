'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Server,
  Terminal,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Rocket,
  Globe,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: Rocket },
  { href: '/sites', label: 'Sites', icon: Globe },
  { href: '/files', label: 'Files', icon: FolderOpen },
  { href: '/services', label: 'Services', icon: Server },
  { href: '/terminal', label: 'Terminal', icon: Terminal },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <aside
      className={`flex h-screen flex-col border-r border-white/10 bg-[#0f0f0f] transition-all ${collapsed ? 'w-16' : 'w-56'}`}
    >
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        {!collapsed && <span className="text-sm font-semibold text-white">Control Panel</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? 'bg-blue-600/10 text-blue-400'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-red-400"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
