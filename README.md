# Cartridge

**The agent is the operating system. Your application is the cartridge.**

Cartridge (`@cartridge/core`) is an experimental, MIT-licensed framework for agent-native applications. Instead of building another frontend and controller layer, define:

1. **State and invariants** in PostgreSQL.
2. **System calls** as MCP tools backed by database functions.
3. **Operating instructions** in a generated `SKILL.md`.

Claude Code, Codex, Gemini, and web-based assistants can act as the interface when their clients support remote MCP and the configured OAuth flow. Cartridge does not run an LLM, store model credentials, or require a proprietary agent runtime.

> **Status: v0.1 foundation, not a production security certification.** Compiler and PostgreSQL behavior are tested locally. Hosted OAuth, real Stripe delivery, and individual agent-client compatibility still require deployment testing. The package has not been published to npm.

## What is included

- Typed `defineCartridge()` configuration with runtime validation.
- A deterministic compiler for MCP manifests, client configuration, and a complete skill manual.
- A stateless Streamable HTTP MCP Edge Function with tools, resources, and prompts.
- Supabase OAuth consent page and protected-resource discovery.
- Atomic credit debit, audit recording, and Error-as-Prompt envelopes.
- Conflict-checked undo and one-time refunds for registered single-row updates.
- Stripe signature verification and database-level Checkout Session deduplication.
- An example courseware publication domain.

## Repository

```text
src/                              Public config types and compiler
scripts/build-cartridge.ts        Build entry point
 domain/cartridge.config.ts       Example domain tool definitions and SOP
supabase/
  config.toml                     Local Supabase configuration
  migrations/
    000_cartridge_engine.sql      Private wallet, audit, undo, billing engine
    001_domain_app.sql            Example domain schema and intent
  functions/
    mcp/index.ts                  Manifest-driven MCP runtime
    billing-webhook/index.ts      Stripe fulfillment
public/oauth/consent/index.html   Shared sign-in and consent page
tests/                            Compiler and embedded PostgreSQL tests
dist/                             Generated artifacts (gitignored)
```

## Quick start

Requires Node.js 22+, a recent Supabase CLI, and Docker for the full local Supabase stack. The test suite uses PGlite and does not require Docker.

```sh
npm ci
npm run check
```

The build generates:

- `dist/mcp-manifest.json`
- `dist/.mcp.json` (HTTP client configuration; client formats vary)
- `dist/skills/SKILL.md`
- `supabase/functions/mcp/mcp-manifest.json`
- `supabase/functions/mcp/skill.json`
- `public/oauth/consent/config.json` (public settings only)

Set `CARTRIDGE_MCP_URL` before building for a remote deployment. The default is the local Supabase function URL. Environment files are **not** loaded automatically by the Node build script; export variables in your shell or CI.

```sh
export CARTRIDGE_MCP_URL="https://PROJECT_REF.supabase.co/functions/v1/mcp"
export SUPABASE_URL="https://PROJECT_REF.supabase.co"
export SUPABASE_ANON_KEY="YOUR_PUBLIC_ANON_KEY"
npm run build
```

`SUPABASE_ANON_KEY` is intentionally public. Never place the service-role or Stripe secret key in generated browser configuration.

## Write a cartridge

For a new application, replace the example config and domain SQL. Core code stays unchanged for supported use cases.

```ts
import { defineCartridge } from '@cartridge/core';

export const cartridgeConfig = defineCartridge({
  name: 'my-app',
  version: '1.0.0',
  description: 'Manage my application through an agent.',
  sop: ['Read current state before mutations. Follow remediation on failure.'],
  queries: [{
    name: 'list_items', description: 'List your items.',
    table: 'items', orderBy: 'updated_at',
  }],
  intents: [{
    name: 'publish_item', rpcName: 'rpc_publish_item',
    description: 'Publish an item.', creditCostNote: '1 credit.',
    params: { p_id: { type: 'string', description: 'Item ID.' } },
  }],
});
```

Inside this repository the example imports the source module; the package-name import above is the consumer API after packaging. `compileCartridge(config, endpoint)` is exported from `@cartridge/core/compiler` for custom build integrations.

All intent parameters are required. Query `filter_value` is optional: omit it to list all accessible rows; a literal `all` is not a special value. Queries return at most 50 rows. The database, **not the prose cost note**, is authoritative for billing.

Use `001_domain_app.sql` as the SQL template:

1. Create the table, constraints, and owner-aware RLS policies.
2. Grant authenticated clients SELECT only. Grant the restricted `cartridge_executor` role only the mutations needed by the domain.
3. Register the table in `cartridge.undo_targets` (single primary key and ownership column).
4. Lock the target row, validate with `cartridge.assert`, mutate, then call `cartridge.commit_and_charge`.
5. Catch exceptions in the **outer intent block**, obtain stacked diagnostics, and return `cartridge.catch_error`. This exception boundary rolls back all writes and debits from the failed intent.
6. Make the intent a `SECURITY DEFINER` function owned by `cartridge_executor`, with an empty search path and explicit authenticated EXECUTE grant.

Do not use the database/table owner for domain intents: that bypasses RLS. Do not grant engine helper access to clients: that permits forged audit snapshots. The restricted executor is NOLOGIN, does not own domain tables, and does not have BYPASSRLS. Never grant membership in this role to API roles.

### Error-as-Prompt

```json
{
  "ok": false,
  "error_code": "UNVERIFIED_ITEMS_REMAIN",
  "error_message": "Unverified items remain.",
  "remediation": "Move to review or complete verification before publishing."
}
```

Expected domain errors preserve safe remediation. Unexpected database failures return a generic error rather than exposing SQL internals. All MCP domain failures set `isError: true`.

### Undo contract

Undo restores the whole row only if its current JSON snapshot matches the audited after-state. The row and audit are locked; restoration, refund, and the reverted marker occur in one transaction. The refund is the **actual debit**, including zero for unlimited plans, regardless of later plan changes.

v0.1 supports **single-row UPDATE only**, not arbitrary inserts, deletes, multi-row workflows, external side effects, or compensating transactions. Tables with generated/identity columns, triggers, cross-row invariants, or schema changes need domain-specific review before registration. Exact snapshot matching is not a general revision history: if an external writer recreates the exact after-state, it cannot detect that intervening change. Keep all writers controlled and use a monotonic revision field for stronger semantics.

Intent calls are not idempotent. Do not blindly retry after an ambiguous network failure. Read state first. The example rejects transitions to the current status to avoid immediately charging twice for the same transition.

## OAuth and hosting

OAuth is infrastructure, not something a config compiler can provision automatically.

1. Enable the Supabase OAuth server for your hosted project. `config.toml` configures **local** Supabase; it does not configure the hosted dashboard.
2. Host `public/` on your application's HTTPS origin. Supabase Edge Functions do not automatically serve these static files. Set the Supabase Auth Site URL to this origin, and the consent path to `/oauth/consent/`.
3. Register OAuth clients and their exact redirect URIs. Require authorization-code flow with PKCE in your clients. Dynamic registration is disabled by default; clients that require it need an explicit operator policy.
4. Configure `CARTRIDGE_OAUTH_CLIENT_IDS` as an allowlist of registered client IDs, and `CARTRIDGE_TOKEN_AUDIENCE` to the expected issued audience (commonly `authenticated` for Supabase).
5. Set `CARTRIDGE_ALLOWED_ORIGINS` to the comma-separated browser origins you trust. Non-browser clients without Origin are allowed. No wildcard CORS is enabled.
6. Verify the provider's discovery, issuer, audience, `client_id`, and redirect behavior in your environment before connecting real accounts.

The runtime validates the user and signed claims, including issuer, audience, role, and OAuth client ID. Ordinary login JWTs without an allowed OAuth `client_id` are rejected. A shared Supabase audience is not a dedicated per-resource audience; dedicate OAuth clients to this resource and use a dedicated audience if your provider supports it. Fine-grained per-tool OAuth scope enforcement is not included in v0.1; accepted clients receive the authenticated user's configured domain access.

The 401 challenge advertises an actually routed metadata endpoint:

```text
https://PROJECT_REF.supabase.co/functions/v1/mcp/.well-known/oauth-protected-resource
```

If a client insists on root/path-based well-known discovery rather than the advertised challenge URL, add a reverse-proxy route. The included consent page supports existing email/password accounts. User signup, password reset, and alternative identity providers are operator concerns. It never auto-approves a new consent request. For production, bundle the browser dependency yourself and configure CSP/security headers at the static host.

## Billing setup

Configure the following **server-only** secrets for the webhook:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_CREDITS`, for example `{"price_example":100}`

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to hosted functions. The MCP function never uses the service-role key.

Create a one-time Stripe Payment Link for an allowlisted price. Set its base URL through an operator migration:

```sql
UPDATE cartridge.settings
SET checkout_base_url = 'https://buy.stripe.com/YOUR_PAYMENT_LINK'
WHERE singleton;
```

Use a URL without a fragment or an existing `client_reference_id`. The status RPC appends the user's ID. A missing checkout URL returns null with instructions to contact the operator; Cartridge does not invent a payment link.

Register `checkout.session.completed` and `checkout.session.async_payment_succeeded` for the webhook URL. Only paid, one-time sessions are fulfilled. Credits come from operator-owned Stripe price mappings, never from metadata supplied by a client. The session ID is unique in the database, so event retries and alternate success events cannot double-credit a purchase. An invalid mapping/database failure returns 500 for delivery retry.

The account reference design allows a payer to buy credits for another known account ID. If that is undesirable, replace Payment Links with a trusted Checkout Session creation flow. Subscription lifecycle, refunds, disputes, tax/accounting, and automatic credit clawback are not implemented.

## Deploy

After completing the configuration above:

```sh
npm run build
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy mcp --no-verify-jwt
supabase functions deploy billing-webhook --no-verify-jwt
```

Disabling gateway JWT checks is intentional: MCP verifies OAuth tokens and produces discovery challenges itself; the billing endpoint verifies Stripe signatures. Upload function secrets using your normal secure Supabase workflow. Host the generated consent assets separately, then connect a compatible MCP client to `CARTRIDGE_MCP_URL`.

Install `dist/skills/SKILL.md` using your agent's skill mechanism, or retrieve the identical manual through `skill://manual` or `load_skill_sop`. Do not assume every agent automatically loads resources or prompts.

## Development and verification

```sh
npm run check
npx deno check --config supabase/functions/deno.json \
  supabase/functions/mcp/index.ts supabase/functions/billing-webhook/index.ts
npm audit
```

The PostgreSQL test exercises migrations, row isolation, direct-write denial, protected engine helpers, failed-payment rollback, publication, undo, repeat-undo rejection, unlimited-plan billing, stale undo conflicts, and webhook grant deduplication. PGlite is useful PostgreSQL execution coverage, but it does not substitute for concurrent-session tests against a real Supabase deployment.

Before production, add real-provider OAuth/MCP integration tests, Stripe test-mode delivery tests, concurrent wallet/undo tests, rate limiting, monitoring, backups, and an independent security review. The core is reusable, **not immutable**: apply future security updates and migrations.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). See [SECURITY.md](SECURITY.md) for security boundaries and reporting guidance.

## License

[MIT](LICENSE).
