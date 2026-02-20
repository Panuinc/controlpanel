import { NextRequest, NextResponse } from 'next/server';
import { writeNginxConfig, generateNginxConfig, NginxError } from '@/lib/nginx-utils';
import type { NginxSiteCreateRequest } from '@/types/nginx';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // If raw content is provided, write directly
    if (body.name && body.content) {
      await writeNginxConfig(body.name, body.content);
      return NextResponse.json({ success: true });
    }

    // Otherwise generate from template
    const { name, domain, type, proxyPort, rootPath } = body as NginxSiteCreateRequest;
    if (!name || !domain || !type) {
      return NextResponse.json({ error: 'Name, domain, and type are required' }, { status: 400 });
    }

    const content = generateNginxConfig({
      domain,
      type,
      port: proxyPort,
      rootPath,
    });

    await writeNginxConfig(name, content);
    return NextResponse.json({ success: true, content });
  } catch (err) {
    if (err instanceof NginxError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to write config' },
      { status: 500 }
    );
  }
}
