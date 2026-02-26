import { execFile } from 'child_process';
import type { SSLCertificate } from '@/types/ssl';

export class SSLError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SSLError';
  }
}

function execPromise(cmd: string, args: string[], timeout = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout + stderr);
    });
  });
}

export async function listCertificates(): Promise<SSLCertificate[]> {
  try {
    const output = await execPromise('certbot', ['certificates']);
    const certs: SSLCertificate[] = [];
    const blocks = output.split('Certificate Name:');

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const name = block.split('\n')[0].trim();

      const domainsMatch = block.match(/Domains:\s*(.+)/);
      const domains = domainsMatch ? domainsMatch[1].trim().split(/\s+/) : [];

      const expiryMatch = block.match(/Expiry Date:\s*(\d{4}-\d{2}-\d{2})/);
      const expiryDate = expiryMatch ? expiryMatch[1] : '';

      const certPathMatch = block.match(/Certificate Path:\s*(.+)/);
      const certPath = certPathMatch ? certPathMatch[1].trim() : '';

      const keyPathMatch = block.match(/Private Key Path:\s*(.+)/);
      const keyPath = keyPathMatch ? keyPathMatch[1].trim() : '';

      const now = new Date();
      const expiry = new Date(expiryDate);
      const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let status: SSLCertificate['status'] = 'valid';
      if (daysUntilExpiry <= 0) status = 'expired';
      else if (daysUntilExpiry <= 30) status = 'expiring';

      certs.push({
        name,
        domains,
        expiryDate,
        daysUntilExpiry,
        status,
        certificatePath: certPath,
        privateKeyPath: keyPath,
      });
    }

    return certs;
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      throw new SSLError('Certbot is not installed on this system.');
    }
    throw err;
  }
}

export async function requestCertificate(domain: string, email: string): Promise<string> {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*(\.[a-zA-Z0-9\-]+)+$/;
  if (!domainRegex.test(domain)) {
    throw new SSLError('Invalid domain name.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new SSLError('Invalid email address.');
  }

  return execPromise('certbot', [
    '--nginx',
    '-d', domain,
    '--non-interactive',
    '--agree-tos',
    '--email', email,
  ], 120000);
}

export async function renewCertificate(name?: string): Promise<string> {
  const args = ['renew', '--non-interactive'];
  if (name) {
    args.push('--cert-name', name);
  }
  return execPromise('certbot', args, 120000);
}
