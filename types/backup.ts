export interface BackupEntry {
  id: string;
  projectId: string;
  projectName: string;
  filename: string;
  size: number;
  createdAt: string;
  commit: string;
}
