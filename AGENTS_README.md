# HireWave v0.4.1 - Two Recruitment Outreach Agents

This source package extends the single-URL Railway review build v0.3.2 with **two outbound agents**.

| Agent | Channels | What it does |
| --- | --- | --- |
| Messaging Agent | Email via Resend; SMS via Twilio | Prepares personalized follow-up drafts for consenting, eligible candidates; upon explicit recruiter approval, submits email or SMS to the provider and logs the result. |
| Calling Agent | Voice via Twilio | Prepares an automated spoken follow-up for a consenting, eligible candidate; upon recruiter approval, initiates a one-way recorded-script-free spoken notification call via TwiML `<Say>`. There is NO conversational voice bot in this version. |

## Default safety settings

- `AGENTS_SENDING_ENABLED=false` by default. Drafting is available without credentials or sends.
- Only candidates with recorded positive availability **and** a confirmed channel-specific consent are eligible.
- Candidate must appear in the current job's scored slate with objective requirements satisfied.
- No candidate email/phone is inferred or enriched. SMS/voice require a `professional_phone` value in the imported/authorized profile, in E.164 format (`+countrycode...`).
- Workspace-specific opt-outs and suppression are respected.
- Candidate may be contacted only once in 24 hours across channels; repeat of the same channel within 7 days is blocked.
- Per-workspace daily caps: Email 30, SMS 15, Voice 5.
- Voice/SMS restricted to Mon-Fri 09:00-18:00 in the candidate-confirmed time zone (blocks if missing or invalid).
- Each batch is limited to 10 selected drafts and requires recruiter acknowledgement. Viewing/creating drafts costs nothing; sending can incur provider fees.
- Tasks use `draft -> sending -> sent / failed` (plus `cancelled`). `sent` means provider accepted request, NOT email delivered, SMS read, call answered, or meeting booked.
- Failed requests are NOT automatically retried, because the provider may have accepted an ambiguous network request. Failed attempts remain held for review (even if another draft is requested); manually verify provider logs before cancelling a failed task and preparing another.
- Individual email/SMS/script drafts can be edited before approval. Each edit resets the local approval checkbox.
- In-flight submissions count toward daily limits, and concurrent submissions for the same candidate are blocked at the single-process application level. Inspect provider logs manually before retrying.
- Candidate opt-out removes their queued/history tasks from the local store and prevents future re-import by known hashed identifiers.

## Setup in Windows

1. Extract this ZIP as `D:\HireWave_Agents_v0.4.0`. Leave the old `D:\HireWave` intact until the new version runs correctly.
2. Since your existing project has no real candidate data, no database transfer is needed. If you have configured credentials in your old local `.env`, do NOT send or upload them; copy them locally into the new `.env`.
3. In PowerShell:

```powershell
cd "D:\HireWave_Agents_v0.4.0"
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

4. Open http://localhost:5173 and log in. Use **Recruitment automation** to source/classify and obtain candidate availability confirmation; then open **Outreach agents** in the left sidebar.
5. If you later enable live sends, set `AGENTS_SENDING_ENABLED=true` and configure Resend/Twilio as detailed below. Restart the server after editing `.env`.

## Provider setup - Messaging Agent

**Email via Resend:**
- Register: https://resend.com/  · API keys: https://resend.com/api-keys  · Docs: https://resend.com/docs/send-with-nodejs
- Verify a domain/sender as required by provider, and set:

```env
RESEND_API_KEY=re_...     # server-side only
RECRUITMENT_FROM_EMAIL=recruiting@yourverifieddomain.com
```

**SMS via Twilio:**
- Register: https://www.twilio.com/  · Console: https://console.twilio.com/ · API docs: https://www.twilio.com/docs/messaging/api/message-resource
- Purchase/verify an approved SMS-capable sender for the destination country (and complete India DLT/template/sender registration where required):

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1XXXXXXXXXX
```

## Provider setup - Calling Agent

- Uses the same Twilio credentials as SMS and the outgoing Calls API: https://www.twilio.com/docs/voice/api/call-resource
- Confirm your Twilio number is voice-capable and the destination country is enabled/permitted.
- The voice agent plays a short scripted recruitment follow-up with TwiML `<Say>`. It does not carry a conversation, interpret speech, transfer calls or book meetings. It does not record calls.

## Enabling live outbound actions

```env
AGENTS_SENDING_ENABLED=true
```

Restart the API. Sending still requires candidate affirmative permission, contact details, objective job eligibility, candidate-confirmed availability, weekday business hours for voice/SMS, per-workspace daily caps, and an explicit recruiter approval checkbox.

## Test without messaging real people

1. Create a job containing objective skill requirements.
2. Import only permitted sample/owned records through CSV or a connected source; run sourcing and verify they appear in the slate.
3. On the **Automation** page, generate a secure availability link for a qualified candidate.
4. Open the link yourself for a *fictional* profile; confirm available and check the channel permissions being tested. **Never send a real invitation to a fictitious/unconsenting recipient.**
5. On **Outreach agents**, choose a channel and prepare a draft. Sending is deliberately disabled without explicit provider setup.
6. For testing paid delivery, use Twilio/Resend authorized test recipients only.

## Important production limitations

- Candidate email/SMS replies, inbound STOP webhook syncing, delivery receipts, call-answer telemetry, natural two-way voice conversations, and calendar bookings are **not implemented**.
- SMS messaging and automated voice calling may be restricted by recipient-country laws, registration/DLT obligations, do-not-disturb rules and provider policies. Set them up before enabling sending.
- A review-password gate can block external candidates from availability forms unless granted access. Before public candidate campaigns, deploy a separate, properly secured candidate-response service with its own access policy.
- This build still uses a single-process JSON store. Migrate to a transaction-safe production database and queue before high-volume multi-tenant deployment.
- Store all API credentials only server-side. The `.env` must never be committed to GitHub.

## Files changed

- `apps/api/src/routes-agents.ts`: agent queues + eligibility/approval checks + endpoints.
- `apps/api/src/agent-services.ts`: Resend/Twilio adapters.
- `apps/api/src/storage.ts`: task persistence, daily caps, suppression integration.
- `apps/api/src/env.ts`, `server.ts`: provider settings and route registration.
- `apps/web/src/pages/Agents.tsx`, `lib/api.ts`, `App.tsx`, `components/Shell.tsx`: UI.
- `packages/shared/src/agents.ts`: channel destination and draft logic.
- `packages/shared/src/agents.test.ts`: unit checks.

## v0.4.1 reliability changes

- Added recruiter editing for draft subject/message/script, before sending.
- Prevented failed provider calls from silently generating a replacement draft.
- Counts provider submissions already in-flight toward sending limits.
- One candidate may appear only once in a single dispatch batch.
- Availability/consent source remains the candidate confirmation form, not inferred from a public profile.

### Verification status

This package needs `npm.cmd install` and `npm.cmd run build` on a machine with network/package dependencies. No live provider delivery can be guaranteed until Resend/Twilio sender identities, India-specific telecom registration where applicable, webhook/callback handling, and authorized test contacts have been configured. The voice feature is a one-way scripted call, not an interactive conversation or interview booking.

- The API reads the root `.env` from any npm workspace current working directory (and preserves cloud-injected environment variables).
- Draft edits enforce SMS/email opt-out wording and automated voice disclosure; SMS is capped at 320 characters to reduce accidental multi-segment charges.
