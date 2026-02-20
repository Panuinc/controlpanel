'use client';

import { useEffect, useRef, useState } from 'react';
import '@xterm/xterm/css/xterm.css';

export default function TerminalView() {
  const termRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  useEffect(() => {
    let ws: WebSocket | null = null;
    let term: import('@xterm/xterm').Terminal | null = null;
    let fitAddon: import('@xterm/addon-fit').FitAddon | null = null;
    let resizeObserver: ResizeObserver | null = null;

    async function init() {
      if (!termRef.current) return;

      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      const { WebLinksAddon } = await import('@xterm/addon-web-links');

      term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'var(--font-geist-mono), "Fira Code", "JetBrains Mono", monospace',
        theme: {
          background: '#0a0a0a',
          foreground: '#ededed',
          cursor: '#ededed',
          selectionBackground: '#3b82f680',
          black: '#0a0a0a',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#f59e0b',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#ededed',
          brightBlack: '#52525b',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#fbbf24',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#ffffff',
        },
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());
      term.open(termRef.current);

      // Wait a tick for DOM to settle
      requestAnimationFrame(() => {
        fitAddon?.fit();
      });

      // Connect WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/terminal`);

      ws.onopen = () => {
        setStatus('connected');
        // Send initial size
        if (term && ws) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      };

      ws.onmessage = (event) => {
        term?.write(event.data);
      };

      ws.onclose = () => {
        setStatus('disconnected');
        term?.write('\r\n\x1b[31mConnection closed.\x1b[0m\r\n');
      };

      ws.onerror = () => {
        setStatus('error');
      };

      // Send keystrokes to server
      term.onData((data: string) => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // Handle resize
      resizeObserver = new ResizeObserver(() => {
        fitAddon?.fit();
        if (term && ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      });
      resizeObserver.observe(termRef.current);
    }

    init();

    return () => {
      resizeObserver?.disconnect();
      ws?.close();
      term?.dispose();
    };
  }, []);

  function handleReconnect() {
    setStatus('connecting');
    window.location.reload();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${
            status === 'connected' ? 'bg-emerald-500' :
            status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-red-500'
          }`} />
          <span className="text-xs text-zinc-500">
            {status === 'connected' && 'Connected'}
            {status === 'connecting' && 'Connecting...'}
            {status === 'disconnected' && 'Disconnected'}
            {status === 'error' && 'Connection error'}
          </span>
        </div>
        {(status === 'disconnected' || status === 'error') && (
          <button
            onClick={handleReconnect}
            className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
          >
            Reconnect
          </button>
        )}
      </div>
      <div
        ref={termRef}
        className="flex-1 rounded-xl border border-white/10 overflow-hidden"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}
