# Dodo Payments setup

1. In Dodo Payments, create two monthly subscription products for Cova Pro:
   - India: INR 99 per month
   - Global: USD 1.99 per month
2. Add the returned product ids to the deployment environment:
   - `DODO_PAYMENTS_PRODUCT_INR=pdt_...`
   - `DODO_PAYMENTS_PRODUCT_USD=pdt_...`
3. Add a server-only API key and select the environment:
   - `DODO_PAYMENTS_API_KEY=dodo_test_...` for testing, then a live key for production
   - `DODO_PAYMENTS_ENVIRONMENT=test_mode` or `live_mode`
4. Create the `WELCOME50` discount in Dodo as a 50% percentage discount. Configure it for one subscription cycle. Cova sends this code only for an account with no paid Cova subscription history.
5. Create a webhook with the production endpoint `https://cova.lol/api/billing/webhook`, subscribe it to the `subscription.*` events, and set `DODO_PAYMENTS_WEBHOOK_KEY` to its signing secret.
6. Apply `supabase/20260909_dodo_payments.sql` before deploying the app. It preserves existing subscription rows as `legacy` while making new subscriptions provider-neutral.
7. Test the complete checkout in Dodo test mode. The return redirect is only a navigation step; Pro access updates after the signed webhook is accepted.

Remove the old Razorpay secrets and webhook after the Dodo test checkout and webhook both succeed. Rotate any Razorpay secret that has been exposed outside its original secret store.
