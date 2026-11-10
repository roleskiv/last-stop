# LAST STOP: Midnight Line. Integration guide

This document is for the platform or operator team that connects the game to a real wallet.

## Architecture

```
 Browser (game client)                     Game server (RGS)                 Operator platform
 ---------------------                     -----------------                 -----------------
 src/client                                src/server/http.ts
   Controller  -- POST /api/play -->         GameService  -- transact -->     Wallet API
   Presenter   <-- round record ---            Engine + RNG                   Player auth
                                               Round store (hash chain)       Back office
```

- The **client decides nothing**. It sends a bet, receives a finished round record and plays it
  back. It holds no math tables beyond the public paytable sent by the server.
- `GameService` (`src/server/service.ts`) is the authority. It is transport-free: `http.ts` is a
  thin adapter, and the same class runs inside the browser for the offline demo
  (`src/client/net/localClient.ts`). Real-money play always uses the remote path.

## What you replace

| Port | Reference implementation | In production |
|---|---|---|
| `Wallet` (`src/server/wallet.ts`) | `DemoWallet`, play money | Adapter to your wallet API. `transact` must be atomic and idempotent on `txId`. Throw `WalletDeclined` when the stake is refused. |
| `KeyValue` store | `FileKeyValue`, one JSON file | Your database. Keys are `rounds:<mathId>:<playerId>`. |
| `authenticate` (`HttpOptions`) | token is the player id | Validate your signed launch token and return the player id. |
| `Rng` (`src/math/rng.ts`) | `CryptoRng` (platform CSPRNG) | Usually the platform's certified RNG service. Only `below(n)` is required. |
| `OperatorConfig` (`src/shared/operator.ts`) | profiles `demo`, `eu`, `uk` | Your per-market configuration. |

The reference server is a single process with an in-memory session map. A production deployment
needs shared session storage or sticky sessions, TLS, rate limiting and your own monitoring;
those are platform concerns and are deliberately not reimplemented here.

## HTTP API

All calls are `POST` with a JSON body. All amounts are integers in minor units (cents).

| Endpoint | Body | Response |
|---|---|---|
| `/api/session` | `{ token }` | `SessionResponse`: session id, balance, operator config, public game info, pending round |
| `/api/play` | `{ sessionId, requestId, bet, mode }` (`mode` is `spin` or `buy`) | `PlayResponse`: round envelope and session statistics |
| `/api/ack` | `{ sessionId, roundId }` | `{ ok: true }` |
| `/api/history` | `{ sessionId, limit }` | newest-first list of round envelopes |
| `GET /api/health` | | `{ ok: true }` |

Errors are `{ error: { code, message } }` with these codes and statuses: `INVALID_REQUEST` 400,
`INVALID_BET` 400, `SESSION_NOT_FOUND` 401, `INSUFFICIENT_FUNDS` 402, `FEATURE_DISABLED` 403,
`ROUND_NOT_FOUND` 404, `TOO_FAST` 429, `WALLET_ERROR` 502. Types are in `src/shared/protocol.ts`.

Launch the client against a server with `index.html?rgs=<server base url>&token=<launch token>`.

## Money safety

The service gives these guarantees, each covered by a test in `tests/service.test.ts`:

1. **Write ahead.** The outcome is stored before the wallet is called. The wallet transaction id
   is `round:<roundId>`.
2. **Idempotent play.** The client sends a `requestId`. Sending it again returns the same round
   and never charges twice. The id is stored with the round, so this survives a server restart.
3. **Lost wallet answer.** If the wallet call fails without a clear decline, the round stays
   stored as unsettled and is settled (same `txId`) on the next play or session open before
   anything else happens.
4. **Declined stake.** If the wallet declines, the round is removed and nothing is charged.
5. **Interrupted game.** A round the player has not seen to the end is returned as
   `pendingRound` when a session opens, and the client plays it before anything else.
6. **One round at a time** per session, even when requests arrive concurrently.
7. **Tamper evidence.** Each round carries a SHA-256 hash over the previous round's hash and its
   own content. `verifyChain` finds the first altered or reordered round.
8. **Exact amounts.** Wins are `coins x bet / 20`. The service refuses to start with a bet list
   that is not made of multiples of 20 minor units.

One debit and one credit are sent in a single `transact` call. If your wallet needs separate
debit and credit calls, or a bonus round kept open across calls, implement that inside your
`Wallet` adapter using the same `roundId`.

## Operator configuration

`OperatorConfig` is enforced on the server and mirrored by the client UI. A client cannot
re-enable something the server has switched off.

| Setting | Purpose |
|---|---|
| `mathId` | RTP variant: `LS2-96`, `LS2-94`, `LS2-92` |
| `currency`, `currencyDecimals` | display only; the engine is currency free |
| `bets`, `defaultBet` | allowed stakes in minor units |
| `features.buy` | Express Ticket bonus buy |
| `features.autoplay`, `autoplay.*` | autoplay, spin counts, mandatory loss limit, stop on bonus |
| `features.turbo`, `features.skip` | faster animation and slam stop |
| `minSpinMs` | minimum game cycle, enforced on the server |
| `realityCheckMinutes` | interval of the reality check dialog |
| `showNetPosition`, `showClock` | session net position, time of day and session time |

The `uk` profile is an example of a strict market: no bonus buy, no autoplay, no turbo, no slam
stop, 2.5 second minimum cycle, 5.00 maximum stake, net position and session time always shown.
Treat the profiles as starting points. Your compliance team owns the final settings.

## Running it

```
npm ci
npm run build          # client into dist/
npm run server         # reference RGS on :8787, serves dist/ as well
PROFILE=uk PORT=9000 DATA_DIR=/var/lib/laststop ALLOW_ORIGIN=https://games.example npm run server
```

`index.html?profile=eu` runs the offline demo with that profile. `?seed=<text>` makes the
offline demo repeatable for QA; the parameter does nothing against a real server.
