'use client';

import { ChevronRight, HardDrive } from 'lucide-react';

interface Props {
  path: string;
  onNavigate: (path: string) => void;
}

export default function BreadcrumbNav({ path, onNavigate }: Props) {
  const parts = path.split('/').filter(Boolean);

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => onNavigate('/')}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-zinc-400 hover:bg-white/5 hover:text-white"
      >
        <HardDrive size={14} />
        <span>/</span>
      </button>
      {parts.map((part, i) => {
        const fullPath = '/' + parts.slice(0, i + 1).join('/');
        const isLast = i === parts.length - 1;
        return (
          <div key={fullPath} className="flex items-center gap-1">
            <ChevronRight size={12} className="text-zinc-600" />
            <button
              onClick={() => onNavigate(fullPath)}
              className={`rounded-md px-2 py-1 ${
                isLast ? 'text-white font-medium' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {part}
            </button>
          </div>
        );
      })}
    </div>
  );
}
