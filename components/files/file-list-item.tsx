'use client';

import type { FileEntry } from '@/types/files';
import { Folder, File, FileText, FileCode, Image, Archive, Terminal, Lock, Globe, ChevronUp, Pencil, Trash2, Download, MoreHorizontal } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getIcon(name: string, isDir: boolean) {
  if (isDir) return <Folder size={16} className="text-blue-400" />;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const codeExts = ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'rb', 'php'];
  const textExts = ['md', 'txt', 'log', 'csv'];
  const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'];
  const archiveExts = ['zip', 'tar', 'gz', 'bz2', '7z', 'rar'];
  if (codeExts.includes(ext)) return <FileCode size={16} className="text-emerald-400" />;
  if (textExts.includes(ext)) return <FileText size={16} className="text-zinc-400" />;
  if (imgExts.includes(ext)) return <Image size={16} className="text-purple-400" />;
  if (archiveExts.includes(ext)) return <Archive size={16} className="text-yellow-400" />;
  if (['sh', 'bash', 'zsh'].includes(ext)) return <Terminal size={16} className="text-orange-400" />;
  if (['env', 'pem', 'key', 'crt'].includes(ext)) return <Lock size={16} className="text-red-400" />;
  if (['html', 'css', 'scss'].includes(ext)) return <Globe size={16} className="text-blue-300" />;
  return <File size={16} className="text-zinc-500" />;
}

interface Props {
  file: FileEntry;
  onNavigate: (path: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onRename: () => void;
  onDownload: () => void;
  isParent?: boolean;
}

export default function FileListItem({ file, onNavigate, onEdit, onDelete, onRename, onDownload, isParent }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  function handleClick() {
    if (file.isDirectory) {
      onNavigate(file.path);
    } else {
      onEdit();
    }
  }

  return (
    <div className="grid grid-cols-[1fr_100px_160px_100px] gap-4 items-center px-4 py-2 text-sm hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-b-0">
      <div className="flex items-center gap-2.5 min-w-0" onClick={handleClick}>
        {isParent ? <ChevronUp size={16} className="text-zinc-500" /> : getIcon(file.name, file.isDirectory)}
        <span className={`truncate ${file.isDirectory ? 'text-blue-400' : 'text-zinc-200'}`}>
          {isParent ? '..' : file.name}
          {file.isSymlink && <span className="ml-1 text-xs text-zinc-500">→</span>}
        </span>
      </div>
      <div className="text-right text-zinc-500 text-xs">
        {file.isDirectory ? '—' : formatBytes(file.size)}
      </div>
      <div className="text-zinc-500 text-xs">{formatDate(file.modified)}</div>
      <div className="flex justify-end relative" ref={menuRef}>
        {!isParent && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              className="rounded-md p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-white/10 bg-[#1a1a1a] py-1 shadow-xl">
                {!file.isDirectory && (
                  <button onClick={() => { setShowMenu(false); onEdit(); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
                    <Pencil size={12} /> Edit
                  </button>
                )}
                <button onClick={() => { setShowMenu(false); onRename(); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
                  <Pencil size={12} /> Rename
                </button>
                {!file.isDirectory && (
                  <button onClick={() => { setShowMenu(false); onDownload(); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
                    <Download size={12} /> Download
                  </button>
                )}
                <button onClick={() => { setShowMenu(false); onDelete(); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-white/5">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
