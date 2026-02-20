import { NextRequest, NextResponse } from 'next/server';
import { systemctl, ValidationError } from '@/lib/exec-utils';

export async function POST(req: NextRequest) {
  try {
    const { name, action } = await req.json();

    if (!name || !action) {
      return NextResponse.json({ error: 'Service name and action required' }, { status: 400 });
    }

    const output = await systemctl(action, name);
    return NextResponse.json({ success: true, output });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed' },
      { status: 500 }
    );
  }
}
