# Supabase Secrets Registry

Last updated: 2026-04-15

**NEVER store secret values in this file.** Names and purposes only.

## Production Secrets

| Secret Name | Purpose | Used By | Where to Find |
|-------------|---------|---------|---------------|
| SUPABASE_URL | Project URL (auto-injected) | All edge functions | Supabase Dashboard → Settings → API |
| SUPABASE_ANON_KEY | Public anon key (auto-injected) | All edge functions | Supabase Dashboard → Settings → API |
| SUPABASE_SERVICE_ROLE_KEY | Admin key (auto-injected) | All edge functions | Supabase Dashboard → Settings → API |
| SUPABASE_DB_URL | Direct database connection | — | Supabase Dashboard → Settings → Database |
| BRIDGE_SERVICE_ROLE_JWT | Legacy JWT for pg_cron jobs | Cron triggers (vault lookup) | Generated from project JWT secret |
| RESEND_API_KEY | Email delivery via Resend | notify-report, email-signup (local) | Resend Dashboard → API Keys |
| REVIEWER_PASSWORD | App Store reviewer access code | validate-reviewer-access | Set during App Store submission |
| REVIEWER_AUTH_PASSWORD | Supabase auth password for reviewer | validate-reviewer-access | Set during App Store submission |
| TWILIO_ACCOUNT_SID | SMS sending account | send-sms.ts (shared) | Twilio Console |
| TWILIO_AUTH_TOKEN | SMS authentication | send-sms.ts (shared) | Twilio Console |
| TWILIO_FROM_NUMBER | SMS sender phone number | send-sms.ts (shared) | Twilio Console |

## Local Development

For local `supabase functions serve`, secrets are provided via env files:

| File | Contents | Gitignored? |
|------|----------|:-----------:|
| `supabase/.env.local` | `RESEND_API_KEY=re_...` | Yes |

Auto-injected by local Supabase (no config needed):
- `SUPABASE_URL` = `http://127.0.0.1:54321`
- `SUPABASE_ANON_KEY` = local demo anon key
- `SUPABASE_SERVICE_ROLE_KEY` = local demo service role key

## Vault (Production Cron Jobs)

Cron jobs read secrets from `vault.decrypted_secrets` instead of environment variables. This was fixed in migrations `20260403000001` and `20260403000002`.

The vault entry for `service_role_key` must be kept in sync with `BRIDGE_SERVICE_ROLE_JWT`:
```bash
# If keys are rotated, update BOTH:
supabase secrets set BRIDGE_SERVICE_ROLE_JWT=<new_jwt>
# AND update the vault entry via SQL (requires supabase-exec.sh)
```

## Commands

```bash
# List all secrets (shows names + hashed values)
supabase secrets list

# Set a new secret
supabase secrets set KEY_NAME=value

# Unset a secret
supabase secrets unset KEY_NAME
```
