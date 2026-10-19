# HireWave v0.4.1 — TWO AGENTS (REBUILT)

## Contents

- **Messaging Agent:** prepares/edit/reviews recruitment Email and SMS messages. Can submit via Resend and Twilio after explicit approval and contact permission.
- **Calling Agent:** prepares/edit/reviews a scripted voice message. Can submit one-way Twilio voice calls after explicit approval and confirmed permission.
- Job eligibility + availability + contact consent enforced before outreach.
- Contact attempts tracked in agent history; no automatic retries after ambiguous failures.

## Install on Windows

1. Extract all files to `D:\HireWave_v0.4.1` (there must be a `package.json` in that directory). Keep `D:\HireWave` unchanged.
2. Double-click `START_HIREWAVE_WINDOWS.bat` **or** in PowerShell run:

   ```powershell
   cd "D:\HireWave_v0.4.1"
   Copy-Item .env.example .env
   npm.cmd install
   npm.cmd run dev
   ```
3. Open http://localhost:5173 and visit **Outreach agents**.
4. For a complete build check, run `BUILD_HIREWAVE_WINDOWS.bat`.

## Provider keys (server only)

```env
AGENTS_SENDING_ENABLED=false
RESEND_API_KEY=
RECRUITMENT_FROM_EMAIL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

Do not enable sending for public users or real candidates until the service is fully security-reviewed, recruitment-related contact permission and local telecom requirements are satisfied, and verified sender accounts are connected.

**NOT included:** two-way conversational voice interview agent, real recipient replies/STOP webhook synchronization, delivery receipts, automatic calendar booking, production Postgres or third-party restricted recruitment platform integrations.

See `AGENTS_README.md`, `WINDOWS_START_HERE.md` and `VALIDATION_AGENTS.md`.
