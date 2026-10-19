# HireWave v0.4.1 — Windows Start Here

This is a complete project, not a patch. Keep `D:\HireWave` unchanged until the new folder works.

1. Extract this ZIP to `D:\HireWave_v0.4.1` (the folder containing `package.json`).
2. Open PowerShell and run the commands **one by one**:

```powershell
cd "D:\HireWave_v0.4.1"
Copy-Item .env.example .env
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

3. Open `http://localhost:5173`. Create/login to your workspace.
4. Create a job, source/import permitted profiles, run qualification, and obtain candidate availability and channel consent.
5. Open **Outreach agents** on the sidebar. Draft -> edit -> review -> approve.
6. By default, sending is OFF. Do not enable it until you connect authorized, verified provider accounts and test recipient/sender permissions.

**Do not copy your API secrets into chats or screenshots.** This project has no live recipient data. The call feature sends an automated scripted voice message, not a conversational call.

If `.env` already exists, avoid overwriting it; keep the old folder separate.
