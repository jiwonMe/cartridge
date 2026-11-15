# Deploy your own Cartridge

Use **Use this template → Create a new repository** on GitHub. Alternatively:

```sh
gh repo create YOUR_ACCOUNT/YOUR_APP --template jiwonMe/cartridge --public --clone
cd YOUR_APP
npm ci
npm run check
```

The template includes source, tests, and workflows, not credentials or infrastructure. GitHub environments, secrets, variables, and review rules are **not copied**. No deployment runs on clone, pull requests, or ordinary pushes. Do not distribute a Supabase database between independent copies: each application needs its own project.

## 1. Customize the application

Edit `domain/cartridge.config.ts` and the example domain migration before the first deployment. Change the package name/version if publishing your own package, and update the README. Do not modify migrations that have already been deployed; add new migrations instead.

## 2. Provision accounts once

- Create separate Supabase projects for staging and production.
- Create a Polar organization, sandbox/live products, and organization access tokens. Products must be fixed-quantity; credit quantities come from the product-ID mapping below. The workflow validates products but never creates prices, charges a customer, creates an organization, or accepts merchant terms.
- Enable Supabase OAuth, register clients, configure Site URL and consent path as described in the main README. Auth provider/client configuration is manual; the workflow does not silently replace existing auth settings.
- Provide an HTTPS static host for `public/`. The workflow uploads a ready-to-host consent artifact, but does not choose a hosting provider or configure a domain for you.

## 3. Configure GitHub Environments

In your repository's **Settings → Environments**, create `staging` and `production`.

For **production**, configure required reviewers, prevent self-review where supported, and restrict deployments to the default branch. These protections must be configured by the repository owner; simply naming an environment in YAML does **not** enable approval. Availability depends on your GitHub plan and repository visibility. Without reviewers configured, clicking Deploy is the authorization gate.

Use different credentials and projects per environment. Staging requires `POLAR_SERVER=sandbox`; production requires `production`.

### Environment secrets

| Secret | Purpose |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI management access |
| `SUPABASE_DB_PASSWORD` | Linked project's database password |
| `SUPABASE_ANON_KEY` | Public anon key for generated consent assets (not service-role key) |
| `POLAR_ACCESS_TOKEN` | CI-only organization token for product reads and webhook reads/writes |
| `POLAR_RUNTIME_ACCESS_TOKEN` | Separate organization token for checkout writes and customer-session writes |

The CI management token is never installed in the Edge Functions. The runtime token is installed under the function secret name `POLAR_ACCESS_TOKEN`. Both tokens must belong to the same selected organization/environment. Use dedicated organization tokens, not a personal token spanning unrelated organizations.

### Environment variables

| Variable | Example / meaning |
| --- | --- |
| `SUPABASE_PROJECT_REF` | Your 20-character project reference |
| `CARTRIDGE_SITE_URL` | `https://app.example.com` — HTTPS origin hosting the consent page |
| `CARTRIDGE_TOKEN_AUDIENCE` | `authenticated` (verify actual issued audience) |
| `CARTRIDGE_OAUTH_CLIENT_IDS` | Optional comma-separated allowlist. Empty/unset accepts any OAuth client with a valid token from this project's issuer; enable Allow Dynamic OAuth Apps separately in Supabase for automatic registration. |
| `CARTRIDGE_ALLOWED_ORIGINS` | Comma-separated exact HTTPS browser origins, no trailing slash |
| `POLAR_ORGANIZATION_ID` | Organization owning the products and webhook |
| `POLAR_PRODUCT_CREDITS` | `{"PRODUCT_UUID":100,"SUBSCRIPTION_PRODUCT_UUID":500}` |
| `POLAR_SERVER` | `sandbox` for staging, `production` for production |

Do not manually set `POLAR_WEBHOOK_SECRET` in GitHub. The deployment reconciles the webhook by its exact Supabase URL, retrieves the signing secret, masks it in logs, and sends it to Supabase using a temporary mode-0600 file. The file is deleted on completion/failure. Existing signing secrets are not rotated on deploy.

## 4. Plan, then deploy

Open **Actions → Deploy Cartridge → Run workflow**, using the default branch.

1. Choose `staging` and `plan`. This runs tests, validates Polar products and webhook uniqueness, builds assets, links the CLI locally, and runs `supabase db push --dry-run`. No remote mutations occur.
2. Review the migration plan and provider configuration.
3. Run again with `deploy`. Production should only follow successful sandbox integration testing.

CLI equivalent after configuring the repository:

```sh
gh workflow run deploy.yml -f environment=staging -f action=plan
gh run list --workflow deploy.yml
gh workflow run deploy.yml -f environment=staging -f action=deploy
```

Deploy applies pending migrations, creates or reuses the matching Polar webhook, synchronizes runtime secrets, deploys the MCP and Polar webhook functions, reconciles event subscriptions, and checks MCP discovery/auth challenges plus Polar endpoint configuration. Only the exact endpoint for this project is managed. Unrelated webhooks and Stripe settings are untouched. Duplicate matching webhook URLs cause a failure instead of guessing.

The provider-generated webhook may start receiving events before a first deployment finishes. Avoid sales during initial provisioning; failed deliveries must be retried through Polar. Deployments are **not a cross-provider transaction**. If a later stage fails, earlier migrations or provider changes remain. Inspect dashboards and rerun; never automatically reverse billing migrations or rotate signing keys as recovery. Changing product mappings changes future fulfillment of unpaid/unprocessed orders; review this as a billing-policy change.

Download `consent-site-<environment>` and publish its contents at `CARTRIDGE_SITE_URL`. Download `cartridge-<environment>` for the generated agent integration files. Artifacts include the public anon key, never management tokens or webhook secrets. OAuth is not usable until static hosting and Auth configuration are complete.

## 5. Verify before live traffic

Test full OAuth sign-in, row isolation, a sandbox paid checkout, duplicate delivery, renewal, cancellation/revocation, customer portal, and undo. CI smoke tests are unauthenticated and do not prove a paid checkout or authenticated agent session works. Configure alerts for failed Polar deliveries and GitHub deployments.

## Template maintenance

Template copies do not inherit upstream fixes automatically. Add the source as an upstream remote and selectively review updates, especially migrations and dependency/security changes. Do not blindly merge application-specific domain SQL into a deployed project.
