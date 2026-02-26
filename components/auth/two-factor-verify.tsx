'use client';

import { useState } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

interface Props {
  tempToken: string;
  username: string;
  password: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function TwoFactorVerify({ tempToken, username, password, onSuccess, onBack }: Props) {
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const totpCode = useRecovery ? recoveryCode.trim() : code.trim();
    if (!totpCode) {
      setError(useRecovery ? 'Recovery code is required' : 'Enter your 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          totpCode,
          tempToken,
          isRecoveryCode: useRecovery,
        }),
      });
      const data = await res.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-lg font-semibold text-white">Two-Factor Authentication</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {useRecovery
            ? 'Enter one of your recovery codes'
            : 'Enter the 6-digit code from your authenticator app'}
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!useRecovery ? (
          <div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-white placeholder-zinc-600 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="xxxx-xxxx-xxxx"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center font-mono text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (!useRecovery && code.length < 6)}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>

        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-zinc-400 hover:text-white"
          >
            <ArrowLeft size={12} />
            Back
          </button>
          <button
            type="button"
            onClick={() => { setUseRecovery(!useRecovery); setError(null); }}
            className="text-zinc-400 hover:text-white"
          >
            {useRecovery ? 'Use authenticator code' : 'Use recovery code'}
          </button>
        </div>
      </form>
    </div>
  );
}
