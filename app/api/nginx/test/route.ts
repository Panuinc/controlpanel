import { NextResponse } from 'next/server';
import { testNginxConfig } from '@/lib/nginx-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await testNginxConfig();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ valid: false, output: 'Failed to test config' }, { status: 500 });
  }
}
