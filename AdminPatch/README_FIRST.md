# HireWave v0.6 — Admin Portal + HireWaveSync ONLY

This is a feature-only patch for the ORIGINAL v0.6 neon dashboard. It does NOT install the redesigned v0.7 shell, landing page or authentication screen, and it does not remove any navigation, dashboard cards, styling, or the 12-step guided tour.

## Target

Your working v0.6 project, typically `D:\HireWave_v2` (change the path if yours differs). Do **NOT** point this installer at `D:\HireWave 1` if it contains v0.7.

## Installation (Windows PowerShell)

1. Stop the running HireWave server (`Ctrl + C`). Keep a copy of the original folder.
2. Extract this ZIP into a separate folder, e.g. `D:\HireWave_v2_AdminPatch`.
3. In PowerShell:

```powershell
cd "D:\HireWave_v2_AdminPatch"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\INSTALL_ADMIN_EXTRACTOR_ONLY.ps1" -ProjectPath "D:\HireWave_v2"
cd "D:\HireWave_v2"
node scripts/setup-admin.mjs
npm.cmd run build
npm.cmd run dev
```

If your working v0.6 path differs, replace `D:\HireWave_v2` with the exact path. The script refuses projects whose package version does not begin with `0.6`.

4. Open `http://localhost:5173` and log in with the email and **strong 16+ character password** you entered in setup.
5. The administrator is redirected to `/admin`. Sign in with a normal recruiter account to verify the v0.6 neon dashboard has not changed.
6. Open Plugins > HireWaveSync Contact Extractor. It is marked **Connected** by default. Paste permitted professional contact text to extract unverified email, phone, and professional profile references.

## Exactly what changes

- Adds an isolated Admin Portal at `/admin` with aggregate counts, organization usage, sourcing, activity, integration adoption and system health.
- Adds server-side admin role enforcement. Normal recruiter APIs reject admin tokens, and the admin API rejects recruiter tokens.
- Adds the built-in HireWaveSync text extractor to Plugins. No credentials are required for local text parsing; URL crawling, enrichment, PDFs, verification and messaging are **not** enabled.
- A single redirect line on the existing login screen sends admin users to `/admin` while preserving the v0.6 login appearance.
- Adds one dedicated extractor card to the original v0.6 Plugins page; the rest of the Plugins page remains unchanged.

## Files not modified

`apps/web/src/components/Shell.tsx`, `apps/web/src/pages/Landing.tsx`, `apps/web/src/pages/Dashboard.tsx`, `apps/web/src/components/GuidedTour.tsx`, `apps/web/src/components/hirewave-dashboard.css`, all existing mascot images, and your existing `.env` / `data` contents.

## Credential safety

Do not use the previously shared simple admin password on a public deployment. `scripts/setup-admin.mjs` asks for your selected email and password locally; only a salted scrypt hash is saved to `.env`. Do not share `.env`.

## Validation

This patch was assembled against the v0.6 and v0.7 project archives already provided. Source syntax and selected regression checks are run during packaging; full Windows browser and live provider testing must be completed on your PC. The installer backs up every file it replaces under `_backups/`.
