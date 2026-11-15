import { Polar } from '@polar-sh/sdk';
import { appendFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { deploymentConfig } from './deployment.js';

async function main() {
  const config = deploymentConfig(process.env);
  const secret = (name: string) => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing ${name}`);
    return value;
  };
  const accessToken = secret('POLAR_ACCESS_TOKEN');
  const runtimeToken = secret('POLAR_RUNTIME_ACCESS_TOKEN');
  secret('SUPABASE_ACCESS_TOKEN');
  secret('SUPABASE_DB_PASSWORD');
  secret('SUPABASE_ANON_KEY');
  const polar = new Polar({ accessToken, server: config.server });
  // Validate all products before changing infrastructure. Never create prices implicitly.
  for (const id of Object.keys(config.products)) {
    const product = await polar.products.get({ id });
    if (product.organizationId !== config.organizationId || product.isArchived) throw new Error('Product is archived or belongs to another organization');
  }
  const webhookUrl = `${config.supabaseUrl}/functions/v1/billing-webhook`;
  const matches = [];
  for await (const page of await polar.webhooks.listWebhookEndpoints({ organizationId: config.organizationId, limit: 100 })) {
    matches.push(...page.result.items.filter(endpoint => endpoint.url === webhookUrl));
  }
  if (matches.length > 1) throw new Error('Multiple Polar webhooks match this deployment; resolve duplicates manually');
  const events = ['order.paid', 'subscription.created', 'subscription.updated', 'subscription.active',
    'subscription.canceled', 'subscription.uncanceled', 'subscription.revoked'] as const;
  const plan = process.argv.includes('--plan');
  console.log(`${plan ? 'Plan' : 'Deploy'}: ${config.projectRef}, Polar ${config.server}, ${Object.keys(config.products).length} products`);
  console.log(`Polar webhook: ${matches.length ? 'update existing endpoint' : 'create endpoint'} at ${webhookUrl}`);
  function run(command: string, args: string[], extra: NodeJS.ProcessEnv = {}) {
    const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ...extra } });
    if (result.error || result.status !== 0) throw new Error(`${command} failed`);
  }
  const buildEnv = { CARTRIDGE_MCP_URL: config.endpoint, SUPABASE_URL: config.supabaseUrl };
  run('npm', ['run', 'build'], buildEnv);
  // Link only writes local CLI configuration. A plan does not mutate remote state.
  run('supabase', ['link', '--project-ref', config.projectRef]);
  run('supabase', ['db', 'push', '--dry-run']);
  if (plan) return;
  run('supabase', ['db', 'push', '--yes']);
  const endpoint = matches[0] ?? await polar.webhooks.createWebhookEndpoint({
    url: webhookUrl, format: 'raw', events: [...events], organizationId: config.organizationId,
  });
  // Never rotate existing signing secrets on routine deploys.
  if (process.env.GITHUB_ACTIONS === 'true') {
    const masked = endpoint.secret.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.log(`::add-mask::${masked}`);
  }
  const directory = await mkdtemp(join(tmpdir(), 'cartridge-deploy-'));
  try {
    const values = {
      CARTRIDGE_MCP_URL: config.endpoint,
      CARTRIDGE_TOKEN_AUDIENCE: config.audience,
      CARTRIDGE_OAUTH_CLIENT_IDS: config.clientIds,
      CARTRIDGE_ALLOWED_ORIGINS: config.origins,
      POLAR_ACCESS_TOKEN: runtimeToken,
      POLAR_SERVER: config.server,
      POLAR_PRODUCT_CREDITS: JSON.stringify(config.products),
      POLAR_WEBHOOK_SECRET: endpoint.secret,
    };
    const lines = Object.entries(values).map(([key, value]) => {
      if (/[\r\n]/.test(value)) throw new Error(`Multiline value is not supported: ${key}`);
      return `${key}=${JSON.stringify(value)}`;
    });
    const path = join(directory, 'secrets.env');
    await writeFile(path, lines.join('\n') + '\n', { mode: 0o600 });
    run('supabase', ['secrets', 'set', '--project-ref', config.projectRef, '--env-file', path]);
    run('supabase', ['functions', 'deploy', 'billing-webhook', '--project-ref', config.projectRef, '--no-verify-jwt']);
    run('supabase', ['functions', 'deploy', 'mcp', '--project-ref', config.projectRef, '--no-verify-jwt']);
    await polar.webhooks.updateWebhookEndpoint({ id: endpoint.id, webhookEndpointUpdate: {
      url: webhookUrl, format: 'raw', events: [...events], enabled: true,
    } });
  } finally { await rm(directory, { recursive: true, force: true }); }
  const metadata = await fetch(`${config.endpoint}/.well-known/oauth-protected-resource`);
  if (!metadata.ok || (await metadata.json()).resource !== config.endpoint) throw new Error('MCP discovery smoke test failed');
  const challenge = await fetch(config.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (challenge.status !== 401 || !challenge.headers.get('www-authenticate')?.includes('resource_metadata=')) throw new Error('MCP auth challenge smoke test failed');
  const verified = await polar.webhooks.getWebhookEndpoint({ id: endpoint.id });
  if (!verified.enabled || verified.url !== webhookUrl || events.some(event => !verified.events.includes(event))) throw new Error('Polar webhook verification failed');
  console.log('Deployment and unauthenticated smoke tests passed. Paid checkout/OAuth require integration testing.');
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## Cartridge deployment\n- Environment: ${process.env.DEPLOY_ENVIRONMENT}\n- MCP: ${config.endpoint}\n- Polar: ${config.server}\n- Webhook: ${endpoint.id}\n- Host the consent-site artifact at ${config.site}/oauth/consent/\n`);
}
// SDK errors may include request headers or response bodies; do not dump them into CI logs.
main().catch(() => { console.error('Deployment failed. Check configuration and provider dashboards; secrets and SDK error bodies are intentionally omitted.'); process.exitCode = 1; });
