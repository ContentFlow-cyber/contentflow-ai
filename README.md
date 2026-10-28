# ContentFlow AI

AI content platform for social media: captions, hashtags, ideas, video scripts, ads, emails, product descriptions, SEO, blog articles, repurposing, 7/30-day calendars and AI images. Coin-based usage, Free/Pro/Business plans, Stripe payments, profile page, EN/PT/ES/FR interface, EUR/USD pricing, light/dark mode.

Stack: Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (auth, Postgres, storage) · Anthropic API (text) · OpenAI Images API (images, optional) · Stripe · Vercel.

> **Status of this code:** it was written without being able to run `npm install`, `next build` or the tests in the authoring environment (the package registry was blocked). Nothing below has been executed yet. Section 3 is the verification you must do before launching; do not skip it.

---

## What is implemented

| Area | Status |
|---|---|
| Landing, Pricing, Contact, Privacy, Terms, Cookies, SEO, sitemap, robots | Implemented |
| Sign up, log in, log out, password reset, email verification, route protection | Implemented (uses Supabase Auth) |
| Dashboard, wallet, coin ledger, usage by tool, renewal date | Implemented |
| 13 text/image tools with coin costs read from the database | Implemented |
| Coin system: atomic spend, refund on failure, idempotency, no negative balance, browser cannot change balances | Implemented in SQL functions |
| Plan coins reset monthly (**no rollover**); purchased coins **never expire**; plan coins are spent first | Implemented |
| Favorites, history (with per-plan limit), search/filters, edit, duplicate, export (.txt), calendar (+CSV), brands/brand voice | Implemented |
| Stripe: subscription checkout (monthly/yearly, EUR/USD), coin packs, plan change with proration, cancel/resume, customer portal, verified webhooks, payment history | Implemented |
| Admin panel: users, coin adjustments (audited), plans, tool costs, coin packages, payments, errors, audit log, revenue/usage | Implemented |
| GDPR: data export and account deletion | Implemented |
| Legal pages | **Templates only: must be reviewed by a professional** |
| AI Video (text-to-video) | **Pending**: tool is disabled; needs a video provider integrated |
| Voice generation, music, auto-subtitles, video editing | **Pending** (not started) |
| Publishing directly to social networks | **Pending** (not started; needs official API integrations) |
| Team seats (3 users), batch creation, collaboration, campaign management, reusable templates, priority processing/support | **Pending**: shown as "Soon" on the plans |
| Languages beyond EN/PT in the interface | Prepared (`src/lib/i18n.ts`); content can be generated in 15 languages today |
| Apple Pay / Google Pay | Automatic in Stripe Checkout once enabled in your Stripe dashboard |
| PayPal | Enable it in Stripe (Settings → Payment methods); no code change |
| Refund handling | Manual: refund in Stripe, then remove coins in Admin → Users (audited) |

---

## 1. Run locally

Requirements: Node 20+.

```bash
cd contentflow
cp .env.example .env.local     # then fill the values (section 2)
npm install
npm run dev                    # http://localhost:3000
```

Without keys the landing page still renders with default plans; login, dashboard and generation show clear "not configured" messages that name the exact missing variable.

## 2. Services to configure

### 2.1 Supabase (database + auth) — required
1. Create a project at supabase.com.
2. **SQL Editor → New query →** paste `supabase/migrations/001_init.sql` → Run.
3. **Project Settings → API:** copy the Project URL, the `anon` key and the `service_role` key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. **The service role key is secret: server only.**
4. **Authentication → Providers → Email:** keep "Confirm email" ON (email verification).
5. **Authentication → URL Configuration:** Site URL = your site URL; add Redirect URLs `http://localhost:3000/auth/callback` and `https://YOUR-DOMAIN/auth/callback`.
6. **Authentication → SMTP:** configure your own SMTP provider before launch (the built-in mailer is heavily rate-limited).
7. There is no admin panel in the app. Edit plans, coin costs and packs directly in Supabase → Table Editor (`plans`, `tool_costs`, `coin_packages`); changes apply immediately.

### 2.2 Text AI — required: `ANTHROPIC_API_KEY`
Create a key at console.anthropic.com. Model can be changed with `AI_MODEL`. **Tune coin costs and plan prices against your real API cost** in Admin → Tool costs / Plans.

### 2.3 Image AI — optional: `OPENAI_API_KEY`
Only for the AI Image tool. Without it, the tool shows "not configured" and never charges coins.

### 2.4 Stripe — required to take money
1. Create an account at stripe.com. Start in **test mode**.
2. Developers → API keys: copy the secret key → `STRIPE_SECRET_KEY`.
3. Developers → Webhooks → Add endpoint: `https://YOUR-DOMAIN/api/stripe/webhook`, events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.
   Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (prints the secret to use).
4. Settings → Billing → Customer portal: click **Save** once (needed for "Manage payment methods & invoices").
5. Settings → Payment methods: enable cards, Apple Pay, Google Pay, PayPal as desired.
6. Prices are **not** created in Stripe: plan and pack prices come from the database (Admin panel) and are sent to Checkout. When you go live, create a live-mode key and a live webhook and replace the variables.

> Coins and plan changes are applied **only** by the verified webhook, never by the success page.

## 2.5 Strategy assistant (evolution) — migration 002 and optional connections

Run `supabase/migrations/002_strategy.sql` **after** `001_init.sql` (additive, changes nothing existing).

What it adds, and its honest status:

| Feature | Status |
|---|---|
| Goal card + goal-aware generation (objective, business, audience injected in prompts; WHY/AUDIENCE explanations) | Implemented. Needs `ANTHROPIC_API_KEY`. |
| Manual results (`/dashboard/results`), performance panel | Implemented. Missing metrics stay empty, never zero. |
| Recommendations (`/dashboard/insights`) | Implemented as **rule-based analysis** of your own posts (min. 5 posts with views). Not a trained model, no automatic learning, no prediction. With less data it explains why and proposes experiments. Accept / Not useful / Another suggestion are saved. |
| AI "test plan" (`insights` tool, 3 coins) | Implemented; refuses (no charge) when data is insufficient. |
| TikTok / Instagram connection (`/dashboard/connections`) | Code implemented (OAuth, encrypted tokens, sync, refresh, disconnect). **Never run against the real platforms**: it needs your developer apps and platform approval (below). Until then the page says exactly what is missing and manual logging remains. |

Environment variables for connections (all optional; without them the feature reports "not configured"):

- `TOKEN_ENCRYPTION_KEY` — `openssl rand -base64 32`. Tokens are stored AES-256-GCM encrypted and are unreadable from the browser.
- `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` — TikTok for Developers app with Login Kit and `user.info.basic`, `video.list`. Redirect URI: `<SITE_URL>/api/social/tiktok/callback`.
- `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` — Meta app with Instagram Login, scopes `instagram_business_basic`, `instagram_business_manage_insights`; professional (Business/Creator) accounts only. Redirect URI (HTTPS required): `<SITE_URL>/api/social/instagram/callback`.

Both platforms require app review before accounts other than your own test users can connect, and their API fields can change: verify the first real sync and adjust `src/lib/social.ts` if needed.

## 2.6 Profile page (migration 003)

Run `supabase/migrations/003_profile.sql` after 002 (adds nickname, gender, birthday, photo and the `avatars` storage bucket).

- **Photo upload:** PNG/JPG/WebP up to 2 MB, validated on the server.
- **Two-step verification (MFA):** real TOTP (Google Authenticator, Authy, 1Password) through Supabase Auth. In Supabase go to **Authentication → Sign In / Providers → Multi-Factor** and make sure TOTP enrolment/verification is enabled. When on, login asks for the code and both the dashboard and the API reject password-only sessions. Not yet tested against a live project.
- No recovery codes yet: if a user loses the authenticator app, you must remove the factor from the Supabase dashboard (Authentication → Users).

## 3. Verify before launch (mandatory)

```bash
npm install
npm run typecheck        # fix any type errors reported
npm run build            # must finish without errors
```

Database + security tests (use a **separate test Supabase project**, with the migration applied):

```bash
export NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
npm run test:integration
```
It checks: free allowance, browsers cannot call wallet functions or edit wallet/ledger/subscription/role, users cannot read each other's data, 30 parallel spends never overspend, idempotent spend/grant/refund, plan coins spent before purchased, ledger reconciles, plan change/cancel behaviour.

Manual checklist (Stripe test mode, card `4242 4242 4242 4242`):
- [ ] Sign up → confirmation email → log in → dashboard shows 100 coins.
- [ ] Generate a caption → coins drop by the shown cost; result saved in history.
- [ ] Stop `ANTHROPIC_API_KEY` (or use a bad key) → generation fails → coins are returned.
- [ ] Buy a coin pack → coins appear after the webhook; replaying the webhook event does not add them twice.
- [ ] Subscribe to Pro → plan and 2,000 coins appear; Cancel → stays until period end; Resume works.
- [ ] Upgrade Pro → Business → plan changes (webhook).
- [ ] Admin: change a tool cost → user sees the new cost; adjust coins → ledger + audit log entry.
- [ ] Settings → Export data / Delete account.
- [ ] Check on a phone: menu, tools, billing.

## 4. Deploy (Vercel) and custom domain

1. Push the project to GitHub. In Vercel: **Add New → Project →** import the repo (framework: Next.js).
2. Add every variable from `.env.example` (Production), with `NEXT_PUBLIC_SITE_URL=https://your-domain.com`.
3. Deploy. Then update Supabase redirect URLs and the Stripe webhook URL to the production domain.
4. **Domain:** buy it at any registrar → Vercel project → Settings → Domains → Add → follow the DNS records shown (an `A` record for the apex, `CNAME` for `www`). HTTPS is automatic.
5. Set the real support email in `NEXT_PUBLIC_SUPPORT_EMAIL`, complete the legal templates, and switch Stripe to live mode.

Long generations (30-day calendars, long articles) use up to 60 s per request (`maxDuration = 60`).

## 5. How coins work

- Cost is read from `tool_costs` (editable in Admin) on the server. The UI shows **cost, balance and balance after** before you generate.
- The server reserves the coins first (atomic, locked per user), runs the AI call, and **returns the coins if anything fails**. If an integration key is missing, nothing is charged at all.
- Two buckets: **plan coins** (reset each monthly cycle, no rollover) and **purchased coins** (never expire). Plan coins are used first.
- Every change is a row in `coin_ledger` (append-only), including expiry, renewal, purchases, refunds and admin adjustments.

## 6. Project map

```
supabase/migrations/001_init.sql   schema, RLS, wallet functions, seed plans/costs/packs
src/lib/                           tools, prompts, AI clients, wallet, stripe, i18n, catalog
src/app/api/                       generate, generations, calendar, brands, stripe/*, account
src/app/(marketing)/               landing, pricing, contact, legal
src/app/(auth)/                    login, signup, forgot/reset password
src/app/dashboard/                 overview, tools/[tool], saved, calendar, brands, coins, billing, settings (shown as "Profile")
scripts/test-integration.mjs       wallet + isolation tests
```

## 7. Known limits and decisions

- **Languages:** the interface has English, Portuguese, Spanish and French. ES/FR cover the shared UI (navigation, pricing, login, dashboard, tools). The newer screens (Results, Insights, Connections, Profile) and the legal pages have EN/PT text only and show English in ES/FR. The Terms page is English only.
- **Motion:** animated background (drifting glow, moving grid, particles), animated headline letters, button light sweep and scroll reveal. All CSS-only and disabled automatically for users who prefer reduced motion.
- **Theme:** dark futuristic theme is the default; users can switch to light in the header or Profile.

- Evolution features were verified only by `npm run test:unit` (insights engine and token encryption, 15 checks). The full app has not been compiled or run, and the integration tests (including the new posts/social isolation test) have not been run.

- Price changes apply to new checkouts; existing subscribers keep their price. Plan changes create a new ad-hoc Stripe price/product for the subscriber.
- Subscription currency cannot be switched in place (cancel and re-subscribe).
- Plan coins renew monthly (aligned with the Stripe period for monthly plans; on the monthly anniversary for yearly plans).
- Free-plan history keeps the last 20 non-favorite creations (editable).
- AI output is a draft; the site never promises reach, virality or sales.
