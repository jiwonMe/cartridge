import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deploymentConfig } from '../scripts/deployment.js';

const valid = {
  SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst', CARTRIDGE_SITE_URL: 'https://app.example.com',
  POLAR_SERVER: 'sandbox', DEPLOY_ENVIRONMENT: 'staging', POLAR_PRODUCT_CREDITS: '{"product":100}',
  CARTRIDGE_OAUTH_CLIENT_IDS: 'client-id', CARTRIDGE_TOKEN_AUDIENCE: 'authenticated',
  CARTRIDGE_ALLOWED_ORIGINS: 'https://app.example.com', POLAR_ORGANIZATION_ID: 'organization',
};
test('deployment derives endpoints from a validated project reference', () => {
  const config = deploymentConfig(valid);
  assert.equal(config.endpoint, 'https://abcdefghijklmnopqrst.supabase.co/functions/v1/mcp');
  assert.equal(config.server, 'sandbox');
});
test('deployment fails closed on missing settings and unsafe environment combinations', () => {
  for (const key of Object.keys(valid)) assert.throws(() => deploymentConfig({ ...valid, [key]: '' }));
  for (const patch of [
    { POLAR_SERVER: 'production' }, { DEPLOY_ENVIRONMENT: 'production' },
    { CARTRIDGE_SITE_URL: 'http://app.example.com' }, { CARTRIDGE_SITE_URL: 'https://app.example.com/path' },
    { SUPABASE_PROJECT_REF: '../bad' }, { CARTRIDGE_ALLOWED_ORIGINS: '*' },
    { POLAR_PRODUCT_CREDITS: '{"product":0}' },
  ]) assert.throws(() => deploymentConfig({ ...valid, ...patch }));
});
