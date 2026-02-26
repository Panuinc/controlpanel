'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Trash2, Table, Play, ArrowLeft, X, ChevronRight } from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  projectUrl: string;
  hasServiceKey: boolean;
  createdAt: string;
}

interface TableInfo {
  name: string;
  schema: string;
}

interface TableData {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  error?: string;
}

type ActiveView = 'connections' | 'tables' | 'query';

export default function ConnectionList() {
  const [activeView, setActiveView] = useState<ActiveView>('connections');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connection form modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formAnonKey, setFormAnonKey] = useState('');
  const [formServiceKey, setFormServiceKey] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Selected connection
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

  // Tables view
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [tableDataLoading, setTableDataLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Query view
  const [sql, setSql] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/database/connections');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConnections(data.connections);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const fetchTables = useCallback(async (connectionId: string) => {
    setTablesLoading(true);
    try {
      const res = await fetch(`/api/database/tables?connectionId=${connectionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTables(data.tables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables');
    } finally {
      setTablesLoading(false);
    }
  }, []);

  const fetchTableData = useCallback(async (connectionId: string, table: string, off: number) => {
    setTableDataLoading(true);
    try {
      const res = await fetch(
        `/api/database/table-data?connectionId=${connectionId}&table=${encodeURIComponent(table)}&limit=${limit}&offset=${off}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTableData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load table data');
    } finally {
      setTableDataLoading(false);
    }
  }, []);

  function handleSelectConnection(conn: Connection) {
    setSelectedConnection(conn);
    setActiveView('tables');
    setSelectedTable(null);
    setTableData(null);
    setOffset(0);
    fetchTables(conn.id);
  }

  function handleSelectTable(tableName: string) {
    setSelectedTable(tableName);
    setOffset(0);
    if (selectedConnection) {
      fetchTableData(selectedConnection.id, tableName, 0);
    }
  }

  function handlePageChange(newOffset: number) {
    setOffset(newOffset);
    if (selectedConnection && selectedTable) {
      fetchTableData(selectedConnection.id, selectedTable, newOffset);
    }
  }

  function handleBackToConnections() {
    setActiveView('connections');
    setSelectedConnection(null);
    setSelectedTable(null);
    setTableData(null);
    setTables([]);
    setOffset(0);
    setQueryResult(null);
    setQueryError(null);
    setSql('');
  }

  function handleBackToTables() {
    setSelectedTable(null);
    setTableData(null);
    setOffset(0);
  }

  async function handleAddConnection() {
    if (!formName || !formUrl || !formAnonKey) {
      setFormError('Name, project URL, and anon key are required');
      return;
    }
    setAdding(true);
    setFormError(null);
    try {
      const res = await fetch('/api/database/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          projectUrl: formUrl,
          anonKey: formAnonKey,
          serviceRoleKey: formServiceKey || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAddModal(false);
      setFormName('');
      setFormUrl('');
      setFormAnonKey('');
      setFormServiceKey('');
      fetchConnections();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add connection');
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteConnection(id: string) {
    if (!confirm('Delete this connection?')) return;
    try {
      const res = await fetch('/api/database/connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      fetchConnections();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleExecuteQuery() {
    if (!sql.trim() || !selectedConnection) return;
    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      const res = await fetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: selectedConnection.id, sql }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQueryResult(data);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : 'Query execution failed');
    } finally {
      setQueryLoading(false);
    }
  }

  // Breadcrumb
  function renderBreadcrumb() {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <button
          onClick={handleBackToConnections}
          className={`flex items-center gap-1 ${
            activeView === 'connections' ? 'text-white font-medium' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Database size={14} />
          Connections
        </button>
        {selectedConnection && (
          <>
            <ChevronRight size={14} className="text-zinc-600" />
            <button
              onClick={() => { setActiveView('tables'); handleBackToTables(); }}
              className={`${
                activeView === 'tables' && !selectedTable ? 'text-white font-medium' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {selectedConnection.name}
            </button>
          </>
        )}
        {selectedTable && (
          <>
            <ChevronRight size={14} className="text-zinc-600" />
            <span className="text-white font-medium">{selectedTable}</span>
          </>
        )}
      </div>
    );
  }

  // Data table renderer
  function renderDataTable(columns: string[], rows: Record<string, unknown>[]) {
    return (
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-3 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                {columns.map((col) => (
                  <td key={col} className="whitespace-nowrap px-3 py-2 text-xs text-zinc-300">
                    {row[col] === null ? <span className="text-zinc-600 italic">null</span> : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {activeView !== 'connections' && (
            <button
              onClick={handleBackToConnections}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          {renderBreadcrumb()}
        </div>
        <div className="flex gap-2">
          {selectedConnection && (
            <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => { setActiveView('tables'); handleBackToTables(); }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeView === 'tables' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Table size={13} />
                Tables
              </button>
              <button
                onClick={() => setActiveView('query')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeView === 'query' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Play size={13} />
                Query
              </button>
            </div>
          )}
          {activeView === 'connections' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Connection</span>
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Connections View */}
      {activeView === 'connections' && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          {loading ? (
            <div className="space-y-1 p-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : connections.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Database size={32} className="mx-auto mb-3 text-zinc-600" />
              <p className="text-sm text-zinc-400">No connections configured</p>
              <p className="mt-1 text-xs text-zinc-600">Add a Supabase connection to get started</p>
            </div>
          ) : (
            <div>
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center gap-3 border-b border-white/5 px-4 py-3 hover:bg-white/5 transition cursor-pointer"
                  onClick={() => handleSelectConnection(conn)}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Database size={16} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{conn.name}</span>
                      {conn.hasServiceKey && (
                        <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
                          Service Key
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{conn.projectUrl}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteConnection(conn.id); }}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tables View */}
      {activeView === 'tables' && selectedConnection && (
        <>
          {!selectedTable ? (
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              {tablesLoading ? (
                <div className="space-y-1 p-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
                  ))}
                </div>
              ) : tables.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Table size={32} className="mx-auto mb-3 text-zinc-600" />
                  <p className="text-sm text-zinc-400">No tables found</p>
                </div>
              ) : (
                <div>
                  {tables.map((t) => (
                    <div
                      key={`${t.schema}.${t.name}`}
                      onClick={() => handleSelectTable(t.name)}
                      className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5 hover:bg-white/5 transition cursor-pointer"
                    >
                      <Table size={14} className="text-blue-400" />
                      <span className="text-sm text-white">{t.name}</span>
                      <span className="text-xs text-zinc-600">{t.schema}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToTables}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  <ArrowLeft size={12} />
                  Back to tables
                </button>
                <div className="text-xs text-zinc-500">
                  {tableData ? `${tableData.total} rows total` : ''}
                </div>
              </div>

              {tableDataLoading ? (
                <div className="space-y-1">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-8 animate-pulse rounded bg-white/5" />
                  ))}
                </div>
              ) : tableData ? (
                <>
                  {renderDataTable(tableData.columns, tableData.rows)}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      Showing {offset + 1}–{Math.min(offset + limit, tableData.total)} of {tableData.total}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(Math.max(0, offset - limit))}
                        disabled={offset === 0}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-30"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(offset + limit)}
                        disabled={offset + limit >= tableData.total}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </>
      )}

      {/* Query View */}
      {activeView === 'query' && selectedConnection && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">SQL Query</label>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="SELECT * FROM your_table LIMIT 100;"
              rows={6}
              className="w-full resize-none rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 outline-none focus:border-blue-500"
            />
            <div className="flex justify-end">
              <button
                onClick={handleExecuteQuery}
                disabled={queryLoading || !sql.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Play size={14} />
                {queryLoading ? 'Executing...' : 'Execute'}
              </button>
            </div>
          </div>

          {queryError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-mono whitespace-pre-wrap">
              {queryError}
            </div>
          )}

          {queryResult && (
            <div className="space-y-2">
              <div className="text-xs text-zinc-500">
                {queryResult.rowCount} row{queryResult.rowCount !== 1 ? 's' : ''} returned
              </div>
              {renderDataTable(queryResult.columns, queryResult.rows)}
            </div>
          )}
        </div>
      )}

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-blue-400" />
                <h2 className="text-sm font-semibold text-white">Add Connection</h2>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setFormError(null); }}
                className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Connection Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="My Project DB"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Project URL</label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://abcdefgh.supabase.co"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Anon Key</label>
                <input
                  type="password"
                  value={formAnonKey}
                  onChange={(e) => setFormAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Service Role Key <span className="text-zinc-600">(optional)</span>
                </label>
                <input
                  type="password"
                  value={formServiceKey}
                  onChange={(e) => setFormServiceKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
                />
              </div>

              {formError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button
                onClick={() => { setShowAddModal(false); setFormError(null); }}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddConnection}
                disabled={adding || !formName || !formUrl || !formAnonKey}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add Connection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
