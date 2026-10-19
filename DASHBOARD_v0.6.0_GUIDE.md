# HireWave v0.6.0 — Neon Dashboard and In-App 3D Guide

## What changed

This release updates the authenticated HireWave application to follow the approved dark navy, cyan and violet visual reference. It is an update to the existing HireWave recruiting product, not a separate app.

- Custom neon sidebar with functioning navigation: Dashboard, Jobs, Candidates, Plugins, Sourcing Runs, Automation, Outreach Agents, Outreach and Reports.
- Top navigation with real in-workspace search (Ctrl+K), actual audit notifications, low-glare theme toggle and user menu.
- Dashboard KPI cards connected to existing backend jobs, candidates, latest job slate and latest job interview-request queue.
- Job list with working links to real job slates, and a prominent Create New Job button.
- Source distribution donut chart computed from candidate source records.
- Activity feed drawn from recorded audit events, outreach drafts and newly created jobs; date filter applies to these activities.
- Candidate table supports search, status tabs, sorting, table/grid views and links to actual candidate profiles.
- Real candidate availability is only shown as confirmed when backed by recorded availability responses; otherwise it says Not confirmed.
- A clearly labelled "Preview sample dashboard" toggle shows illustrative values for visual review without saving fake candidates or sending outreach.
- The old full-screen tour is replaced by a 12-step **in-app spotlight tour** that highlights real buttons and panels, uses a glossy 3D-style mascot, professional English instructions, Back/Next, the Help & Tour entry, and the playful two-click Skip behavior.
- Responsive layout for desktop and mobile.
- Existing backend routes, security checks, candidate workflow and messaging/calling agents retained.

## Installation — update the currently working Agents project

Your project folder is: `D:\HireWave\Agents`

1. Stop the running development server with `Ctrl+C` in its PowerShell window.
2. Extract `HireWave_Dashboard_Update_v0.6.0.zip` into a NEW temporary folder (for example `D:\HireWave\DashboardPatch`).
3. Locate `INSTALL_DASHBOARD.ps1` in that extracted folder.
4. Run the following commands in a NEW PowerShell window:

```powershell
cd "D:\HireWave\DashboardPatch"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\INSTALL_DASHBOARD.ps1"
```

5. The installer creates a backup of overwritten files under `D:\HireWave\Agents\.hirewave_backup_dashboard_<timestamp>`.
6. Restart the working project:

```powershell
cd "D:\HireWave\Agents"
npm.cmd install
npm.cmd run dev
```

7. Open `http://localhost:5173`, sign in, refresh with Ctrl+Shift+R and choose **Help & Tour** on the sidebar.
8. To view the populated visual layout without real candidates, choose **Preview sample dashboard**. All sample records are visibly marked as illustrative and not persisted.

If the extracted directory has an extra enclosing folder, first `cd` into the folder containing `INSTALL_DASHBOARD.ps1`.

## Functionality and limitations

This release changes the interface and connects the displayed cards to existing API endpoints. It does **not** add new LinkedIn, Naukri or Indeed authorizations, create real candidates, confirm actual interviews or send messages without approved provider credentials. Google/Microsoft calendar event creation remains a future integration. Recruiting platform restrictions remain in effect.

Counts may appear as zero or a dash on a new workspace; that is correct. Match scores apply to the latest saved job's existing slate; interview requests are the latest job's meeting-request queue, not confirmed interviews. The app does not invent outcomes or statuses.

## Requirements and safety

Node.js 20 or later. Backend port 4000 and frontend port 5173 should be available. API proxy is configured for local development. Do not upload `.env` or actual credentials. Use authorized data only, maintain recruiter approvals, candidate contact permissions and opt-out requirements.

**Validation performed in this environment:** TypeScript/TSX transpilation syntax check passed for the frontend. A complete dependency-backed npm build was not available due to installation timeout, so run `npm.cmd run build` on your Windows machine before deployment.
