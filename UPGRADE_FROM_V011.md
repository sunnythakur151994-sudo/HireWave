# Upgrade from your existing HireWave v0.1.1 on Windows

**Important: do not overwrite or discard the existing workspace's database and secret keys.**

1. Stop the current servers by pressing `Ctrl+C` in the PowerShell window running `npm run dev`.
2. Back up the existing project, including its `.env` and `apps/api/data/state.json`, before replacing code. The data folder is intentionally **not** packaged in this new ZIP.
3. Extract this new folder to a different location, for example `D:\ms downloads\hirewave-automation-v0.2`.
4. Locate the old data folder. In the old workspace it is usually `apps\api\data\state.json`. If `DATA_DIR` was customized, use that location instead. Copy the old data file into **the new project's corresponding data folder**. Create the data folder if necessary.
5. Copy the existing `.env` into the new project root, preserving `JWT_SECRET` and `CREDENTIALS_KEY` exactly. Changing `CREDENTIALS_KEY` may make previously stored encrypted connector credentials unreadable.
6. Append the new environment options from `.env.example` (especially `PUBLIC_WEB_URL` and, only if wanted, `VITE_ENABLE_COMPANY_LICENSE_DEV=1`). Do not overwrite your existing secrets.
7. In PowerShell:

   ```powershell
   cd "D:\ms downloads\hirewave-automation-v0.2"
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\setup-windows.ps1
   npm run dev
   ```

8. Open `http://localhost:5173` and sign in with the **same old account**. All existing jobs/candidates will remain only if you copied the correct state file.
9. In the left sidebar open **Automation**. Select your job and use **Search & classify**. If the workspace has exhausted its local trial allowance, the development Billing page includes a **Company licence - local development only** option when enabled. Do **not** use development billing in production.

No source passwords or API keys should be pasted into messages or placed into frontend `VITE_...` variables.
