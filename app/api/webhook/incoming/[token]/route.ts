import { NextRequest, NextResponse } from 'next/server';
import { getWebhookByToken, verifyGitHubSignature, verifyGitLabToken, extractBranchFromPayload, recordDelivery } from '@/lib/webhook-utils';
import { getProject } from '@/lib/project-utils';
import crypto from 'crypto';
import type { WebhookDelivery } from '@/types/webhook';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const webhook = await getWebhookByToken(token);

  if (!webhook || !webhook.enabled) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  const body = await req.text();
  const source = req.headers.get('x-github-event') ? 'github' : req.headers.get('x-gitlab-event') ? 'gitlab' : 'unknown';

  const delivery: WebhookDelivery = {
    id: crypto.randomUUID(),
    webhookId: webhook.id,
    timestamp: new Date().toISOString(),
    source,
    event: req.headers.get('x-github-event') || req.headers.get('x-gitlab-event') || 'push',
    status: 'success',
    statusCode: 200,
    details: '',
  };

  try {
    // Verify signature
    if (source === 'github') {
      const signature = req.headers.get('x-hub-signature-256');
      if (signature && !verifyGitHubSignature(body, signature, webhook.secret)) {
        delivery.status = 'failure';
        delivery.statusCode = 401;
        delivery.details = 'Invalid signature';
        await recordDelivery(delivery);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else if (source === 'gitlab') {
      const gitlabToken = req.headers.get('x-gitlab-token');
      if (gitlabToken && !verifyGitLabToken(gitlabToken, webhook.secret)) {
        delivery.status = 'failure';
        delivery.statusCode = 401;
        delivery.details = 'Invalid token';
        await recordDelivery(delivery);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    // Check branch
    const parsed = JSON.parse(body);
    const branch = extractBranchFromPayload(parsed);
    if (branch && webhook.branch && branch !== webhook.branch) {
      delivery.status = 'skipped';
      delivery.details = `Branch ${branch} does not match ${webhook.branch}`;
      await recordDelivery(delivery);
      return NextResponse.json({ message: 'Branch skipped' });
    }

    // Trigger deploy
    const project = await getProject(webhook.projectId);
    if (!project) {
      delivery.status = 'failure';
      delivery.details = 'Project not found';
      await recordDelivery(delivery);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Execute git pull and rebuild
    const { gitPull, runBuild, pm2Restart, updateProject } = await import('@/lib/project-utils');
    await gitPull(project.path, project.gitUsername, project.gitToken);
    await runBuild(project);
    try { await pm2Restart(project.pm2Name); } catch { /* may not be running */ }
    await updateProject(project.id, { lastDeployedAt: new Date().toISOString() });

    delivery.details = 'Deploy triggered successfully';
    await recordDelivery(delivery);
    return NextResponse.json({ success: true, message: 'Deploy triggered' });
  } catch (err) {
    delivery.status = 'failure';
    delivery.statusCode = 500;
    delivery.details = err instanceof Error ? err.message : 'Unknown error';
    await recordDelivery(delivery);
    return NextResponse.json({ error: 'Deploy failed' }, { status: 500 });
  }
}
