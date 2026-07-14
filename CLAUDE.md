# Legacy Traces — Infrastructure & Deployment Guide

This project has **two fully separate deployment targets** — production and
non-prod — each with its own GitHub repo, its own Cloudflare account, its own
Worker, and its own D1 database. They share this one local codebase but
never share infrastructure. Read this before touching git remotes, wrangler,
or `.env.production` — the two environments look identical at a glance
(same Worker name, same D1 name) and are only distinguished by *which
account/remote is currently active*.

## Topology at a glance

| | **Production** | **Non-prod** |
|---|---|---|
| GitHub remote | `origin` → `legacytraces24-svg/legacytraces24-svg.github.io` | `neworg` → `legacy-traces/legacy-traces.github.io` |
| Source branch | `main` | `import-latest` (= `main` minus `public/CNAME`, minus prod `.env.production`) |
| Built site branch | `gh-pages` (on `origin`) | `gh-pages` (on `neworg`) |
| Live URL | `www.legacytraces.com` (custom domain via `public/CNAME`) | `legacy-traces.github.io` (no CNAME) |
| Cloudflare account | `legacytraces24@gmail.com` (Account ID `4e035d2a85b810dd89a7752e96c07d3d`) | `legacytracesdev@gmail.com` (Account ID `07ee2718d170c9fba32dbf71079d0ca6`) |
| Worker | `legacy-traces-worker` → `legacy-traces-worker.legacytraces24.workers.dev` | `legacy-traces-worker` → `legacy-traces-worker.legacytracesdev.workers.dev` |
| D1 database | `legacy-traces-db` (uuid `e9b7a462-aafe-4ef9-88e9-441f2a412227`) | `legacy-traces-db` (uuid `8a9437ef-55c9-4768-ad6f-39d079c1ec3f`) — **not empty**, seeded with real-looking catalog/order data |
| `wrangler.toml` scope | top-level config (no `--env` flag) | `[env.nonprod]` block |
| Cashfree | `production` (real payments) | `sandbox` |

**Critical rule:** `Backend/wrangler.toml`'s top-level `[[d1_databases]]`/`[vars]`
block always means **prod**, by convention. Never repoint it at non-prod
values — that's what `[env.nonprod]` is for. Isolation between the two also
happens at the Cloudflare *account* level (different login = different D1
namespace entirely), so a plain `wrangler deploy` while logged into the
non-prod account can't accidentally touch prod data even if the config were
wrong — it would just fail to find the D1 database.

## Deploying

### Backend (Cloudflare Worker)

```bash
cd Backend

# Production
npx wrangler login          # sign in as legacytraces24@gmail.com
npx wrangler deploy         # top-level config → prod

# Non-prod
npx wrangler login          # sign in as legacytracesdev@gmail.com
npx wrangler deploy --env nonprod
```

Check which account is active first with `npx wrangler whoami` — **always**
verify this before running any `wrangler d1` or `wrangler deploy` command,
since both accounts have identically-named resources.

Secrets (never in `wrangler.toml`, set per account via CLI):
`ADMIN_SUB`, `ADMIN_EMAIL`, `GOOGLE_CLIENT_ID`, `CASHFREE_APP_ID`,
`CASHFREE_SECRET_KEY`. For non-prod, append `--env nonprod` to
`wrangler secret put <NAME>`. `GOOGLE_CLIENT_ID` is not actually sensitive
(it's public in the frontend bundle) — safe to pipe directly:
`echo "<client-id>" | npx wrangler secret put GOOGLE_CLIENT_ID --env nonprod`.

### D1 schema

`Backend/schema.sql` is the consolidated base schema, but it only uses
`CREATE TABLE IF NOT EXISTS` — **it will not retrofit columns onto a table
that already exists in an older shape**. If a D1 database isn't brand new
(and `wrangler d1 list`'s `num_tables` count can be stale/wrong — verify
real state with `PRAGMA table_info(x)` or `SELECT name FROM sqlite_master`,
not that summary count), you must also run every incremental
`schema_*.sql` file, since those are the only thing that actually adds
missing columns via `ALTER TABLE ... ADD COLUMN`:

```bash
cd Backend
npx wrangler d1 execute legacy-traces-db --remote --file=./schema.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_addresses.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_branches.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_custom.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_payments.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_legacy_customers.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_contact_messages.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_banner_device.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_banner_show_button.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_banner_show_text.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_coupon_upgrade.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_coupon_usage.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_custom_order_payment.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_delivery_tracking.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_max_price.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_shipped_at.sql --env nonprod
npx wrangler d1 execute legacy-traces-db --remote --file=./schema_shipping.sql --env nonprod
```

Drop `--env nonprod` (and be logged into the prod account instead) to apply
against production. Each `ALTER TABLE` file will error with "duplicate
column" if the column already exists — that's expected/harmless when
re-running against a database that's already up to date.

**Don't trust the list above blindly** — run `ls Backend/schema_*.sql` and
diff against it, since new schema files get added over time and this doc
can drift. `Backend/schema_full.sql` is the authoritative "what a complete
database should contain" reference (every table + column in one file, for
docs/comparison purposes only — don't execute it alongside the individual
files above, its comment header explains why). After applying everything,
verify parity table-by-table:

```bash
# actual columns per table
for t in banners collections types products customers customer_addresses \
         legacy_customers orders payments custom_orders feedback ratings \
         coupons coupon_usage contact_messages branch_locations; do
  echo "=== $t ==="
  npx wrangler d1 execute legacy-traces-db --remote --command "PRAGMA table_info($t)" --env nonprod
done
```

Missing the `legacy_customers` table specifically won't break login (the
one place that reads it, `postCustomer`/`saveCustomer` in `backend.js`,
wraps the query in a try/catch and silently no-ops if the table doesn't
exist) — but every other missing table/column will surface as a hard
`D1_ERROR` on whatever endpoint queries it.

### Frontend (GitHub Pages)

Vite bakes `VITE_*` vars from `.env.production` into the build **at build
time**, based on whichever branch is checked out — there is no runtime
config. `.env.production` is intentionally committed to git (unlike
gitignored `.env`) so a fresh clone always builds correctly with no manual
setup. It differs between branches:

- `main`: `VITE_API_URL` → prod Worker, `VITE_CASHFREE_ENV=production`.
- `import-latest`: `VITE_API_URL` → non-prod Worker, `VITE_CASHFREE_ENV=sandbox`.

```bash
# Production — build from main, publish to origin/gh-pages
git checkout main
npm run build
npm run deploy                              # gh-pages -d dist (defaults to `origin`)

# Non-prod — build from import-latest, publish to neworg/gh-pages
git checkout import-latest
npm run build
npx gh-pages -d dist -r https://github.com/legacy-traces/legacy-traces.github.io.git -b gh-pages
git checkout main                           # switch back when done
```

`import-latest` should periodically be re-synced from `main` (it's meant to
track prod source exactly, minus `public/CNAME` and minus the prod
`.env.production` values) and re-pushed to `neworg/main`:

```bash
git checkout import-latest
git merge main                              # bring in latest prod source
# re-apply the two non-prod-only diffs if merge conflicts touch them:
#   - public/CNAME must not exist on this branch
#   - .env.production must point at the non-prod Worker + sandbox
git push neworg import-latest:main --force  # neworg/main has unrelated old history — force is expected
git checkout main
```

## Known gotchas (hit and resolved during initial setup)

- **`git push` can hang on an interactive Git Credential Manager prompt** in
  non-interactive/agentic shells. `GIT_TERMINAL_PROMPT=0` makes it fail
  fast instead of hanging, which is useful for *diagnosing* the issue, but
  the actual fix requires a human completing sign-in in their own
  interactive terminal — this can't be scripted around.
- **`wrangler login` requires a real browser-completed OAuth flow** and
  times out after a few minutes if no one completes it. Run it in the
  background, surface the printed auth URL to the user, and poll
  `wrangler whoami` afterward to confirm.
- **Both Cloudflare accounts use identical resource names** (Worker
  `legacy-traces-worker`, D1 `legacy-traces-db`) — always run
  `wrangler whoami` immediately before any D1/deploy command to confirm
  which account is active, especially in a fresh shell/session.
