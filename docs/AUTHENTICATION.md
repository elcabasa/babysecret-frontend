# Authentication

The storefront runs its own account lifecycle with NextAuth (Auth.js) v5, backed by **WooCommerce customer records** created through the REST v3 API. Sessions use JWT strategy.

Key modules:

- `src/auth.ts` — NextAuth config: Credentials provider, Google provider, JWT/session/signIn callbacks
- `src/lib/woocommerce-auth.ts` — WooCommerce REST auth helpers (authenticate, create/update customer, email-verified meta)
- `src/lib/auth.actions.ts` — server actions: `loginAction`, `googleAction`, `logoutAction`
- `src/lib/otp-store.ts` / `src/lib/reset-token-store.ts` — OTP / reset-token storage persisted in WooCommerce customer meta
- `src/lib/email.ts` — transaction emails via Brevo
- `src/app/api/account/*` — register, verify-email, resend-otp, forgot-password, reset-password
- `src/components/auth/*` — forms (login, register, forgot, reset, verify-email) and Google button

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | yes | JWT signing secret |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | for Google | Google OAuth app |
| `NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED` | no | `"true"` renders the Google button |
| `NEXT_PUBLIC_APP_URL` | no | Base URL for emailed reset links |
| `AUTH_TRUST_HOST` | for non-Vercel | Lets NextAuth trust the host (`trustHost: true` is set in `src/auth.ts`; Vercel auto-sets it) |
| `BREVO_API_KEY` / `SMTP_FROM` | for email | OTP/reset delivery via Brevo |
| `WOOCOMMERCE_REST_URL` + consumer key/secret | yes | Customer CRUD + auth |

## Sign-up flow (email + password)

1. `POST /api/account/register` validates `firstName`, `lastName`, `email`, `password`, `phone`.
2. If the email already exists: `409` (with `code: "GOOGLE_ACCOUNT"` if the account is Google-created).
3. Otherwise it creates the WooCommerce customer:

   ```json
   {
     "email": "...",
     "username": "<email>",
     "password": "...",
     "first_name": "...",
     "last_name": "...",
     "billing": { "email": "...", "first_name": "...", "last_name": "...", "phone": "..." },
     "shipping": { "first_name": "...", "last_name": "..." },
     "meta_data": [
       { "key": "auth_provider", "value": "password" },
       { "key": "email_verified", "value": "false" }
     ]
   }
   ```

4. A 6-digit OTP is generated, persisted on the customer (10-minute TTL), and emailed — an email-delivery failure does not fail registration (the code can be re-sent later). The client redirects to `/verify-email?email=…`.
5. `POST /api/account/verify-email` verifies the code against the persisted meta and flips `email_verified` to `true` on the customer. `/api/account/resend-otp` writes a fresh code to the meta and re-emails it.

> **Storage note:** OTP codes and reset tokens are stored as WooCommerce customer meta (`babysecret_otp_code` / `babysecret_otp_expires` and `babysecret_reset_token` / `babysecret_reset_expires`). The keys are deliberately **not** underscore-prefixed because the WooCommerce REST API rejects loading private (`_`-prefixed) meta. This makes the flow survive multiple server instances (Vercel) and restarts.

## Sign-in flow

- **Credentials:** `loginAction` authenticates against WooCommerce (JWT auth endpoint) and reads the customer meta.
  - If the email is **not verified**, the user is redirected to `/verify-email`. Accounts created before email verification existed (no `email_verified` meta) are treated as **verified**, so existing storefront customers can sign in immediately.
  - If the customer is **Google-created** (`auth_provider = google`), the action returns the inline alert *"This account uses Google Sign-In. Please log in using the Google button."*
  - The WooCommerce auth layer (`src/lib/woocommerce-auth.ts`) logs the **real** JWT endpoint status + error code server-side and classifies failures (`INVALID_CREDENTIALS`, `AUTH_ENDPOINT_NOT_FOUND`, `AUTH_SERVER_ERROR`, `AUTH_NETWORK_ERROR`, `ACCOUNT_NOT_FOUND`) into safe, meaningful messages.
  - On success the session is created and the client is redirected to `/?auth_success=Welcome back!`.
- **Google:** `googleAction` starts the OAuth flow. The `signIn` callback in `src/auth.ts`:
  - Looks up the customer by email. If it does **not** exist, it creates one from the Google profile (`name` split into `first_name`/`last_name`, `email`), with `auth_provider = google`, `email_verified = true`, and a random password.
  - If the customer exists with `auth_provider = password`, it rejects the sign-in (`ACCOUNT_PASSWORD_COLLISION`) so the user signs in with their password instead.

## Forgot / reset password

1. `POST /api/account/forgot-password` mails a tokenized link (`/reset-password?token=…`) if the account exists (it always returns `success` to avoid email enumeration).
2. Tokens are persisted on the customer for 30 minutes (`babysecret_reset_token` / `babysecret_reset_expires`; the token embeds the customer id so a bare token resolves back to the account). `POST /api/account/reset-password` validates and consumes the token, then sets the new WooCommerce customer password.

## Session & header behaviour

- `src/components/layout/account-menu.tsx` renders in the header:
  - **Unauthenticated** → a "Sign in" pill linking to `/login`.
  - **Authenticated** → a profile dropdown showing the user's **first name** (avatar initial + name) with **My Orders**, **My Account**, and **Sign out**.
- The mobile nav shows Sign in / My Account + My Orders and Sign out based on session state.
- `logoutAction` drops the session cookie and redirects to `/login`.
- `/account` and `/orders` are server-guarded: unauthenticated visitors are redirected to `/login`.

## Server actions, not REST for session changes

Login/logout run as server actions (`signIn`/`signOut` from `@/auth`), so the JWT cookie is set/cleared server-side without exposing it to the client bundle.

## Notes / limitations

- OTP and reset tokens persist in WooCommerce customer meta, so codes survive server restarts and multi-instance (Vercel) deployments.
- The JWT sign-in endpoint must be **installed and active on the WordPress store**: `wp-json/jwt-auth/v1/token` (the "JWT Authentication for WP REST API" plugin). This is WordPress configuration, not code — the frontend intentionally reports a clear "sign-in service not available" message when it is missing.
- Customer meta used for auth is stored with plain keys so the WooCommerce REST API returns it (`_`-prefixed meta is private and hidden by the API).
- `trustHost: true` is set in `src/auth.ts`, so the Google OAuth callback URL is derived from the request host. Register the `/api/auth/callback/google` redirect URI in the Google Cloud Console for **each** environment: `http://localhost:3000` (dev), `https://babysecret-frontend-pro9.vercel.app` (test deploy), and the production domain. No Vercel URL is hard-coded.
- The Google provider uses `allowDangerousEmailAccountLinking` deliberately so first-time Google users are linked to WooCommerce customers of the same email, while the `signIn` callback rejects attempts to take over an existing password-protected account (`ACCOUNT_PASSWORD_COLLISION`).
- WooCommerce consumer credentials and Google OAuth secrets are server-only (`WOOCOMMERCE_*`, `AUTH_GOOGLE_*`); they never reach the browser bundle.