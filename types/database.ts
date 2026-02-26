export interface SupabaseConnection {
  id: string;
  name: string;
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupabaseConnectionPublic {
  id: string;
  name: string;
  projectUrl: string;
  hasServiceRoleKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TableInfo {
  name: string;
  schema: string;
  rowCount: number | null;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  error?: string;
}
