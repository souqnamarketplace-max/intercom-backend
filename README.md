# Intercom Platform — Backend API

NestJS + Prisma, built directly against the schema already applied to Supabase
(`lwzkvlttpqqqdelkuxpr`). Every module maps to a decision in `PROJECT.md`.

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL from Supabase, generate a JWT_SECRET,
                        # and an RS256 keypair for VIRTUAL_KEY_PRIVATE_KEY/PUBLIC_KEY

npx prisma generate     # ⚠️ could not be run in the sandbox this was built in —
                         # it downloads a native engine binary from
                         # binaries.prisma.sh, which was outside the sandbox's
                         # network allowlist. Run this yourself locally; it's
                         # a completely standard step and will work fine.

npx ts-node prisma/seed.ts   # creates your first platform_admin login — change
                              # the password immediately after logging in once

npm run start:dev
```

Verified in the sandbox before delivery: `npm install --ignore-scripts`
completed cleanly, and `tsc --noEmit` reported exactly 4 errors, all
pre-existing — the enum imports (`AuditEventType`, `DeviceType`,
`DeviceConnection`, `KeyType`) that `prisma generate` creates, which resolve
themselves the moment you run that command locally. Zero errors in any
hand-written file, including the new Zones/Delivery Authorizations/Partner
API modules.

## What's built

- **Auth**: staff login (JWT, HS256), role guard (`platform_admin` /
  `owner_admin` / `owner_manager` / `owner_staff`)
- **Tenant isolation enforced at the query layer** (`common/tenant-scope.util.ts`)
  — every service checks the resolved resource's `ownerId` against the
  requesting user, not just hiding things in a UI. `platform_admin` bypasses it.
- **Full CRUD** for: owners, sites, entry points, devices, units, zones,
  residents, card fobs, virtual keys, delivery authorizations, site
  integrations
- **Zones**: lightweight grouping *within* a site for delivery/access scoping
  and reporting — units optionally belong to one zone (`units.zoneId`,
  nullable). Distinct from Entry Points, which stay physical-door-only and
  are unaffected by this.
- **Delivery Authorizations**: per-carrier PIN (hashed, same pattern as card
  fobs) with a configurable time window (`{ openAllDay: true }` or
  `{ openAllDay: false, days, from, to }`) — a distinct entity from Virtual
  Keys, since the access pattern (fixed carrier PIN, no per-use expiry) is
  genuinely different.
- **Partner API** (new, reverse-direction integration surface): owners can
  issue scoped API keys (`POST /partner-api-keys`, staff JWT, `owner_admin`+)
  so third parties (Yardi, CCTV/VMS vendors, other access-control platforms)
  can call *into* the platform via `X-API-Key` header at `/partner-api/v1/*`.
  This is the reverse of `SiteIntegration`/`IntegrationAdapter` (us calling
  *out* to their systems) — this is them calling *in* to us.
  - Scopes are granular: `read:audit_events`, `read:residents`,
    `write:residents`, `read:devices`, `read:units` — an owner issues a key
    with only the scopes a given integrator needs.
  - The raw key is shown exactly once, at creation (`POST` response); only
    its SHA-256 hash is ever stored (`partner_api_keys.key_hash`, unique).
  - Every partner-facing service method re-verifies the requested site
    belongs to the calling key's `ownerId` at the query layer — same
    isolation principle as staff/resident auth, not left to the caller.
  - `write:residents` is deliberately narrow — a partner can push contact
    field updates (name/email/phone) for PMS sync, but never touch status,
    access, or lifecycle transitions, which stay under our own control.
- **Resident lifecycle**: create → update → suspend → reactivate → move-out
  (soft delete, cascades to auto-revoke any virtual keys they issued)
- **Card fob lifecycle**: active / suspended / revoked / lost-stolen, hashed
  card IDs (never plaintext), nullable `residentId` for shared/unassigned fobs
- **Virtual Keys**: RS256-signed tokens — private key never leaves the
  backend, panels only ever need the public key to verify offline. A
  `sync/revoked` endpoint lets panels pull the revocation list periodically.
- **Audit trail**: cursor/keyset pagination on `(created_at, id)`, not offset
  — this is the highest-write table in the system

## What's NOT built yet (next steps, not oversights)

- **WebRTC signaling** (the actual call flow) — needs its own Redis-backed
  session/presence layer, per the concurrency decisions in the spec
- **MQTT bridge** to Pi devices (cloud side) and the local broker handshake
- **Push notifications** (APNs/FCM)
- **Device-facing authentication** — right now, a few endpoints meant for
  panels/Pis to call directly (`audit-events` POST, `card-fobs/sync`,
  `virtual-keys/sync/revoked`) are reachable without device-specific auth.
  These need short-lived signed/nonce-based device tokens before any real
  hardware talks to this API — flagged inline in the code with comments,
  not silently left open.
- **Rate limiting / lockouts** on failed PIN/fob attempts and the QR
  web-calling endpoint (both explicitly called for in the security section
  of the spec)
- Billing calculation job (the daily subscription-expiration check)

## Security notes carried over from the spec

- `VIRTUAL_KEY_PRIVATE_KEY` must move to a real secrets manager before
  production — it's an env var here for local development only.
- CORS is wide open (`app.enableCors()` with no options) — restrict this to
  your actual dashboard/app origins before deploying anywhere real.
- Multi-tenant isolation is tested at the code level (every service asserts
  scope) but hasn't been through the third-party penetration test the spec
  recommends before onboarding real customers.
