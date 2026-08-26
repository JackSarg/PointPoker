# PointPoker

PointPoker is a real-time planning-poker app for agile refinement sessions. It combines private first votes and shared story context with a lightweight multiplayer-game feel.

## Features

- Named rooms with six-character codes and shareable `/room/:code` links
- Nicknames and 30 character choices; no account required
- Resumable room seats stored locally in the participant's browser
- Fibonacci cards `0, 1, 2, 3, 5, 8, 13, 21, 34, ∞`, plus coffee/AFK
- Hidden estimates, confidence levels and host-controlled reveal
- Ready/question checks and no-limit, 30-second, one-, three-, five- or eight-minute rounds
- Quick-vote mode or optional Jira-style story context
- Paste-friendly acceptance-criteria cleanup
- Average, mode, spread, confidence and vote distribution
- Host-selected winning estimates, poker-chip rewards and a session leaderboard
- Host transfer, room history, share links and Jira-friendly clipboard summaries
- Full emoji picker, recent reactions and targeted table reactions
- Dark/light themes and responsive desktop/mobile layouts
- Public privacy notice and terms of use
- Automatic deletion of inactive rooms after seven days

## Architecture

The browser is a React 19 single-page application built with Vite. A Cloudflare Worker validates and routes API traffic. Each room maps to one SQLite-backed Durable Object, which serialises room changes, persists state and accepts hibernatable WebSockets.

Room-scoped player tokens are stored in browser `localStorage`. They are sent in an authentication message immediately after the encrypted WebSocket opens, never in the URL or handshake headers, and are removed from every public room response. Unrevealed votes are only sent to the participant who cast them. Completed history exposes the story and final estimate, not individual historical votes.

The app has no advertising, analytics or third-party font requests.

## Security controls

- Same-origin validation for browser API and WebSocket requests
- Cloudflare request-rate bindings plus per-socket message throttling
- Strict room-code, route, method, JSON type and request-size validation
- A maximum of 30 participants per room
- Unicode control/format-character removal and server-side length limits
- CSP, clickjacking, MIME-sniffing, referrer, permissions and cross-origin headers
- Reproducible dependency versions, a lockfile, Dependabot and CI auditing
- Private vulnerability-reporting guidance in [SECURITY.md](SECURITY.md)

`npm audit` currently reports no known vulnerabilities.

## Local development

Use Node.js 20.19 or newer; Node 22 is recommended.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. The Cloudflare Vite plugin runs the Worker, Durable Object, rate-limit simulations, static app and local persistence together.

Run the release checks:

```bash
npm run check
npm run test:integration
npm audit
```

The integration suite expects the development server at `http://localhost:5173`. Override it with `POINTPOKER_URL` when testing another environment.

## Deploy to Cloudflare Workers

SQLite-backed Durable Objects and Workers Static Assets are supported on the Workers Free plan. Current free allowances and limits can change, so review the official [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) and [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) before launch.

### Git-connected deployment

1. In Cloudflare, open **Workers & Pages**, select **Create application**, then choose **Import a repository**.
2. Connect GitHub and select `JackSarg/PointPoker`.
3. Keep the production branch as `main` and the root directory blank (the repository root).
4. Use `npm run build` as the build command and `npx wrangler deploy` as the deploy command.
5. Name the Worker `pointpoker` so it matches `wrangler.jsonc`, then select **Save and Deploy**.
6. Test the generated `*.workers.dev` address.

Cloudflare installs dependencies automatically for Workers Builds. The checked-in `.node-version` selects Node.js 22.

### Add `poker.jacksarg.com`

The `jacksarg.com` DNS zone must be active in the same Cloudflare account. Remove any conflicting DNS record already using the `poker` hostname. Open the `pointpoker` Worker, go to **Settings > Domains & Routes > Add > Custom Domain**, enter `poker.jacksarg.com`, and select **Add Custom Domain**. Cloudflare creates the DNS record and TLS certificate.

### Manual deployment fallback

Install dependencies with `npm ci`, run `npm run check` and `npm run test:integration`, authenticate with `npx wrangler login`, then run `npm run deploy`.

Wrangler creates the `PokerRoom` SQLite Durable Object namespace from the `v1` migration and deploys the Worker and static assets together. Security headers are defined in `public/_headers`.

## Privacy and legal launch checklist

The in-app `/privacy` and `/terms` pages document current behaviour, including browser storage, room content, Cloudflare processing and data-subject rights. They are practical templates, not a substitute for advice from a qualified lawyer.

Before making the service public:

- Confirm Jack Sarg is the correct data-controller name and that `jacksarg.com` provides a working privacy contact route.
- Seven-day inactivity deletion is enforced by Durable Object alarms. Room activity renews the deadline, and connected rooms are not deleted while participants are active.
- Review the Cloudflare account's data-processing, log-retention and international-transfer settings.
- Enable GitHub private vulnerability reporting after the repository is created.
- Re-check the footer links, privacy text and terms against the final production domain and actual service behaviour.
- Avoid placing confidential, customer, special-category or production Jira data in rooms.

No cookie banner is included because the app currently uses no advertising or analytics storage. Browser storage is limited to a room access key and user-selected theme/recent reactions, and is disclosed at collection time. Reassess consent if analytics, marketing, embedded media or other non-essential storage is added.

## GitHub

The repository includes read-only GitHub Actions permissions, CI checks, weekly Dependabot updates, EditorConfig, Node version metadata and a security policy. No open-source licence has been selected; publishing the repository does not by itself grant permission to reuse the code. Add the licence you want before accepting outside contributions.

## Product rationale

The Scrum Guide treats refinement as ongoing work to add description, order and size to Product Backlog items, with Developers responsible for sizing. PointPoker therefore keeps estimates independent until reveal, separates uncertainty from size, surfaces disagreement, and leaves the final estimate as an explicit team decision rather than treating the average as an automatic answer.
