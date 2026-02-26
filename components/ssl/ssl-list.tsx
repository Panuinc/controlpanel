'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock, Plus, RefreshCw, AlertTriangle, X } from 'lucide-react';

interface Certificate {
  name: string;
  domains: string[];
  expiry: string;
  daysUntilExpiry: number;
}

function getStatusColor(days: number) {
  if (days < 0) return { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Expired' };
  if (days <= 7) return { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Critical' };
  if (days <= 30) return { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Expiring' };
  return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Valid' };
}

export default function SSLList() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [renewingAll, setRenewingAll] = useState(false);
  const [renewingName, setRenewingName] = useState<string | null>(null);

  const fetchCertificates = useCallback(async () => {
    try {
      const res = await fetch('/api/ssl/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCertificates(data.certificates ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  async function handleRenew(name: string) {
    setRenewingName(name);
    try {
      const res = await fetch('/api/ssl/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setTimeout(fetchCertificates, 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Renew failed');
    } finally {
      setRenewingName(null);
    }
  }

  async function handleRenewAll() {
    setRenewingAll(true);
    try {
      const res = await fetch('/api/ssl/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setTimeout(fetchCertificates, 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Renew all failed');
    } finally {
      setRenewingAll(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Lock size={20} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-white">SSL Certificates</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCertificates}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleRenewAll}
            disabled={renewingAll || certificates.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={renewingAll ? 'animate-spin' : ''} />
            Renew All
          </button>
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Request Certificate</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 py-16">
          <Lock size={32} className="mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-500">No SSL certificates found</p>
          <button
            onClick={() => setShowRequestModal(true)}
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Request your first certificate
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {certificates.map((cert) => {
            const status = getStatusColor(cert.daysUntilExpiry);
            return (
              <div
                key={cert.name}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Lock size={14} className="text-zinc-400" />
                      <h3 className="text-sm font-medium text-white">{cert.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {cert.domains.map((domain) => (
                        <span
                          key={domain}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-zinc-300"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                      <span>Expires: {new Date(cert.expiry).toLocaleDateString()}</span>
                      <span
                        className={cert.daysUntilExpiry <= 7 ? 'text-red-400' : cert.daysUntilExpiry <= 30 ? 'text-amber-400' : ''}
                      >
                        {cert.daysUntilExpiry < 0
                          ? `Expired ${Math.abs(cert.daysUntilExpiry)} days ago`
                          : `${cert.daysUntilExpiry} days remaining`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRenew(cert.name)}
                    disabled={renewingName === cert.name}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={renewingName === cert.name ? 'animate-spin' : ''} />
                    {renewingName === cert.name ? 'Renewing...' : 'Renew'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs text-zinc-500">
        {certificates.length} certificate{certificates.length !== 1 ? 's' : ''}
        {certificates.filter((c) => c.daysUntilExpiry <= 30 && c.daysUntilExpiry >= 0).length > 0 && (
          <span className="ml-2 text-amber-400">
            <AlertTriangle size={11} className="mr-0.5 inline" />
            {certificates.filter((c) => c.daysUntilExpiry <= 30 && c.daysUntilExpiry >= 0).length} expiring soon
          </span>
        )}
      </div>

      {showRequestModal && (
        <RequestCertModal
          onClose={() => setShowRequestModal(false)}
          onCreated={() => {
            setShowRequestModal(false);
            fetchCertificates();
          }}
        />
      )}
    </div>
  );
}

function RequestCertModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [domain, setDomain] = useState('');
  const [email, setEmail] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!domain || !email) {
      setError('Domain and email are required');
      return;
    }
    setRequesting(true);
    setError(null);
    try {
      const res = await fetch('/api/ssl/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request certificate');
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Request SSL Certificate</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={requesting || !domain || !email}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {requesting ? 'Requesting...' : 'Request Certificate'}
          </button>
        </div>
      </div>
    </div>
  );
}
