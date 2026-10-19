HireWave v0.6 Admin Portal TypeScript error fix

Replaces complete apps/api/src/storage.ts with corrected full version.
Changed only the admin failed-search count: status === "failed" -> status === "error".

Installation:
1. Extract this ZIP to a folder (for example D:\HireWave_v2\StorageFix).
2. Stop HireWave.
3. From that extracted folder run:
   powershell -NoProfile -ExecutionPolicy Bypass -File ".\INSTALL_STORAGE_FIX.ps1" -ProjectPath "D:\HireWave_v2"
4. cd "D:\HireWave_v2"
5. npm.cmd run build
6. npm.cmd run dev

The script backs up the original storage.ts first.
