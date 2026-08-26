# Cova

Minimal film reviewing app for `cova.quest`, built for Vercel with Next.js.

## Stack

- Next.js App Router on Vercel
- Supabase Auth for Google, email/password, and password resets
- Supabase Postgres for profiles, follows, movies, ratings, watchlists, reviews, likes, and card presets
- TMDB through `/api/tmdb/search` so `TMDB_API_KEY` stays server-side
- SVG share cards generated from fixed templates in `lib/cards.ts`

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local`
3. Add Supabase and TMDB credentials
4. Run the SQL in `supabase/schema.sql`
5. Run `supabase/20260614_real_app_migration.sql` if the old schema was already applied
6. `npm run dev`

`supabase/schema.sql` is repeatable. Run it again after pulling onboarding changes so `profiles.username` can be empty until the user chooses one and `profiles.onboarded_at` exists.

## Supabase Google Auth

If Google sign-in shows `Unsupported provider: provider is not enabled`, enable it in Supabase:

1. Supabase Dashboard → Authentication → Providers → Google → Enable
2. Add the Google OAuth client ID and client secret
3. Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://cova.quest/auth/callback`

The app route `/auth/google` already redirects to Supabase with `provider=google`.

If Google returns to `localhost:3000` after granting permission on the deployed site:

1. In Vercel, set `NEXT_PUBLIC_SITE_URL` to your real domain, for example `https://cova.quest`
2. In Supabase Dashboard → Authentication → URL Configuration:
   - Set **Site URL** to `https://cova.quest`
   - Add **Redirect URL** `https://cova.quest/auth/callback`
   - Keep `http://localhost:3000/auth/callback` only for local development
3. In Google Cloud OAuth client, add Authorized redirect URI:
   - `https://jhpmslnoaarvhvvmxnxg.supabase.co/auth/v1/callback`

## Razorpay subscriptions

Cova has one monthly paid plan, selected server-side by region:

- India: `₹150 / month` (`15000` paise), using `RAZORPAY_PLAN_INR`.
- Rest of world: `$2.39 / month` (`239` cents), using `RAZORPAY_PLAN_USD`.

The browser never submits a plan ID, amount, or currency. `/api/billing/subscribe` determines the region on the server using an account's verified country, then trusted deployment country headers, then the user's billing-country selection. `/api/billing/webhook` is the source of truth for entitlement state. Use `hasActiveSubscription(userId)` from `lib/billing/subscription.ts` in every future paid API route or Server Component; do not rely on the billing UI alone.

### Required environment variables

Add these to `.env.local` locally and the corresponding deployment environment. Keep all values server-only except the Key ID that `/api/billing/subscribe` returns to Razorpay Checkout for the current user.

```bash
SUPABASE_SERVICE_ROLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_INR=
RAZORPAY_PLAN_USD=
```

`SUPABASE_SERVICE_ROLE_KEY` is required only on the server so the verified webhook can update protected subscription records. Never expose it, `RAZORPAY_KEY_SECRET`, or `RAZORPAY_WEBHOOK_SECRET` in `NEXT_PUBLIC_*` variables.

### Database migration

Run this in the Supabase SQL Editor against the same project used by the deployment:

```sql
-- supabase/20260827_billing.sql
```

For a brand-new database, `supabase/schema.sql` already includes the billing tables. The migration adds account country fields, `subscriptions`, and `razorpay_webhook_events` to an existing database. The webhook-event table uses Razorpay's event ID for idempotency.

### Create Test Mode plans

1. In Razorpay Dashboard, switch to **Test Mode** and create Test API keys.
2. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to those test credentials in `.env.local`.
3. Run:

```bash
npm run billing:create-plans
```

The script only creates a missing plan; it does not run at app startup or deployment. It prints:

```bash
RAZORPAY_PLAN_INR=plan_...
RAZORPAY_PLAN_USD=plan_...
```

Copy those values into `.env.local` and your Test Mode deployment variables. The plans are monthly and use exactly `15000 INR` subunits and `239 USD` subunits.

### Webhook setup

In the Razorpay Dashboard's **Test Mode** webhook settings, add:

```text
https://cova.bloho.space/api/billing/webhook
```

Use the equivalent `https://<your NEXT_PUBLIC_SITE_URL host>/api/billing/webhook` for another deployment. Set the webhook secret to a new random value and copy that exact value to `RAZORPAY_WEBHOOK_SECRET`.

Enable these subscription events:

- `subscription.authenticated`
- `subscription.activated`
- `subscription.charged`
- `subscription.completed`
- `subscription.pending` (failed charge/retry state)
- `subscription.halted`
- `subscription.paused`
- `subscription.resumed`
- `subscription.cancelled`

The endpoint validates the `X-Razorpay-Signature` against the raw request body before any database write and rejects duplicate `X-Razorpay-Event-Id` deliveries. It also protects against an older event overwriting a newer subscription state.

### Test checkout flow

1. Run the billing migration and set the Test Mode variables above.
2. Start the app, sign in, then open `/billing`.
3. Confirm the displayed regional price and choose a billing country only when no verified account country or trusted deployment location is available.
4. Select **Subscribe**. The server creates or safely reuses one Razorpay Subscription and opens Razorpay Checkout with its subscription ID.
5. Complete the Test Mode authorisation flow. The browser sends the returned payment/subscription signature to `/api/billing/verify`; the server verifies it but does not grant access from the browser callback.
6. Confirm that the configured Razorpay webhook reaches `/api/billing/webhook`. Once Razorpay sends `subscription.authenticated` or `subscription.activated`, the subscription is entitled. The billing page refreshes to show its status and renewal date.
7. Select **Cancel at period end** to request a cycle-end cancellation. Access remains until Razorpay reports the end of the paid period.

To move to Live Mode deliberately, create the two plans again with Live Mode keys (or create them in the Live Dashboard), then replace only `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_INR`, `RAZORPAY_PLAN_USD`, and the Live webhook secret in the production environment. Configure the same production webhook URL under Live Mode. Nothing in this repository switches Razorpay from Test Mode to Live Mode automatically.
