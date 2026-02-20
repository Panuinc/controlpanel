'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FileEntry } from '@/types/files';
import FileListItem from './file-list-item';
import BreadcrumbNav from './breadcrumb-nav';
import FileEditor from './file-editor';
import FileUploadDialog from './file-upload-dialog';
import { Upload, FolderPlus, RefreshCw } from 'lucide-react';

export default function FileBrowser() {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fetchFiles = useCallback(async (dirPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(dirPath)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFiles(data.files);
      setCurrentPath(dirPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(currentPath);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function navigateTo(path: string) {
    setEditingFile(null);
    fetchFiles(path);
  }

  async function handleDelete(filePath: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/files/delete?path=${encodeURIComponent(filePath)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchFiles(currentPath);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleRename(oldPath: string) {
    const newName = prompt('New name:');
    if (!newName) return;
    const parts = oldPath.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');
    try {
      const res = await fetch('/api/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchFiles(currentPath);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rename failed');
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    const folderPath = currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}`;
    try {
      const res = await fetch('/api/files/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setShowNewFolder(false);
      setNewFolderName('');
      fetchFiles(currentPath);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create folder');
    }
  }

  function handleDownload(filePath: string) {
    window.open(`/api/files/download?path=${encodeURIComponent(filePath)}`, '_blank');
  }

  if (editingFile) {
    return (
      <FileEditor
        filePath={editingFile}
        onClose={() => setEditingFile(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BreadcrumbNav path={currentPath} onNavigate={navigateTo} />
        <div className="flex gap-2">
          <button
            onClick={() => fetchFiles(currentPath)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowNewFolder(true)}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
            title="New Folder"
          >
            <FolderPlus size={16} />
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 flex items-center gap-1.5"
          >
            <Upload size={14} />
            Upload
          </button>
        </div>
      </div>

      {showNewFolder && (
        <div className="flex gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            placeholder="Folder name"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            autoFocus
          />
          <button onClick={handleCreateFolder} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
            Create
          </button>
          <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 hover:text-white">
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_160px_100px] gap-4 border-b border-white/10 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <div>Name</div>
          <div className="text-right">Size</div>
          <div>Modified</div>
          <div className="text-right">Actions</div>
        </div>

        {loading ? (
          <div className="space-y-1 p-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : (
          <div>
            {currentPath !== '/' && (
              <FileListItem
                file={{ name: '..', path: currentPath.split('/').slice(0, -1).join('/') || '/', isDirectory: true, isSymlink: false, size: 0, modified: '', permissions: '' }}
                onNavigate={navigateTo}
                onEdit={() => {}}
                onDelete={() => {}}
                onRename={() => {}}
                onDownload={() => {}}
                isParent
              />
            )}
            {files.map((file) => (
              <FileListItem
                key={file.path}
                file={file}
                onNavigate={navigateTo}
                onEdit={() => setEditingFile(file.path)}
                onDelete={() => handleDelete(file.path, file.name)}
                onRename={() => handleRename(file.path)}
                onDownload={() => handleDownload(file.path)}
              />
            ))}
            {files.length === 0 && !loading && (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                Empty directory
              </div>
            )}
          </div>
        )}
      </div>

      {showUpload && (
        <FileUploadDialog
          targetDir={currentPath}
          onClose={() => setShowUpload(false)}
          onComplete={() => { setShowUpload(false); fetchFiles(currentPath); }}
        />
      )}
    </div>
  );
}
