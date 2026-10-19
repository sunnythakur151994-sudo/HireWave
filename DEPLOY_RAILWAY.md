# HireWave 0.3.2 Review - Railway deploy (private, non-sensitive testing)

This package adds a single-URL frontend+API deployment, a password-protected **review gate**, production signup control and a persistent JSON storage path. It is **not production-ready for real candidate data**. It still needs durable multi-instance storage, stronger auth/session hardening, production rate limits and security review.

## Local prepare
1. Unzip to a new folder. Do NOT overwrite your original D:\HireWave. Run from the NEW package folder.
2. Run `npm.cmd install`, then `npm.cmd run build`, then `npm.cmd test`. Do not publish if build fails.
3. Create a **private** GitHub repository; GitHub Desktop or CLI can upload the new project. Upload no `.env`, credentials or candidate data. `.gitignore` excludes them.

## Railway
1. Visit https://railway.com/new and connect your GitHub repository. Pick **one service from the root repository** (root directory `/`), not separate web/api services.
2. In Service Settings, use **Build command:** `npm install && npm run build`
3. In Service Settings, use **Start command:** `npm run start`
4. In Service Settings, add a persistent Volume with mount path **`/data`**. This is required before any user registration because JSON records are stored there.
5. Service > Variables: add:
   - `NODE_ENV=production`
   - `DATA_DIR=/data`
   - `JWT_SECRET=<random separate secret at least 32 chars>`
   - `CREDENTIALS_KEY=<another random secret at least 32 chars>`
   - `REVIEW_ACCESS_PASSWORD=<random password at least 16 chars>`
   - `SIGNUP_ENABLED=1` (temporarily, to create the initial app user)
   - `HIREWAVE_ALLOW_SET_PLAN=0`
   - Do not set `VITE_API_URL`; this build intentionally uses same-origin relative API URLs.
   - Do not set `VITE_ENABLE_COMPANY_LICENSE_DEV`.
6. Generate Public Domain in Settings > Networking. Railway gives a `https://...up.railway.app` domain. This is a sample, never guess or invent it.
7. Set `PUBLIC_WEB_URL` and `CORS_ORIGIN` to the **actual** Railway domain, e.g. `https://your-domain.up.railway.app`. Redeploy/restart if prompted.
8. Visit the Railway link. Enter REVIEW_ACCESS_PASSWORD at the review gate and then register an owner account. After successful registration, change `SIGNUP_ENABLED` to `0` and redeploy/restart.
9. Use fake/test candidate profiles only. Send HTTPS domain to client and share gate password via a separate private channel.
10. Health endpoint: `https://YOUR-DOMAIN/api/health` should respond with `ok:true`.

## Security + limits
- This review gate protects the frontend and API via a signed, HttpOnly, Secure cookie. It is supplementary, not a replacement for secure app authentication and a professional security review.
- The service still uses local JSON storage; `/data` must be a persistent Railway volume. `DATABASE_URL` in older .env samples is not implemented.
- Multi-instance deployments using one JSON file are not supported. Use exactly one replica and do not enable multiple instances.
- Candidate availability pages are also behind the review gate in this preview; external candidates cannot use them without being granted access. Do not send candidate invitations from this review environment.
- No real customer secrets, candidate contact details or imported resumes should be uploaded before hardening, DPA/privacy review and permitted data-source integrations.
- Keep `HIREWAVE_ALLOW_SET_PLAN=0` in internet-facing environments. No real payments or bulk SMS/calls are wired up in this version.

## Random passwords with PowerShell + Node
Run **three times** (save each output separately):
`node -e "console.log(require('node:crypto').randomBytes(40).toString('hex'))"`

## Common issues
- `The page is blank`: inspect DevTools console for import errors, make sure the updated browser-fix package is deployed and Railway build succeeded.
- `No frontend build found`: check that Build command is `npm install && npm run build` **from repo root**.
- `Sign up disabled`: temporarily set `SIGNUP_ENABLED=1` through Railway, register the owner, then restore `SIGNUP_ENABLED=0`.
- `Data disappears`: you forgot `/data` volume or `DATA_DIR=/data`.
- App restarts: Railway logs reveal build/start issues; check Node version >=20, secrets and build commands.
- `/api/health` succeeds but UI fails: check review gate cookie, browser console and build logs.


## v0.4.0 outbound agent additions

For optional email/SMS/voice **after provider account verification and recipient permission checks**, configure Railway Variables:

```text
AGENTS_SENDING_ENABLED=false
RESEND_API_KEY=...
RECRUITMENT_FROM_EMAIL=recruiting@verified-domain.example
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
```

Keep outbound disabled until the sender country is approved and the required registration/DLT and candidate-consent processes have been completed. See `AGENTS_README.md` for details. Candidate availability links on this private-review build are behind the review password; do not use it for unattended external campaigns.
