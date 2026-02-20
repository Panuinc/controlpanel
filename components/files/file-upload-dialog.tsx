'use client';

import { useState, useRef } from 'react';
import { Upload, X, File as FileIcon } from 'lucide-react';

interface Props {
  targetDir: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function FileUploadDialog({ targetDir, onClose, onComplete }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(fileList: FileList) {
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('targetDir', targetDir);
      files.forEach((f) => formData.append('files', f));

      const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      onComplete();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Upload Files</h3>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mb-2 text-xs text-zinc-500">To: {targetDir}</div>

        <div
          className={`mb-4 rounded-xl border-2 border-dashed p-8 text-center transition ${
            dragOver ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 hover:border-white/20'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={24} className="mx-auto mb-2 text-zinc-500" />
          <p className="text-sm text-zinc-400">Drop files here or click to browse</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="mb-4 max-h-40 space-y-1 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon size={14} className="text-zinc-500 shrink-0" />
                  <span className="truncate text-zinc-300">{f.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{formatSize(f.size)}</span>
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
