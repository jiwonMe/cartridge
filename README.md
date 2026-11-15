# Cartridge

**The agent is the operating system. Your application is the cartridge.**

## Build your product with an agent

Click [**Use this template**](https://github.com/new?template_name=cartridge&template_owner=jiwonMe), clone your new repository, and open it in your coding agent. Replace the bracketed fields below, then copy and paste the prompt. No npm publication of `@cartridge/core` is required to work from the template.

```text
Build an agent-native product using the Cartridge framework:
https://github.com/jiwonMe/cartridge

If I have not already provided a product repository, use that GitHub repository
as a template to create a separate repository for this product, then clone it
and work there. Ask for the destination owner/name and visibility if unknown.
Do not modify or push product-specific changes to the upstream Cartridge repo.
If I have already provided a template-derived repository, work in that checkout.

Product brief:
- Name: [product name]
- Target users: [who uses it]
- Problem and outcome: [what users need to accomplish]
- Example requests users will give their agent:
  1. [a read or search request]
  2. [a state-changing request]
  3. [a request to undo a supported change]
- Domain entities: [entities, relationships, and ownership rules]
- Invariants: [what must never happen, and valid state transitions]
- Billing: [which actions cost credits, how many, and free actions]
- Initial scope: [must-have features and explicit non-goals]

First read README.md, docs/TEMPLATE.md, SECURITY.md, the example domain,
and the tests. Inspect the repository and migration history before editing.
Ask only blocking product questions; otherwise state reasonable assumptions
and implement a small, end-to-end version rather than stopping at a plan.

Connection setup:
- Before remote operations, inspect the MCP servers/connectors already available
  in this agent. Reuse authorized connections and identify missing capabilities.
- GitHub: connect an official/trusted GitHub MCP server or connector for the
  destination repository, Actions, and Environment setup. Verify the account
  and repository scope with a read-only request before making changes.
- Supabase: connect an official/trusted Supabase MCP server or connector scoped
  to this product's staging project. Start with read-only access for inspection;
  request write access only for an explicitly approved operation. Never select
  a production project merely because it is the default connection.
- Polar: use an official/trusted connector if one is available and supports the
  required operations. Otherwise use the documented SDK/API and CI workflow;
  do not invent a Polar MCP endpoint or install an unverified integration.
  Confirm the organization and sandbox environment before accessing billing.
- Vercel: connect the official Vercel MCP server or connector to deploy the
  static OAuth consent page. Verify the authenticated account, team, and target
  project with a read-only request. If no project exists, ask before creating
  one; do not select an unrelated project or upgrade a paid plan automatically.
  Use the documented Vercel CLI/API or dashboard if the connector cannot perform
  the required deployment operation, and explain that limitation explicitly.
- After an approved environment-specific build, deploy the contents of public/
  (including oauth/consent/index.html and generated config.json) as the Vercel
  site's root. Do not publish the repository root, server credentials, or .env
  files. The browser config may contain only the Supabase URL and public key.
  For Git-based deployments, configure the build and public output directory
  explicitly; generated config.json is gitignored and must be built with the
  target environment's settings, not assumed to exist in the checkout.
- Use a stable HTTPS Vercel production URL or approved custom domain for each
  environment's consent site. Set CARTRIDGE_SITE_URL and the Supabase Auth Site
  URL to that origin, and the consent path to /oauth/consent/. Keep staging and
  production settings separate. Verify the deployed consent HTML and config
  routes, then test the OAuth redirect flow with approval. A preview deployment
  alone is not proof that the configured production consent URL works.
- Connect other services only when required by the product brief.
- For a missing connection, explain its purpose and minimum permissions, then
  guide me through the agent platform's connection/OAuth approval flow. Never
  request tokens in chat or commit them. Use a secure secret-entry mechanism
  or direct me to the provider/GitHub Environment secret settings instead.
- If this agent cannot use a required connector, state the limitation and offer
  a supported CLI/API or manual setup path. Continue local implementation where
  possible. Report each connection as verified, missing, or awaiting approval;
  do not claim it works without a successful read-only check. Agent connections
  do not automatically provision the separate credentials required by CI.
- After an approved staging deployment, help me register the product's own
  remote MCP endpoint from dist/.mcp.json in my target agent, complete OAuth,
  and verify tool discovery plus a read-only call. Load skill://manual or
  load_skill_sop if supported, otherwise install dist/skills/SKILL.md using
  that agent's supported mechanism. Do not test paid mutations without consent.

Implementation requirements:
1. Use PostgreSQL for state and invariants, MCP for tools, and generated
   SKILL.md instructions for agent behavior. Do not add an application
   frontend or a separate controller backend unless the brief requires it.
2. Replace domain/cartridge.config.ts and implement the domain SQL.
   For a fresh, never-deployed template, replace the example domain migration;
   for an existing deployment, add migrations without rewriting applied ones.
   Preserve the core engine and billing migrations.
3. Enforce ownership with RLS and use the restricted cartridge_executor role
   for intents. Keep client writes and engine helper access blocked. Validate,
   mutate, charge, and audit within the documented transaction boundary.
4. Use generic undo only for reviewed, registered single-row updates. Explain
   unsupported workflows and external side effects instead of promising undo.
5. Write useful tool descriptions, billing notes, and SOPs. On failure, return
   actionable remediation. Never blindly retry ambiguous mutations.
6. Reuse Polar checkout, portal, and webhook support. Do not invent product
   IDs, credentials, prices, or successful payments. Do not change live
   billing settings or create paid resources without my explicit approval.
7. Add domain tests for the happy path, invalid transitions, cross-user
   isolation, failed-payment rollback, and supported undo/conflict behavior.
   Update example-specific tests and documentation to match the new domain.
8. Run npm ci, npm run check, and the documented Deno checks. Report exact
   results and distinguish local tests from unverified provider integrations.
9. Prepare the GitHub Environment setup using docs/TEMPLATE.md. List required
   secrets and variables without putting secret values in chat or source.
   Do not deploy, push migrations, or run the deploy workflow without approval.

Deliver working code, an updated product README, example agent interactions,
a concise change summary, test results, and the remaining setup checklist.
Keep source code, documentation, and generated instructions in English.
```

**Example brief:** “Build an editorial approval cartridge for small publishing teams. Each user owns articles with `draft`, `review`, and `published` states. Agents can list articles and change publication status. Publishing requires zero unresolved checks and costs one credit; reads and moves to review are free. Support conflict-checked undo of publication updates. Exclude CMS publishing, collaboration, and subscription upgrades from the first version.” Replace the product-brief fields with this idea or your own.

> The template supplies the framework, not provisioned accounts. Supabase and Polar setup, OAuth registration, consent-page hosting, and production approval rules still need an operator. Start in staging and verify a real sandbox checkout before going live.

Cartridge (`@cartridge/core`) is an experimental, MIT-licensed framework for agent-native applications. Instead of building another frontend and controller layer, define:

1. **State and invariants** in PostgreSQL.
2. **System calls** as MCP tools backed by database functions.
3. **Operating instructions** in a generated `SKILL.md`.

Claude Code, Codex, Gemini, and web-based assistants can act as the interface when their clients support remote MCP and the configured OAuth flow. Cartridge does not run an LLM, store model credentials, or require a proprietary agent runtime.

> **Status: v0.1 foundation, not a production security certification.** Compiler and PostgreSQL behavior are tested locally. Hosted OAuth, real Polar/Stripe delivery, and individual agent-client compatibility still require deployment testing. The package has not been published to npm.

## What is included

- Typed `defineCartridge()` configuration with runtime validation.
- A deterministic compiler for MCP manifests, client configuration, and a complete skill manual.
- A stateless Streamable HTTP MCP Edge Function with tools, resources, and prompts.
- Supabase OAuth consent page and protected-resource discovery.
- Atomic credit debit, audit recording, and Error-as-Prompt envelopes.
- Conflict-checked undo and one-time refunds for registered single-row updates.
- Polar hosted checkout and customer portal tools, signed webhooks, order deduplication, and subscription tier synchronization.
- Optional legacy Stripe webhook with Checkout Session deduplication.
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
    002_polar_billing.sql         Subscription synchronization and billing guidance
  functions/
    mcp/index.ts                  Manifest-driven MCP runtime
    billing-webhook/index.ts      Polar fulfillment (default)
    stripe-webhook/index.ts       Optional legacy Stripe fulfillment
public/oauth/consent/index.html   Shared sign-in and consent page
tests/                            Compiler and embedded PostgreSQL tests
dist/                             Generated artifacts (gitignored)
```

## Use as a GitHub template

Create your own repository with **Use this template**, then follow [the template deployment guide](docs/TEMPLATE.md). The included manually triggered GitHub Actions workflow can plan/apply Supabase migrations, deploy Edge Functions, synchronize secrets, reconcile Polar webhooks, and publish downloadable consent/agent artifacts. Configure separate GitHub Environments and approval rules before granting deployment credentials. Account provisioning, OAuth client registration, and static hosting remain explicit operator setup.

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

## Bounded MCP responses and private exports

All tool results pass through a response formatter. Up to **15 KiB of UTF-8 JSON text** is returned inline. Larger results, up to **10 MiB**, are uploaded with the user's JWT to the private `cartridge-exports` bucket and replaced by a compact download envelope. Apply `003_response_exports.sql` before deploying this runtime.

- Exports are isolated by `auth.uid()` folders and random UUID filenames; no service-role key is used by MCP.
- Array previews have a separate 2 KiB budget and at most three rows. A single huge row is omitted rather than copied into the envelope.
- Mutation audit IDs, actual charges, and small error/remediation fields are retained. Export failures do not change an already committed mutation's success flag; `delivery_error` warns the agent **not to repeat the mutation**.
- Signed links are bearer credentials, reusable for 900 seconds, not one-time URLs. Share only with the requesting user. Link expiry does **not** delete stored data.
- Configure a trusted scheduled job to run `npx tsx scripts/cleanup-exports.ts --apply` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. It deletes objects older than 24 hours using the Storage API. Without `--apply` it reports a count only. No cleanup schedule is installed automatically; configure retention before production traffic.
- Results exceeding 10 MiB return a bounded delivery warning. This middleware serializes results in memory; it is not a streaming exporter for hundreds of MB. Large datasets need a domain export worker.

The limit covers tool text, not JSON-RPC framing, resource/prompt manuals, host-specific token budgets, or the cost of fetching data. Host limits vary; 15 KiB is a framework budget, not a universal MCP guarantee. Local agents can download privately and process files without placing their full contents into model context, but instructions and summaries still consume tokens.

Queries remain capped at 50 rows; automatic cursor pagination is not implemented. Domain authors should add stable cursor/filter APIs for large collections. Signed upload slots and file parsing/import are likewise domain-specific and not implemented by this response middleware; add content/size validation, ownership checks, job status and idempotency before exposing an ingestion tool. Do not put base64 files in tool arguments.

## OAuth and hosting

OAuth is infrastructure, not something a config compiler can provision automatically.

1. Enable the Supabase OAuth server for your hosted project. `config.toml` configures **local** Supabase; it does not configure the hosted dashboard.
2. Host `public/` on your application's HTTPS origin. Supabase Edge Functions do not automatically serve these static files. Set the Supabase Auth Site URL to this origin, and the consent path to `/oauth/consent/`.
3. Choose a client registration policy. For dynamic registration, enable **Allow Dynamic OAuth Apps** in the hosted Supabase OAuth Server settings. Supporting MCP clients can then register themselves. For manual registration, register each client using its documented redirect URI; do not guess a localhost port or use a literal `<port>` placeholder. The local `config.toml` keeps dynamic registration disabled by default; enable `auth.oauth_server.allow_dynamic_registration` explicitly for local testing if needed.
4. `CARTRIDGE_OAUTH_CLIENT_IDS` is optional. Leave it unset or empty to accept any OAuth client with a valid token from this project's issuer; set comma-separated IDs to restrict access to those clients. This does not itself enable provider-side dynamic registration, and it cannot distinguish dynamically registered clients from manually registered ones. Set `CARTRIDGE_TOKEN_AUDIENCE` to the expected issued audience (commonly `authenticated` for Supabase).
5. Set `CARTRIDGE_ALLOWED_ORIGINS` to the comma-separated browser origins you trust. Non-browser clients without Origin are allowed. No wildcard CORS is enabled.
6. Verify the provider's discovery, issuer, audience, `client_id`, and redirect behavior in your environment before connecting real accounts.

The runtime validates the user and signed claims, including issuer, audience, role, and OAuth client ID. Ordinary login JWTs without a nonempty OAuth `client_id` are rejected. If an allowlist is configured, unlisted client IDs are also rejected. A shared Supabase audience is not a dedicated per-resource audience; dedicate OAuth clients to this resource and use a dedicated audience if your provider supports it. Fine-grained per-tool OAuth scope enforcement is not included in v0.1; accepted clients receive the authenticated user's configured domain access. An empty allowlist deliberately broadens client acceptance: do not treat it as equivalent to a dedicated-client policy. Prefer an explicit allowlist for restricted deployments.

**Troubleshooting dynamic registration:** A missing client-ID list must not cause a startup 500. Metadata discovery remains available and unauthenticated requests receive a 401 OAuth challenge. If a valid connection is rejected, check the provider's dynamic registration setting, token issuer/audience/client ID, and browser origin policy. Enabling dynamic registration alone does not make every MCP client compatible. In GitHub deployments, put the optional list in the Environment **variable** `CARTRIDGE_OAUTH_CLIENT_IDS`; the workflow synchronizes it to a Supabase function secret. Clear the variable and redeploy to remove a previous restriction. No Clerk integration is required.

The 401 challenge advertises an actually routed metadata endpoint:

```text
https://PROJECT_REF.supabase.co/functions/v1/mcp/.well-known/oauth-protected-resource
```

If a client insists on root/path-based well-known discovery rather than the advertised challenge URL, add a reverse-proxy route. The included consent page supports existing email/password accounts. User signup, password reset, and alternative identity providers are operator concerns. It never auto-approves a new consent request. For production, bundle the browser dependency yourself and configure CSP/security headers at the static host.

## Billing setup: Polar (default)

Polar is the default integration for hosted checkout and customer portal access. Merchant eligibility, onboarding, payout countries, fees, and supported payment methods are governed by Polar's current policies; Cartridge does not promise instant approval or a specific fee. Confirm eligibility and MoR terms directly with Polar before launch.

Configure these server-side variables:

- `POLAR_ACCESS_TOKEN`: used by the MCP runtime to create checkout and portal sessions. Grant only the required checkout/customer-session permissions.
- `POLAR_WEBHOOK_SECRET`: used only by `billing-webhook` to validate Standard Webhooks signatures.
- `POLAR_PRODUCT_CREDITS`: an operator-owned JSON map, for example `{"YOUR_PRODUCT_UUID":100}`. Each paid order for that product grants the configured credits.
- `POLAR_SERVER`: `production` (default) or `sandbox`. Use matching tokens, products, and webhooks for the selected environment.

Supabase provides its URL and keys to hosted functions. Only the webhook uses the service-role key. Never expose any Polar token in browser assets or tool responses.

### Checkout and customer identity

1. Create fixed-quantity credit-pack and/or subscription products in Polar. Use one unit per checkout; variable quantities and seat-based credits are not supported.
2. Call `cartridge_checkout` without arguments to list configured product IDs and credits per paid order.
3. After the user selects a product, pass `product_id`. The server creates the checkout with `externalCustomerId` taken exclusively from the verified Supabase user.
4. Show the resulting `checkout_url` to the user. The hosted checkout displays the actual price and billing interval. Wait for payment before retrying the domain intent.
5. Call `get_billing_portal` for receipts, payment details, and subscription management. It creates a private portal session for that same external customer ID. Treat the returned URL as a credential; do not share it.

This intentionally uses server-created checkout rather than editable `metadata[user_id]` query strings. Arbitrary metadata is not accepted as an account identity fallback. No local `polar_customer_id` mapping is needed. Static checkout links do not automatically guarantee an external-customer mapping; do not use them with this webhook unless your provisioning establishes the same trusted mapping.

When Polar is unconfigured, both tools return `BILLING_NOT_CONFIGURED`. `cartridge_status` remains a database status call; its legacy static top-up URL may be null. On `PAYMENT_REQUIRED`, use `cartridge_checkout` rather than expecting SQL to call the payment provider.

### Webhooks, renewals, and cancellation

Deploy `billing-webhook` with gateway JWT verification disabled, and register its URL in Polar. Subscribe to `order.paid`, `subscription.created`, `subscription.updated`, `subscription.active`, `subscription.canceled`, `subscription.uncanceled`, and `subscription.revoked`.

- Signature validation uses the original request body and the official SDK.
- Only `order.paid` grants credits. The first subscription payment and each renewal have distinct order IDs; `subscription.active` never grants credits a second time.
- Order IDs are stored as `polar:order:<id>` in the existing grant ledger. Retries cannot duplicate a credit grant.
- Unknown products, invalid account IDs, or database failures return a failure response for operator investigation and provider retry. A paid event is never acknowledged after a failed grant.
- Subscription state is stored per subscription, with timestamp guards against stale events. Any remaining active/trialing subscription preserves `pro`; otherwise the account becomes `free`. An unlimited override is preserved. Cancellation scheduled for period end retains access while Polar still reports active status. Past-due state delivered through `subscription.updated` removes pro status under this policy.
- Revocation changes the plan, not the existing credit balance. Credits do not expire at renewal. Refunds, disputes, and clawbacks are not automated.

Polar owns the free/pro subscription tier when this integration is enabled. Do not simultaneously use manual or another provider's pro grants as an independent entitlement source. Multiple Polar subscriptions are supported; cross-provider subscription aggregation is not.

Apply `002_polar_billing.sql` to existing installations with `supabase db push`. It is additive: do not rewrite or rerun the original migration. Existing Stripe installations must move their Stripe webhook endpoint to `stripe-webhook` **before** deploying the new Polar handler to `billing-webhook`. Do not register Stripe events on the Polar endpoint.

The SDK is pinned to `0.42.5`, whose checkout, portal, and webhook APIs are type-checked here. Provider upgrades require contract testing. Run a complete sandbox checkout, duplicate delivery, renewal, cancellation, revocation, and portal flow before live use.

### Optional legacy Stripe integration

Configure the following **server-only** secrets for `stripe-webhook`:

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

Register `checkout.session.completed` and `checkout.session.async_payment_succeeded` for the `stripe-webhook` URL. Only paid, one-time sessions are fulfilled. Credits come from operator-owned Stripe price mappings, never from metadata supplied by a client. The session ID is unique in the database, so event retries and alternate success events cannot double-credit a purchase. An invalid mapping/database failure returns 500 for delivery retry.

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

For legacy Stripe support, also deploy `supabase functions deploy stripe-webhook --no-verify-jwt`.

Disabling gateway JWT checks is intentional: MCP verifies OAuth tokens and produces discovery challenges itself; billing endpoints verify their provider's signatures. Upload function secrets using your normal secure Supabase workflow. Host the generated consent assets separately, then connect a compatible MCP client to `CARTRIDGE_MCP_URL`.

Install `dist/skills/SKILL.md` using your agent's skill mechanism, or retrieve the identical manual through `skill://manual` or `load_skill_sop`. Do not assume every agent automatically loads resources or prompts.

## Development and verification

```sh
npm run check
npx deno check --config supabase/functions/deno.json \
  supabase/functions/mcp/index.ts supabase/functions/billing-webhook/index.ts \
  supabase/functions/stripe-webhook/index.ts
npm audit
```

The PostgreSQL test exercises migrations, row isolation, direct-write denial, protected engine helpers, failed-payment rollback, publication, undo, repeat-undo rejection, unlimited-plan billing, stale undo conflicts, and webhook grant deduplication. PGlite is useful PostgreSQL execution coverage, but it does not substitute for concurrent-session tests against a real Supabase deployment.

Before production, add real-provider OAuth/MCP integration tests, Polar sandbox and Stripe test-mode delivery tests, concurrent wallet/undo tests, rate limiting, monitoring, backups, and an independent security review. The core is reusable, **not immutable**: apply future security updates and migrations.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). See [SECURITY.md](SECURITY.md) for security boundaries and reporting guidance.

## License

[MIT](LICENSE).
