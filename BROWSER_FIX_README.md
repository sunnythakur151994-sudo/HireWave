# HireWave v0.3.1 browser blank-page correction

The React app imports a field helper from the package root, which re-exports the server-only `logic.js` and therefore triggers a browser load of `node:crypto`.

Changes:
1. `packages/shared/package.json` exports `./profile` as a browser-compatible subpath.
2. `apps/web/src/pages/CandidateProfile.tsx` imports profile helpers from that subpath instead of root.

The data model, server-side hashing, storage, credentials and account logic are not changed.

Windows: extract into a new directory, run `npm.cmd install`, then `npm.cmd run dev`. Alternatively copy `fix-hirewave-blank-page.ps1` into the existing `D:\HireWave` folder, stop the dev server and run `powershell -NoProfile -ExecutionPolicy Bypass -File "D:\HireWave\fix-hirewave-blank-page.ps1"`. Then restart the server.

Note: build and browser end-to-end testing still require dependencies; the fix is grounded in the identified import graph.
