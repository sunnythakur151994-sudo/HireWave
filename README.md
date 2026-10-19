**NEW v0.4.1: See [AGENTS_README.md](AGENTS_README.md) for the Calling Agent + Messaging Agent (Email/SMS), configuration, consent restrictions, deployment requirements and known limitations.**

# HireWave v0.3.0 — recruitment automation + unified candidate profile

**Automation v0.2**: Recruitment Automation page, one-click source refresh + classification, candidate self-reported availability by secure one-time link, per-channel contact permission capture, individual recruiter-approved email invitations (Resend when configured), and pending HR meeting requests. The previously available connectors, importing, scoring, privacy and dashboard pages remain intact.

**Unified candidate profile v0.3**: Candidate detail pages now show per-field source evidence and last-sync timestamps, grouped work history, education, projects, skills, professional contact and job preferences where the connected API or imported record actually supplies them. Conflicting claims from different sources are kept for HR review rather than overwritten. Repeated runs preserve field history. Candidate-confirmed availability remains separate from unverified platform claims. CSV supports `source_platform`, `source_url`, `source_updated_at` and recruitment-specific columns. See `UNIFIED_PROFILE_GUIDE.md`.

See **AUTOMATION_ROADMAP.md** for the exact list of working features and the missing integrations necessary for full SMS, voice and confirmed calendar automation.

## New setup

- Set `PUBLIC_WEB_URL` to the public frontend URL to create candidate confirmation links.
- For optional individual invitation emails, configure `RESEND_API_KEY` and `RECRUITMENT_FROM_EMAIL` (a verified permitted sending domain). Without these, HR can generate secure links and share them through approved communication channels.
- Visit **Automation** in the left menu, select a job, click **Search & classify**, then generate a candidate-specific confirmation link for profiles with recorded eligibility evidence.
- Recipients open `/availability/<single-use-token>` and select available/unavailable, communication preferences, and optional no-further-contact.
- Confirmed available profiles can be sent to an HR meeting-request queue, which is **not** the same as a confirmed calendar event.
- The company-licence plan type exists as a technical tier for enterprise deployment; a secure license management mechanism must be implemented before going live. It is not a zero-price public offer.

**Important**: The project still contains a local JSON data store and only the documented live source connectors. Email/SMS/call campaigns and actual Google/Outlook bookings cannot be considered production-ready until approved provider integrations, recipient permissions, calendar OAuth and durable background queues are completed.

---

## What is live in this MVP

- Demo Talent Pool — local fictional data.
- Imported Talent Pool — CSV candidates stored in the workspace.
- GitHub — official public API; a workspace token is optional and encrypted locally when supplied.
- LinkedIn, Naukri, Indeed, Glassdoor and ATS connectors are **planned placeholders**, not live scrapers.
- Billing is a development stub controlled by `HIREWAVE_ALLOW_SET_PLAN=1`.
- Storage is a JSON-file MVP. `db/schema.sql` is a production-oriented schema reference; `DATABASE_URL` is not wired yet.
- The job parser is rule-based. `ANTHROPIC_API_KEY` is reserved for future AI enrichment and is not used by this build.

## Requirements

- Node.js 20 or newer (Node 22 recommended)
- npm 10+

## Windows PowerShell

```powershell
cd hirewave-fixed
Copy-Item .env.example .env
notepad .env
npm install
npm run build
npm test
npm run dev
```

Open `http://localhost:5173`.

## macOS / Linux

```bash
cd hirewave-fixed
cp .env.example .env
npm install
npm run build
npm test
npm run dev
```

## First run

1. Create an account. Passwords require at least 8 characters.
2. Open **Plugins** and connect **Demo Talent Pool**.
3. Optionally paste a CSV into **Import talent pool CSV**, import it, then connect **Imported Talent Pool**.
4. Optionally enter a GitHub personal token before connecting GitHub. If omitted, the public unauthenticated GitHub API is used (or the server `GITHUB_TOKEN` fallback when configured).
5. Create a job from **Jobs → New job**.
6. Open **Sourcing runs**, select the job, and start a run. Connected sources execute in parallel and the authenticated stream shows progress.
7. Open the ranked slate. Upgrade via the dev billing screen if you want to test gated outreach/export features.

## CSV format

The importer accepts common column aliases. A simple example:

```csv
name,title,company,location,skills,years,email,links
Asha Verma,Full Stack Developer,Acme,Delhi,"react;typescript;node.js",4,asha@example.com,https://example.com/asha
```

`name` is required. Skills can be separated by semicolons, pipes, or commas inside a quoted CSV field. Imported links are accepted only when they use `http://` or `https://`.

## Security / privacy notes

- Set strong, unrelated values for `JWT_SECRET` and `CREDENTIALS_KEY` before any non-local deployment.
- Connector tokens are AES-256-GCM encrypted in the local JSON store. Production should use a managed secret store/KMS.
- JWTs are currently stored in browser `localStorage`. For a production deployment, prefer secure HttpOnly cookies or another hardened session design.
- Suppression removes the candidate record, stored scores, and outreach drafts, then keeps an email hash (when available) to prevent rediscovery.
- CSV export mitigates spreadsheet-formula injection for cells beginning with `=`, `+`, `-`, or `@`.
- These controls do **not** by themselves make a deployment GDPR/DPDP/CCPA compliant. Production use needs appropriate legal basis, notices, retention rules, access/deletion workflows, contracts, and legal review.

## Production work still required

- Postgres storage adapter and migrations.
- Real billing provider webhooks.
- Durable queue/worker (for example BullMQ/Redis or another queue) instead of in-process jobs.
- Managed secrets/KMS and key rotation.
- Rate limiting, email verification, password reset, stronger account/session security, monitoring and backups.
- Approved integrations for each third-party recruiting platform; follow each platform's current API access rules and terms.
- Optional AI enrichment if desired.

## Main corrections from v0.1.0

- Fastify/plugin versions aligned to the Fastify 5 compatibility line.
- Added missing `dotenv` dependency and Node types.
- Added Fastify/JWT TypeScript augmentation.
- Replaced unauthenticated browser `EventSource` with authenticated fetch-based SSE streaming.
- Implemented CSV parsing/import and actually feeds imported candidates into sourcing.
- Enforced connector plan gates when connecting and running.
- Runs connectors in parallel.
- Added per-workspace encrypted connector credentials.
- GitHub account age is no longer treated as work experience.
- Improved candidate identity/deduplication to avoid merging on name alone.
- Suppression also deletes scores and outreach drafts and retains only an email hash.
- Added audit events.
- Added CSV formula-injection protection and HTTP(S)-only imported links.
- Removed/rewrote claims for features that were not actually implemented.
