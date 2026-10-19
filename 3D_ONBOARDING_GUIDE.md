# HireWave v0.5.0 — 3D Mascot Product Tour

## What was added

This release adds a **first-time-user onboarding tour** to the existing HireWave v0.4.1 Agents application. The existing dashboard, jobs, connectors, candidates, automation and two outreach agents remain in the project.

The 12 visual scenes mirror the selected 3D-look design:

1. Welcome to HireWave
2. First skip attempt — funny joke and crying-with-laughter character
3. Second skip attempt — goodbye reaction and tour exit
4. Dashboard overview
5. Connect hiring platforms
6. Create the first job
7. Search and sourcing
8. Unified candidate profiles
9. Eligibility and availability
10. Calling + Email/SMS outreach agents
11. Tour completion
12. Help menu and replay

**Behavior:** Scenes 2 and 3 appear only if Skip is used. Otherwise the guided learning sequence follows scenes 1 and 4–12. The first Skip click presents a joke; the second click exits after a short farewell. The Escape key also provides an accessibility exit.

### Visual implementation

The project uses **12 pre-rendered 3D mascot illustrations** from the approved storyboard, plus CSS 3D transforms, mouse parallax, glow, floating animations, and scene-specific mock panels. The art has a three-dimensional appearance, **but is not a real-time WebGL/360-degree 3D model**. This choice avoids installing large external rendering libraries and helps it run on ordinary PCs.

### First-time tour and replay

- Automatically starts after a newly created/signed-in user first enters the authenticated workspace.
- Completion is stored **locally in this browser per HireWave organization and user** in `localStorage`. It does not sync across browsers/devices.
- Click **Help & Tour** near the bottom of the left sidebar to replay it at any time.
- Tutorial samples are illustrative and do not imply that external recruitment platforms are connected.
- Mobile layout and reduced-motion settings are supported.

## Windows: apply the small patch to the project you're already running

If your working folder is `D:\HireWave\Agents`, **use the PATCH ZIP** supplied alongside the full project.

1. Stop the running servers with Ctrl+C in their PowerShell window.
2. Extract `HireWave_3D_Tour_PATCH_v0.5.0.zip` to a temporary folder, e.g. `D:\HireWave-Tour-Patch`.
3. Right-click PowerShell / open a PowerShell window and run:

```powershell
cd "D:\HireWave-Tour-Patch"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\INSTALL_3D_TOUR.ps1"
```

4. Start your **original** project:

```powershell
cd "D:\HireWave\Agents"
npm.cmd run dev
```

5. Visit `http://localhost:5173`, sign in, and start the 3D tour. If you already completed it, click **Help & Tour** to replay.
6. Use `Ctrl+Shift+R` to hard-refresh if old frontend files are cached.

### Preserved files and data

The patch changes only these application files:

- `apps/web/src/components/Shell.tsx`
- `apps/web/src/components/OnboardingTour.tsx` (new)
- `apps/web/src/components/onboarding-tour.css` (new)
- `apps/web/src/lib/api.ts` (local API proxy compatibility)
- `apps/web/vite.config.ts` (local `/api` proxy)
- `apps/web/public/onboarding/mascot-01.webp` ... `mascot-12.webp` (new images)

The patch does **not** touch `.env`, `apps/api`, your workspace database/JSON, or candidate records. It saves a dated backup of every existing target file before replacing it.

If there are local custom edits in `Shell.tsx`, `api.ts` or `vite.config.ts`, compare the `.before-tour-*.bak` backups after applying. The patch assumes the v0.4.1 Agents files and may overwrite local changes to those three files.

## Fresh installation (alternative)

If you want to try the complete updated project in a separate folder, extract `HireWave_3D_Tour_FULL_v0.5.0.zip` into `D:\HireWave-Tour`. In the folder that contains `package.json`:

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run dev
```

`http://localhost:5173` should open. Do not run the original app at the same time unless you change its ports.

## Source code and testing

The new tour does not add npm dependencies. The TypeScript/TSX sources passed syntax transpilation; all 12 mascot asset references and key interaction hooks were checked. **A full dependency-backed production build/browser interaction test was not completed in the preparation environment**, so test the actual Windows application using `npm.cmd run build` and browser interaction before offering it to clients.

## Security and product behavior

- The tour is UI-only. It never sends emails, SMS or calls, connects recruitment platforms, or creates candidates.
- Sample candidate data and recruitment metrics inside the tutorial are labeled illustrative.
- The original app still requires its real connector credentials, contact permissions, and external provider setup to enable actual recruitment automation.
