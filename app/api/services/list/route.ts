import { NextRequest, NextResponse } from 'next/server';
import { listServices } from '@/lib/exec-utils';
import type { ServiceInfo } from '@/types/services';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const filter = req.nextUrl.searchParams.get('filter');
    const output = await listServices();
    const services: ServiceInfo[] = [];

    for (const line of output.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Format: UNIT LOAD ACTIVE SUB DESCRIPTION...
      const parts = trimmed.split(/\s+/);
      if (parts.length < 5) continue;

      const name = parts[0].replace('.service', '');
      const loadState = parts[1];
      const activeState = parts[2];
      const subState = parts[3];
      const description = parts.slice(4).join(' ');

      if (filter === 'running' && subState !== 'running') continue;
      if (filter === 'failed' && activeState !== 'failed') continue;

      services.push({ name, loadState, activeState, subState, description });
    }

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Failed to list services:', error);
    return NextResponse.json({ error: 'Failed to list services' }, { status: 500 });
  }
}
