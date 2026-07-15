# Legacy Traces — Infrastructure & Deployment Guide

This project has **two fully separate deployment targets** — production and
non-prod — each with its own GitHub repo, its own Cloudflare account, its own
Worker, and its own D1 database. They share this one local codebase but
never share infrastructure. Read this before touching git remotes, wrangler,
or `.env.production` — the two environments look identical at a glance
(same Worker name, same D1 name) and are only distinguished by *which
account/remote is currently active*.

## ⚠ Pending prod deployment (held for a single combined push, per project owner)

As of 2026-07-15, prod (`origin` / `legacytraces24` account) is **behind**
both the local `main` branch and the non-prod Worker. Nothing below has been
deployed to prod yet — do it all together in one stretch, not piecemeal,
unless explicitly told otherwise (an exception was already called out once
for the CORS fix below, but the owner chose to hold it too).

**Backend (`Backend/backend.js` — not git-tracked, deploy via wrangler only):**
1. **CORS fix exempting the Cashfree webhook route from Origin-based 403
   rejection** (`fetch()`'s CORS block, near the top of the file). Confirmed
   via the project owner's own Cashfree dashboard logs: every
   `PAYMENT_SUCCESS_WEBHOOK` delivery attempt to prod has failed with `403
   FORBIDDEN` for at least 7 days, because Cashfree's webhook POST never
   sends a browser `Origin` header and the CORS allow-list check was
   rejecting it before the request ever reached the webhook logic. This is
   the actual root cause of "payment succeeded but shows Pending Payment" in
   prod — see `docs/PAYMENT_FLOW_RCA.md`. Already deployed and verified
   working on non-prod.
2. Temporary `console.log` instrumentation added throughout `paymentWebhook`
   (visible via `wrangler tail`) — safe to deploy alongside the fix, trim
   later once confirmed reliable in prod.
3. **Payments soft-delete fix** (`upsertPayment`, `getPaymentStatus`) — a
   retry used to hard-`DELETE` the order's previous `payments` row before
   inserting a new one. Once the webhook actually works (item 1 above), this
   becomes a live bug: if a customer retries before an *earlier* attempt's
   webhook lands, the retry deletes the row that webhook needs to match
   against, orphaning a real successful charge (and risking a double charge
   if both attempts settle). Fixed by soft-deleting instead (new
   `payments.is_deleted` column — requires running
   `schema_payments_soft_delete.sql` against prod D1 first, see below).
   **Must ship in the same push as item 1**, not after — turning the webhook
   on without this fix reintroduces a way to lose payments. Refined twice
   further the same day: (a) a prior attempt is only preserved (soft-deleted)
   while it's < 10 minutes old (its webhook could still be in flight) — past
   that, a retry reuses the same row; (b) `initPayment`/`initCodPayment` now
   actively verify a retry's prior attempt with Cashfree directly
   (`resolvePriorPendingPayment`) before starting a new charge — if it
   already succeeded, the order is confirmed immediately and the frontend
   skips opening a second payment modal (`alreadyPaid` response); if
   Cashfree confirms it's dead (`ACTIVE`/`EXPIRED`/`CANCELLED`), the row is
   hard-deleted outright. This is now the primary mechanism (ground truth,
   not a heuristic); the 10-minute timer is the fallback for when Cashfree
   itself can't be reached. `initCustomOrderPayment`/`initCustomOrderCodPayment`
   were initially missed when this was added — fixed the same day so custom
   orders get identical retry protection, not just regular cart checkout.
4. **`USER_DROPPED` now treated as a terminal failure** in `paymentWebhook`
   — previously only `SUCCESS`/`FAILED` were recognized, so an abandoned
   payment (customer closes the Cashfree modal) fell through to `PENDING`
   and never closed out the order, even though Cashfree does send this event.
5. Temporary `console.log` instrumentation added throughout `paymentWebhook`
   (visible via `wrangler tail`) — safe to deploy alongside the fix, trim
   later once confirmed reliable in prod.
6. **Known-affected order needing manual review once the fix is live:**
   order `LT1626` (`cf_payment_id 6012756811`, ₹549, UPI, customer "Vimaly
   M.") paid successfully on 2026-07-15 but is stuck `Pending Payment` in
   prod D1 — the webhook that would have confirmed it was 403'd. Deploying
   the CORS fix only prevents *future* payments from being lost; it does
   **not** retroactively fix orders already stuck from the past 7+ days of
   failed deliveries. Cross-check Cashfree's dashboard webhook logs for all
   `FAILED` `PAYMENT_SUCCESS_WEBHOOK` attempts in that window against D1
   orders still in `Pending Payment` to find every affected order, not just
   this one.
7. **`getAdminOrders`'s `LEFT JOIN payments` now filters `is_deleted = 0`** —
   without it, an order with more than one `payments` row (any retried
   payment, now common since item 3 above) was returned once *per payment
   row*, duplicating that order in the admin orders list and making sorting
   look broken. Same root cause as item 3: the join's old comment assumed
   "an order never has two payments rows," which stopped being true the
   moment `upsertPayment` switched to soft-delete.
8. **New: stock-based delivery estimate**, sent as the `eta` field on the
   `order_confirmation` WhatsApp message. `products` gained a `quantity`
   column (`schema_product_stock.sql`, default **100**, not 0 — there's no
   admin UI yet to set real per-product stock, and defaulting to 0 would've
   made every product look out-of-stock the instant this ships). At order
   time, every function that places/pays for a cart order (`postOrder`,
   `initPayment`, `initCodPayment`) checks each cart item's quantity against
   `products.quantity`; if everything ordered is covered, the estimate is
   **+3 calendar days** from today, else **+7 days**. This is computed once
   and stored on `orders.delivery_eta` (an existing, previously-admin-edited
   column, now repurposed — not shown in the admin UI, that was removed
   earlier per a separate request) so `markOrderPaid` can include it in the
   WhatsApp payload without needing to re-derive cart contents later. Custom
   orders (`confirmCustomOrder`, `initCustomOrderPayment`,
   `initCustomOrderCodPayment`) always use the **+7 day** tier — they're made
   to order, not pulled from catalog stock.
   **Known gap:** there is still no admin UI to actually set/edit a
   product's real stock `quantity` — until one exists, update it the same
   way every other product field is managed today: direct
   `wrangler d1 execute ... --command "UPDATE products SET quantity = ? WHERE id = ?"`.
9. **New: stock actually decrements on a confirmed sale**, and stale
   cart price/stock gets corrected before checkout. Two gaps found the same
   day the ETA feature above shipped: (a) `products.quantity` was only ever
   *read* (for the ETA estimate), never decremented — a successful payment
   didn't reduce stock at all; (b) the cart caches a full product snapshot
   (price, stock) at add-to-cart time with no expiry, so a customer could
   still see/pay a long-stale price. Fixed:
   - `orders` gained a `cart_json` column (`schema_order_cart_json.sql`) —
     `[{productId, qty}]`, set by `postOrder`/`initPayment`/`initCodPayment`/
     `upsertPendingOrder`. Custom orders don't set it (made-to-order, no
     catalog stock to deduct).
   - New `decrementStock(cartItems)` helper (`UPDATE products SET quantity =
     MAX(quantity - ?, 0) WHERE id = ?`, clamped in SQL so it can't race
     negative). Called directly in `postOrder` (order is confirmed
     immediately, no separate pending phase) and from `markOrderPaid` (gated
     on `isFirstConfirmation`, same guard that already prevents double
     WhatsApp sends, so a webhook + polling-fallback race can't double-decrement).
   - The public catalog SELECT (`getAll()`) now exposes `quantity AS
     Quantity` — previously not sent to the frontend at all.
   - Frontend: `api.js` gained `refreshProducts()` (bypasses the module-level
     `cachedData` catalog cache), `CartContext` gained
     `syncCartWithCatalog(freshProducts)`, and `Checkout.jsx` calls both once
     on reaching the summary step — silently corrects cart price/stock
     before payment. **Explicitly not surfaced to the customer** (no "price
     changed"/"low stock" banner, per the project owner) — this is a
     backend-facing correctness fix (accurate charge amount, accurate
     delivery-ETA stock check), not customer-facing messaging.
   Already deployed and verified on non-prod (schema applied, worker
   deployed, decrement SQL manually verified against a real product row,
   catalog response confirmed to include `Quantity`).
10. Deploy with:
   ```bash
   cd Backend
   npx wrangler login    # sign in as legacytraces24@gmail.com
   npx wrangler d1 execute legacy-traces-db --remote --file=./schema_payments_soft_delete.sql
   npx wrangler d1 execute legacy-traces-db --remote --file=./schema_product_stock.sql
   npx wrangler d1 execute legacy-traces-db --remote --file=./schema_order_cart_json.sql
   npx wrangler deploy   # no --env flag
   ```

**Frontend (`main` branch — 10 commits ahead of `origin/main`):**
- `faed06b`, `b27a6ce`, `e9958ec` — this `CLAUDE.md` file itself (topology,
  schema parity-check steps, full env-var reference)
- `dfa36ed` — CSP fix whitelisting the non-prod Worker URL in
  `index.html`'s `connect-src` (harmless for prod — just widens the
  allow-list, doesn't change prod's own behavior)
- `909215c` — Admin dashboard: revenue = Shipped+Delivered, CF order ID,
  advanced filters
- `0f89122` — `docs/PAYMENT_FLOW_RCA.md` + this pending-deployment tracking
- `d84d172` — Checkout: warns the customer not to close the payment
  window/tab during the active payment or verification window
- `639b002` — Checkout: skips a redundant payment modal if a retry is
  already paid (pairs with backend item 3)
- `9d209e5` — Admin dashboard: clickable summary/status filter cards,
  compact bordered orders table
- `44cc4f0` — Admin dashboard: ServiceNow-style unified column search
  (per-column lens-icon search feeding the same condition model as the
  Advanced panel; replaces the old top search boxes + separate date range)
- `e325726` — Checkout: fixes a real bug where a successful (non-custom)
  payment redirected to `/cart` instead of `/orders` — `clearCart()` raced
  against the Checkout empty-cart effect; guarded with `justCheckedOutRef`
- `59a4e14` — Checkout: refresh catalog + reconcile stale cart price/stock
  before payment (pairs with backend item 9 above)
- `8eabee2` — Checkout: follow-up on the above — dropped the customer-facing
  "price changed"/"low stock" banner per explicit request; the catalog sync
  stays, just silent
- Deploy with: `git push origin main`, then `git checkout main && npm run
  build && npm run deploy`

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

## Environment variables reference

Three separate surfaces hold config, and each has its own prod vs. non-prod
values. Nothing here is optional — a fresh clone/agent working on this repo
needs to touch all three to stand up (or reproduce) the non-prod environment.

### 1. Local files (edited in VS Code, live in the git repo)

| File | Branch | Var | Prod value | Non-prod value |
|---|---|---|---|---|
| `.env.production` | `main` / `import-latest` | `VITE_GOOGLE_CLIENT_ID` | `541581288852-bu890s0gf6rami0mqilephvhtki0c2sl.apps.googleusercontent.com` | same (shared OAuth client) |
| `.env.production` | `main` / `import-latest` | `VITE_API_URL` | `https://legacy-traces-worker.legacytraces24.workers.dev/` | `https://legacy-traces-worker.legacytracesdev.workers.dev/` |
| `.env.production` | `main` / `import-latest` | `VITE_CASHFREE_ENV` | `production` | `sandbox` |
| `Backend/wrangler.toml` | (n/a — one file, per-env blocks) | top-level `[vars]` | prod values (`ALLOWED_ORIGIN`, `CASHFREE_ENV=production`, `WORKER_URL`, `FRONTEND_URL=https://www.legacytraces.com`) | n/a — use `[env.nonprod.vars]` instead |
| `Backend/wrangler.toml` | — | `[env.nonprod.vars]` | n/a | `ALLOWED_ORIGIN=https://legacy-traces.github.io,http://localhost:5173`, `CASHFREE_ENV=sandbox`, `WORKER_URL=https://legacy-traces-worker.legacytracesdev.workers.dev`, `FRONTEND_URL=https://legacy-traces.github.io` |
| `Backend/wrangler.toml` | — | `[env.nonprod.d1_databases]` `database_id` | n/a | `8a9437ef-55c9-4768-ad6f-39d079c1ec3f` |

`.env` (gitignored, local-dev-only, used by `npm run dev`) is separate from
both of these and not part of either deploy pipeline — it's whatever the
person developing locally wants, pointed at either Worker.

### 2. Cloudflare (secrets — never in a file, set via CLI per account)

Set with `wrangler secret put <NAME>` (prod, top-level) or
`wrangler secret put <NAME> --env nonprod` (non-prod), while logged into the
matching account:

| Secret | Prod | Non-prod |
|---|---|---|
| `ADMIN_SUB` | set | set |
| `ADMIN_EMAIL` | set | set |
| `GOOGLE_CLIENT_ID` | set | set (same public value as `VITE_GOOGLE_CLIENT_ID` above — safe to `echo \| wrangler secret put`) |
| `CASHFREE_APP_ID` | set (live keys) | set (**must be sandbox keys** — never reuse prod Cashfree credentials here) |
| `CASHFREE_SECRET_KEY` | set (live keys) | set (**sandbox**) |

Verify what's set (names only, not values) with `wrangler secret list`
(`--env nonprod` for non-prod).

### 3. GitHub

No GitHub Actions / CI secrets exist for this project — there's no
`.github/workflows`, deploys are manual (`npm run deploy` / `gh-pages` CLI
run locally). The only GitHub-side "config" is:
- The committed `.env.production` per branch (table above) — GitHub just
  stores whatever's in the branch, no separate Secrets/Variables setup.
- Repo access itself: pushing to `origin` needs `legacytraces24-svg`
  account credentials; pushing to `neworg` needs `legacy-traces` account
  credentials. Git's credential manager caches per-remote, and mixing the
  two in one session can cause pushes to the wrong repo to fail with a 403
  using the other account's identity — re-authenticate explicitly if that
  happens rather than assuming the push is broken.

### Content Security Policy (`index.html`) must whitelist BOTH Worker URLs

GitHub Pages can't set real HTTP response headers, so the CSP is a static
`<meta http-equiv="Content-Security-Policy">` tag in `index.html` — and
unlike `.env.production`, **`index.html` does not differ between `main` and
`import-latest`**. It's the same file on both branches, but each branch's
build calls a different Worker URL (`VITE_API_URL`, baked into the JS at
build time). If the CSP's `connect-src` only lists one Worker's URL, the
*other* environment's build gets its own API calls silently blocked by the
browser with an error like:

```
Connecting to '<worker-url>' violates the following Content Security Policy
directive: "connect-src 'self' ...". The action has been blocked.
```

This isn't a build error or a CORS/backend issue — it's purely client-side,
enforced by the browser regardless of what the server allows, and it will
look like the API call vanished entirely (no network request even leaves
the browser). The fix is to list **both** Worker URLs in `connect-src`
(same pattern already used for `api.cashfree.com` +
`sandbox.cashfree.com` — this CSP is deliberately shared/dual-environment,
not per-branch):

```
connect-src 'self'
  https://legacy-traces-worker.legacytraces24.workers.dev
  https://legacy-traces-worker.legacytracesdev.workers.dev
  ...
```

**To avoid this in future:** any time a *new* external host is added to
either environment (a new payment gateway, analytics tool, different Worker
URL, etc.), add it to `index.html`'s CSP on `main` and sync that one file
over to `import-latest` (`git checkout main -- index.html` while on
`import-latest`, don't do a full merge) — the same way `CLAUDE.md` itself
gets synced. Since `index.html` is genuinely identical infrastructure
(unlike `.env.production`/`public/CNAME`, which are supposed to differ),
it should never diverge between the two branches at all.

### Known intentional prod/non-prod schema difference

Prod's D1 has **17 tables** (no `contact_messages`); non-prod has **18**
(includes it). Confirmed with the project owner (2026-07-14) that this is
**not a gap to fix** — `contact_messages` is not required in prod as it
currently stands. Don't run `schema_contact_messages.sql` against prod
without being told to explicitly.

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
