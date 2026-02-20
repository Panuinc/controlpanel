'use client';

import dynamic from 'next/dynamic';

const TerminalView = dynamic(() => import('@/components/terminal/terminal-view'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-xl border border-white/10 bg-[#0a0a0a]">
      <div className="text-sm text-zinc-500">Loading terminal...</div>
    </div>
  ),
});

export default function TerminalPage() {
  return (
    <div className="h-full">
      <TerminalView />
    </div>
  );
}
