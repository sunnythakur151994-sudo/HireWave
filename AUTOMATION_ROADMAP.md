# HireWave v0.2 — recruitment automation architecture

This file distinguishes **implemented** workflows from future integrations. This build is a working first automation layer, **not** a complete unattended multi-platform recruiting system.

## Product behavior / state machine

1. HR creates a job description and connects authorized sources.
2. HR clicks **Automation -> Search & classify**. Existing parallel connectors run and produce a ranked slate.
3. The workflow classifies people based on *recorded evidence*, not protected characteristics:
   - `needs_review` — incomplete/missing evidence or below workflow prioritization threshold. Profiles remain visible for HR review; no hiring rejection is made.
   - `awaiting_availability` — objective requirements have evidence, but candidate interest/availability is not confirmed.
   - `ready_for_hr` — requirements have evidence and the candidate **personally confirmed** availability/interest using a secure single-use link.
   - `unavailable` — candidate explicitly declined or is not available.
4. HR can create a secure invitation link for a qualifying candidate. With `RESEND_API_KEY` and `RECRUITMENT_FROM_EMAIL` configured, HR may send an individual email **after affirming an appropriate contact basis and no opt-out**. Sending does not occur silently or in bulk.
5. Candidate opens the secure link and voluntarily records availability, preferred window, and optional consent for email/SMS/voice. Link expires in 14 days and is single-use. Candidate can explicitly opt out of all future contact.
6. The `ready_for_hr` list contains **only confirmed available candidates**. HR can add a person to the meeting queue.
7. Meeting requests are currently `pending_calendar`, **not confirmed calendar bookings**.

## Actual integration status

| Capability | Status in this code |
|---|---|
| GitHub official public API | Implemented from v0.1.1; workspace token or allowed public API |
| Imported candidate CSV | Implemented from v0.1.1 |
| Parallel connected-source sourcing | Implemented for supported live connectors |
| Explainable scoring and category grouping | Implemented; human-review safeguard |
| Candidate-confirmed availability | Implemented via secure link |
| Opt-out and suppression | Implemented |
| Individual recruiter-approved email availability invitation | Implemented, requires Resend credentials, verified sender, contact permission |
| Automatic mass email follow-up | **Not enabled**; needs lawful campaign policy, per-candidate permissions, delivery/opt-out automation, durable queue |
| SMS sending | **Not implemented**; requires provider, appropriate permissions and local sender registration |
| Automatic outbound voice calls | **Not implemented**; requires provider, consent/DND handling and approved scripts |
| Google/Microsoft real calendar event creation | **Not implemented**; needs OAuth, free/busy lookup and event creation |
| LinkedIn, Naukri, Indeed, Glassdoor and ATS candidate sourcing | **Not implemented** unless official approved connectors are separately developed |
| Real Postgres and worker queue | **Not implemented**; v0.2 still uses local JSON and in-process sourcing |

## Remaining full-automation implementation (next stages)

### Stage 2 — communication engine

- Tenant-scoped consent records with evidence, source, timestamp, purpose and channel.
- Approved templates per email/SMS/voice, localized templates and sender identities.
- A durable outbound queue, per-account daily caps, retry/backoff, idempotency keys and bounce/error events.
- Candidate unsubscribe and per-channel STOP handling with immediate suppress propagation.
- For India SMS, obtain DLT Principal Entity registration, approved headers and templates, proper routing, recipient consents as required by regulations; implement provider-specific entity/template parameters.
- For voice, require clear recipient permission, DND/preferences screening, call windows, call transfer to HR on candidate request, and no misleading impersonation.
- Only automate follow-ups to individuals with validated channel-specific permission. Do not turn public profile data into unsolicited bulk SMS/call campaigns.

### Stage 3 — verified meeting booking

- Recruiter connects Google Calendar or Microsoft Graph by OAuth with least-privilege permissions.
- Store each HR member's time zone, work hours, interview duration and meeting preferences.
- Call real free/busy APIs to identify slots and revalidate before booking.
- Candidate selects a slot; create calendar event with invitees, conferencing link and provider event ID.
- Mark interview `confirmed` only after calendar provider returns success; handle rescheduling, cancellation and conflicts.

### Stage 4 — enterprise production connectors and operations

- Approved partner integrations and user OAuth for each recruiting platform; never claim unsupported public API access.
- Replace file storage with transactional Postgres, indexes, migrations, encrypted secrets/KMS and retention policies.
- Replace in-process sourcing with Redis/BullMQ or a comparable durable worker queue.
- Add org permissions, review/appeal, candidate correction workflows, audit event retention, data residency, tenant isolation tests, security audits, webhooks, observability and deployment runbooks.
- If deploying to a single company under the one-time-license model, assign the `enterprise` server-side company license tier administratively; implement signed license activation before production. Never expose a public `/setPlan` endpoint.

## India compliance pointers

- TRAI official guidance for commercial senders: https://www.trai.gov.in/advice-to-senders
- Twilio India SMS DLT and sender rules: https://www.twilio.com/en-us/guidelines/in/sms
- Google free/busy: https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- Microsoft findMeetingTimes: https://learn.microsoft.com/en-us/graph/api/user-findmeetingtimes?view=graph-rest-1.0

The product must not make final employment eligibility decisions autonomously. Missing public information is **not** proof a candidate lacks a skill or meets an exclusion criterion.
