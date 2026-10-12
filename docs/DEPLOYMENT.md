# Deployment

Production target:

```text
https://babysecret.com
```

Environment model:

- **Development** — `npm run dev` with `.env.local`; hot reload; never commit secrets.
- **Sandbox** — preview deployment with sandbox Terminal Africa credentials and test-safe mail/OAuth settings.
- **Production** — Vercel production deployment with live WooCommerce, Terminal Africa, Titan SMTP, and Google OAuth settings.

## Production deployment process

1. Push code to GitHub.
2. Configure Vercel **Production** environment variables (see [`ENVIRONMENT.md`](ENVIRONMENT.md)). Do not paste real values anywhere except the Vercel dashboard and local `.env.local`.
3. Redeploy after environment-variable changes — Vercel bakes env vars into the build, so edits have no effect until redeployed.
4. Configure the WooCommerce webhook (`order.updated` → `https://babysecret.com/api/webhooks/woocommerce/order` with the matching `WOOCOMMERCE_WEBHOOK_SECRET`); see [`ORDERS.md`](ORDERS.md).
5. Verify Terminal production URL/key: `TERMINAL_API_BASE=https://api.terminal.africa/v1` with a production `TERMINAL_API_KEY`.
6. Verify Titan SMTP credentials: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, and `EMAIL_FROM` all set.
7. Verify Google OAuth production callback (`https://babysecret.com/api/auth/callback/google`) is registered and `NEXT_PUBLIC_APP_URL=https://babysecret.com`.
8. Test the production domain: catalog, checkout, pickup, Bank Transfer, webhook deliveries, and email arrival.
9. Run controlled production checkout/email testing with clearly marked test orders, and verify admin + customer inboxes receive exactly one copy of each expected message.

## Pre-deploy checklist

- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check` all pass.
- [ ] `git status` shows no secret-bearing files staged.
- [ ] Production and preview environments use their own WooCommerce, Terminal, SMTP, OAuth, and webhook-secret values.
- [ ] No sandbox key is paired with a production base URL (or vice versa).
- [ ] Shipbubble remains out of `ENABLED_SHIPPING_PROVIDERS` unless deliberately re-enabled.
- [ ] Only Bank Transfer is in `ENABLED_PAYMENT_METHODS` unless gateways are deliberately re-enabled.

## Rollback

- Redeploy the previous known-good Vercel deployment from Project → Deployments.
- If a bad environment value shipped, fix the value in Vercel first, then redeploy — code rollback alone does not fix env-var mistakes.
- If a secret was ever committed, rotate it immediately; removing it from git history does not un-expose it.
