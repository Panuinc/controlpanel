'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, QrCode, X } from 'lucide-react';

interface SetupData {
  qrCode: string;
  recoveryCodes: string[];
}

export default function TwoFactorSetup() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disabling, setDisabling] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnabled(data.user?.twoFactorEnabled ?? false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check 2FA status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleEnable() {
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSetup({ qrCode: data.qrCode, recoveryCodes: data.recoveryCodes });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start 2FA setup');
    }
  }

  async function handleVerify() {
    if (!verifyCode || verifyCode.length < 6) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnabled(true);
      setSetup(null);
      setVerifyCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }

  async function handleDisable() {
    if (!disablePassword) return;
    setDisabling(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnabled(false);
      setShowDisable(false);
      setDisablePassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setDisabling(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="space-y-3">
          <div className="h-5 w-48 animate-pulse rounded bg-white/5" />
          <div className="h-4 w-72 animate-pulse rounded bg-white/5" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          {enabled ? (
            <ShieldCheck size={20} className="text-emerald-400" />
          ) : (
            <Shield size={20} className="text-zinc-400" />
          )}
          <div>
            <h3 className="text-sm font-semibold text-white">Two-Factor Authentication</h3>
            <p className="text-xs text-zinc-400">
              {enabled ? 'Your account is protected with 2FA.' : 'Add an extra layer of security to your account.'}
            </p>
          </div>
          {enabled && (
            <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
              Enabled
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Not enabled, no setup started */}
        {!enabled && !setup && (
          <button
            onClick={handleEnable}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            <QrCode size={16} />
            Enable 2FA
          </button>
        )}

        {/* Setup in progress: show QR + recovery + verify */}
        {!enabled && setup && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-start">
              <div className="shrink-0 rounded-lg border border-white/10 bg-white p-2">
                <img src={setup.qrCode} alt="2FA QR Code" width={180} height={180} />
              </div>
              <div className="space-y-3 text-center sm:text-left">
                <p className="text-sm text-zinc-300">
                  Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) then enter the verification code below.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    maxLength={6}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-center text-sm tracking-widest text-white placeholder-zinc-500 outline-none focus:border-blue-500 sm:w-40"
                  />
                  <button
                    onClick={handleVerify}
                    disabled={verifying || verifyCode.length < 6}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {verifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>

            {/* Recovery Codes */}
            <div>
              <h4 className="mb-2 text-xs font-medium text-zinc-400">Recovery Codes</h4>
              <p className="mb-3 text-xs text-zinc-500">
                Save these codes somewhere safe. Each code can be used once to access your account if you lose your authenticator.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {setup.recoveryCodes.map((code, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-center font-mono text-xs text-zinc-300"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSetup(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel setup
            </button>
          </div>
        )}

        {/* Enabled: show disable option */}
        {enabled && !showDisable && (
          <button
            onClick={() => setShowDisable(true)}
            className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
          >
            Disable 2FA
          </button>
        )}
      </div>

      {/* Disable 2FA Modal */}
      {showDisable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="text-sm font-semibold text-white">Disable 2FA</h3>
              <button
                onClick={() => { setShowDisable(false); setDisablePassword(''); }}
                className="rounded-md p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-xs text-zinc-400">
                Enter your password to confirm disabling two-factor authentication.
              </p>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Your password"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button
                onClick={() => { setShowDisable(false); setDisablePassword(''); }}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable}
                disabled={disabling || !disablePassword}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {disabling ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
