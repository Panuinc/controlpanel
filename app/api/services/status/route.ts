import { NextRequest, NextResponse } from 'next/server';
import { systemctlShow, ValidationError } from '@/lib/exec-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  if (!name) {
    return NextResponse.json({ error: 'Service name required' }, { status: 400 });
  }

  try {
    const props = await systemctlShow(name);
    return NextResponse.json({
      name,
      description: props['Description'] || '',
      loadState: props['LoadState'] || '',
      activeState: props['ActiveState'] || '',
      subState: props['SubState'] || '',
      enabled: props['UnitFileState'] === 'enabled',
      mainPID: props['MainPID'] || '0',
      memory: props['MemoryCurrent'] || '0',
      startedAt: props['ActiveEnterTimestamp'] || '',
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to get service status' }, { status: 500 });
  }
}
