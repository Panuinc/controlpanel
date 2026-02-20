import { createServer } from 'http';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'cookie';
import { jwtVerify } from 'jose';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';

async function verifyAuth(cookieHeader: string | undefined): Promise<boolean> {
  if (!cookieHeader) return false;
  try {
    const cookies = parse(cookieHeader);
    const token = cookies['auth-token'];
    if (!token) return false;
    const secret = new TextEncoder().encode(JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    const url = req.url || '';

    if (!url.startsWith('/api/ws/terminal')) {
      socket.destroy();
      return;
    }

    const authenticated = await verifyAuth(req.headers.cookie);
    if (!authenticated) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wss.on('connection', async (ws: WebSocket) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pty: any = null;

    try {
      // Dynamic import node-pty (native module, only works on Linux/macOS)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodePty = require('node-pty') as typeof import('node-pty');
      pty = nodePty.spawn('bash', [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME || '/',
        env: process.env as Record<string, string>,
      });

      pty.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      pty.onExit(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });

      ws.on('message', (raw: Buffer | ArrayBuffer | Buffer[]) => {
        const msg = raw.toString();

        // Try to parse as control message
        if (msg.startsWith('{')) {
          try {
            const ctrl = JSON.parse(msg);
            if (ctrl.type === 'resize' && typeof ctrl.cols === 'number' && typeof ctrl.rows === 'number') {
              pty?.resize(Math.min(Math.max(ctrl.cols, 1), 500), Math.min(Math.max(ctrl.rows, 1), 200));
              return;
            }
          } catch {
            // Not valid JSON, treat as raw input
          }
        }

        pty?.write(msg);
      });

      ws.on('close', () => {
        pty?.kill();
        pty = null;
      });

      // Idle timeout: 30 minutes
      let idleTimer = setTimeout(() => {
        ws.close();
      }, 30 * 60 * 1000);

      ws.on('message', () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          ws.close();
        }, 30 * 60 * 1000);
      });
    } catch (err) {
      console.error('Failed to spawn PTY:', err);
      ws.send('\r\nError: Failed to start terminal. node-pty may not be installed.\r\n');
      ws.send('Run: apt install -y build-essential python3 && npm rebuild node-pty\r\n');
      ws.close();
    }
  });

  server.listen(port, () => {
    console.log(`> Control Panel ready on http://localhost:${port}`);
    console.log(`> Environment: ${dev ? 'development' : 'production'}`);
  });
});
