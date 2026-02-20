import path from 'path';
import fs from 'fs/promises';
import { FILE_MANAGER_ROOT } from './constants';

export class PathSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathSecurityError';
  }
}

function normalizeRoot(): string {
  const root = FILE_MANAGER_ROOT;
  // On Windows, path.resolve('/') returns something like 'E:\' depending on cwd
  // Normalize to ensure consistent comparison
  return path.resolve(root);
}

export function resolveAndValidatePath(userPath: string): string {
  if (userPath.includes('\0')) {
    throw new PathSecurityError('Path contains null bytes');
  }

  const root = normalizeRoot();
  const resolved = path.resolve(root, userPath.startsWith('/') ? '.' + userPath : userPath);

  if (!resolved.startsWith(root)) {
    throw new PathSecurityError('Path traversal detected');
  }

  return resolved;
}

export async function resolveAndValidatePathStrict(userPath: string): Promise<string> {
  const root = normalizeRoot();
  const resolved = resolveAndValidatePath(userPath);

  try {
    const real = await fs.realpath(resolved);
    if (!real.startsWith(root)) {
      throw new PathSecurityError('Symlink escapes root');
    }
    return real;
  } catch (err) {
    if (err instanceof PathSecurityError) throw err;
    return resolved;
  }
}

export function getFileIcon(name: string, isDir: boolean): string {
  if (isDir) return 'folder';
  const ext = path.extname(name).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'code', '.tsx': 'code', '.js': 'code', '.jsx': 'code',
    '.py': 'code', '.go': 'code', '.rs': 'code', '.java': 'code',
    '.json': 'braces', '.yaml': 'braces', '.yml': 'braces', '.toml': 'braces',
    '.md': 'file-text', '.txt': 'file-text', '.log': 'file-text',
    '.html': 'globe', '.css': 'palette', '.scss': 'palette',
    '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image', '.svg': 'image',
    '.zip': 'archive', '.tar': 'archive', '.gz': 'archive',
    '.sh': 'terminal', '.bash': 'terminal',
    '.env': 'lock', '.pem': 'lock', '.key': 'lock',
  };
  return map[ext] || 'file';
}
