# Eudaimonia Operations Runbook

Operator procedures for the two highest-risk seams in the donation pipeline: the
Stripe Crypto Onramp **webhook settlement path** and the on-chain
**TransparentDonationRouter**. Every symbol named below is real — file, function,
and KV key references match the code as shipped. Do not invent APIs that this
runbook does not list.

Cross-references:

- Contract deploy / configuration: [`contracts/DEPLOY.md`](../contracts/DEPLOY.md)
- Router source: [`contracts/src/TransparentDonationRouter.sol`](../contracts/src/TransparentDonationRouter.sol)
- Backlog: session-recovery durability is backlog item **E3.1**.

---

## 1. On-ramp webhook failure triage

The webhook is the system's settlement-auth boundary. Stripe Crypto Onramp emits
a single topic — `crypto.onramp_session.updated` — and the handler advances a
session toward the terminal `settled` / `failed` states. A failed or missed
webhook leaves a donation session stuck non-terminal (the donor's status poll
never resolves) and, in the worst case, drops an on-chain settlement.

### Key code paths

| Concern | Location | Symbol |
|---|---|---|
| HTTP transport + signature verify | `src/app/api/onramp/webhook/route.ts` | `handleOnrampWebhook`, `POST` |
| Pure state machine | `src/lib/onramp/webhook-handler.ts` | `applyOnrampSessionEvent` |
| Replay idempotency log | `src/lib/onramp/webhook-handler.ts` | `ProcessedEventLog` (`claim` / `release` / `has`) |
| Session persistence | `src/lib/onramp/session-store.ts` | `SessionStore` (`get` / `update` / `put`) |
| KV backing selection | `src/lib/onramp/onramp-kv.ts` | `onrampKvStore`, `onrampSessionStore`, `shouldUseVercelKv` |

### KV key namespaces

| Prefix | Constant | TTL | Holds |
|---|---|---|---|
| `evt:<event.id>` | `EVENT_PREFIX` + `PROCESSED_EVENT_TTL_SECONDS` (7 days) | processed-event markers |
| `sess:<sessionId>` | `SESSION_PREFIX` + `SESSION_TTL_SECONDS` (7 days) | on-ramp session records |
| `idem:<key>` | `IDEMPOTENCY_PREFIX` (create-side, see note) | donor retry → session map |

Production backs all of these with `@vercel/kv` (Upstash Redis) when
`KV_REST_API_URL` and `KV_REST_API_TOKEN` are set; otherwise the bounded
in-memory store (`createInMemoryKvStore`) is used. `shouldUseVercelKv()` decides.
A missing-KV-config production deploy silently uses per-instance memory — sessions
minted on one lambda are then invisible to the webhook on another (the M2 gap that
durability closed). **Confirm KV env vars are set before triaging anything else.**

### 1.1 Detect a failed or missed webhook

1. **Application logs.** Look for the structured logger scope `onramp/webhook`.
   Two distinct failure lines exist:
   - `"signature verification failed"` — the route returned **400**. Stripe will
     NOT retry a 400; the event is dropped. Cause is almost always a wrong
     `STRIPE_ONRAMP_WEBHOOK_SECRET` or a proxy mangling the raw body.
   - `"event handling failed"` — the route returned **500**. Stripe WILL retry
     (at-least-once delivery). This is the safe failure mode.
2. **Stripe Dashboard → Developers → Webhooks.** Inspect the endpoint's recent
   deliveries. A high retry/attempt count or "Failed" deliveries indicate the
   route is returning non-2xx. Note the `event.id` of any stuck delivery.
3. **Stuck session symptom.** A donor reports the status page spinning forever.
   Read the session (see 1.3): a record whose `status` is still `pending` well
   past the expected Base settlement window (minutes) means the terminal event
   never applied.

### 1.2 How event replay works (idempotency keys)

The handler is idempotent by `event.id`, enforced by `ProcessedEventLog` over the
`evt:<event.id>` key:

1. On entry, `applyOnrampSessionEvent` calls `processedEvents.claim(event.id)` —
   an atomic `setNx` (Redis `SET … NX`). The **first** delivery wins the claim and
   processes; a replay or concurrent duplicate loses the claim and **no-ops**.
   This closes the has()+add() TOCTOU under duplicate delivery.
2. If applying the event throws mid-flight (e.g. transient KV error, or a
   `fulfillment_complete` event that arrived without a `transaction_id`), the
   `catch` calls `processedEvents.release(event.id)` and rethrows. The route then
   returns 500, Stripe retries, and the **released** claim lets the retry
   re-apply rather than no-op on a stale marker.
3. Terminal states are absorbing: once a session is `settled` or `failed`,
   `applyOnrampSessionEvent` returns early and no later event downgrades it.

**To safely replay a stuck event:**

1. In the Stripe Dashboard, open the event and use **Resend** (or resend via the
   API). Because the handler claims by `event.id`, resending an event that was
   already fully applied is a guaranteed no-op — safe to do liberally.
2. If a prior attempt failed at the `evt:` claim stage and you suspect a **stale
   claim** is blocking re-application (rare — only happens if the process died
   between `claim` and `release`), delete the marker so the next delivery
   re-applies:
   ```bash
   # Vercel KV / Upstash Redis CLI — replace <event.id> with the Stripe event id
   DEL evt:<event.id>
   ```
   Then **Resend** the event from Stripe. The marker self-expires after
   `PROCESSED_EVENT_TTL_SECONDS` (7 days) regardless.

### 1.3 Recover a donation session from the KV store

Sessions live under `sess:<sessionId>` and are read/written through
`onrampSessionStore()` (a `SessionStore` over `onrampKvStore()`). The webhook
**never fabricates** a session — if `applyOnrampSessionEvent` reads
`store.get(id)` and finds nothing, it releases the claim and drops the event
(handler lines ~157–165). So recovery requires the session record to exist.

1. **Inspect the record directly in KV** (read-only first):
   ```bash
   # Vercel KV / Upstash Redis CLI
   GET sess:<sessionId>
   ```
   The value is a JSON `OnrampSession`. Confirm its `id`, `status`, and (when
   settled) `txHash`.
2. **If the record is missing** (`null`): the session was never persisted on the
   instance that served `POST /api/onramp/session`, or it expired
   (`SESSION_TTL_SECONDS`, 7 days). This is the classic per-instance-memory
   symptom — verify KV env vars (1.0) and confirm `shouldUseVercelKv()` is
   returning `true` in production. A session that was never durably written
   cannot be recovered; the donor must re-initiate. This is the dependency
   tracked by backlog item **E3.1**.
3. **If the record exists but is stuck `pending`** and Stripe shows the session as
   `fulfillment_complete`: replay the settlement event (1.2). The handler will
   call `store.update(id, { status: "settled", txHash })`, which performs an
   immutable merge (`{ ...existing, ...patch, id: existing.id }`) and re-persists
   with a fresh TTL.
4. **Never hand-edit a `sess:` record to mark it `settled` without a real
   `transaction_id`.** The handler deliberately throws on a hash-less settlement;
   a manually settled, hash-less record is permanent (terminal is absorbing) and
   breaks the transparency receipt. Always recover by replaying the real event.

> **Create-side note (adjacent, not core to replay):** donor retries of
> `POST /api/onramp/session` are deduped by `IdempotencyIndex` over `idem:<key>`,
> keyed on the `x-client-request-id` header (`CLIENT_REQUEST_ID_HEADER`). A
> reserve→commit two-phase entry prevents a second billable Stripe session. This
> is separate from webhook `evt:` replay; mention it only if a donor reports a
> double charge.

---

## 2. Router pause / emergency procedure

> **There is no `pause()` function and no OpenZeppelin `Pausable` on this
> contract.** `TransparentDonationRouter` is declared `ReentrancyGuard, Ownable`
> only, and `donate()` has no `whenNotPaused` modifier. Do not look for a kill
> switch that does not exist. The **effective circuit breaker is owner-controlled
> allowlist revocation** — and that is what this procedure documents.

### When to invoke

- A previously vetted Endaoment org Entity is found to be compromised, malicious,
  or no longer the correct on-chain recipient.
- Evidence of abuse routed through a specific org.
- A precautionary full stop is needed pending investigation.

### Who can do it

The router **owner** only. Per [`contracts/DEPLOY.md`](../contracts/DEPLOY.md)
§Environment (`OWNER_ADDRESS`), the owner **must be a multisig in production**
(security review M4). All emergency actions below are executed from that multisig.
`setOrgAllowed` is `onlyOwner`; a non-owner call reverts.

### Mechanism (how the lever works)

`donate()` checks `if (!allowedOrgs[endaomentOrg]) revert OrgNotAllowed(endaomentOrg);`
**before any funds move** — after the zero-address check, before the
`amount == 0` check, before any USDC transfer. Revoking an org therefore stops new
donations to it cleanly: no partial transfers, no fee skim, nothing forwarded.

### 2.1 Revoke a single compromised org

1. From the owner multisig, call:
   ```solidity
   router.setOrgAllowed(<compromisedOrg>, false);
   ```
2. The call emits `OrgAllowanceUpdated(<compromisedOrg>, false)` — an on-chain
   audit trail of the revocation.
3. Verify on Basescan that `allowedOrgs(<compromisedOrg>)` now returns `false`.
   Any subsequent `donate()` to that org reverts with `OrgNotAllowed(org)` before
   funds move.

### 2.2 Full stop (no single-call kill switch)

There is no one-call halt. To stop **all** routing, revoke **every** allowlisted
org individually:

1. Enumerate the currently-allowed orgs from the `OrgAllowanceUpdated` event
   history on Basescan (filter for the most recent `allowed = true` per org with
   no later `false`).
2. From the owner multisig, batch (or sequentially submit) `setOrgAllowed(org, false)`
   for each.
3. With the allowlist empty, every `donate()` reverts with `OrgNotAllowed` — the
   same effective state as a freshly deployed router (see
   [`contracts/DEPLOY.md`](../contracts/DEPLOY.md) §3, which notes a fresh router
   reverts every donation until orgs are allowlisted).

### 2.3 Detection signals

- A spike in reverted `donate()` transactions failing with `OrgNotAllowed(org)`.
- Unexpected `OrgAllowanceUpdated(org, false)` events not initiated by a known
  operator (investigate owner-key compromise immediately).

### 2.4 Recovery path

1. After the org is re-vetted (resolve and confirm its real Endaoment Entity
   address and that its on-chain `baseToken()` is canonical Base USDC — see
   [`contracts/DEPLOY.md`](../contracts/DEPLOY.md) §3), from the owner multisig
   call:
   ```solidity
   router.setOrgAllowed(<org>, true);
   ```
2. This re-emits `OrgAllowanceUpdated(<org>, true)`; donations to that org resume.
3. **Immutable parameters cannot be rotated in place.** `usdc` and `treasury` are
   `immutable` (set once in the constructor). If the treasury or USDC binding is
   the thing compromised, allowlist revocation does **not** fix it — the only
   path is **redeploy** a new router and re-point the frontend env vars
   (`NEXT_PUBLIC_ROUTER_ADDRESS_BASE` / `..._BASE_SEPOLIA`) per
   [`contracts/DEPLOY.md`](../contracts/DEPLOY.md) §2 and §4.

### Known gap (backlog)

The router has no native pause. A future router version should consider adding
OpenZeppelin `Pausable` with a `whenNotPaused` modifier on `donate()` to provide a
single-call global halt rather than per-org allowlist revocation. Track alongside
the M4 multisig-owner hardening.
