import { parseProducts } from '../supabase/functions/_shared/polar.js';
import { parseOAuthClientIds } from '../supabase/functions/_shared/oauth.js';

export function deploymentConfig(env: NodeJS.ProcessEnv) {
  const required = (name: string) => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Missing ${name}`);
    return value;
  };
  const projectRef = required('SUPABASE_PROJECT_REF');
  if (!/^[a-z0-9]{20}$/.test(projectRef)) throw new Error('Invalid Supabase project reference');
  const site = new URL(required('CARTRIDGE_SITE_URL'));
  if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash || site.pathname !== '/') {
    throw new Error('CARTRIDGE_SITE_URL must be an HTTPS origin');
  }
  const server = required('POLAR_SERVER');
  if (server !== 'sandbox' && server !== 'production') throw new Error('Invalid POLAR_SERVER');
  const environment = required('DEPLOY_ENVIRONMENT');
  if (!['staging', 'production'].includes(environment)) throw new Error('Invalid deployment environment');
  if ((environment === 'production') !== (server === 'production')) throw new Error('Environment and Polar server must match');
  const products = parseProducts(required('POLAR_PRODUCT_CREDITS'));
  // Empty means any OAuth client from the verified project issuer; not anonymous access.
  const clientIds = parseOAuthClientIds(env.CARTRIDGE_OAUTH_CLIENT_IDS).join(',');
  const audience = required('CARTRIDGE_TOKEN_AUDIENCE');
  const origins = required('CARTRIDGE_ALLOWED_ORIGINS');
  for (const origin of origins.split(',')) {
    if (new URL(origin).origin !== origin || !origin.startsWith('https://')) throw new Error('Allowed origins must be exact HTTPS origins');
  }
  return { projectRef, site: site.origin, server: server as 'sandbox' | 'production', products, clientIds, audience, origins,
    supabaseUrl: `https://${projectRef}.supabase.co`,
    endpoint: `https://${projectRef}.supabase.co/functions/v1/mcp`,
    organizationId: required('POLAR_ORGANIZATION_ID'),
  };
}
