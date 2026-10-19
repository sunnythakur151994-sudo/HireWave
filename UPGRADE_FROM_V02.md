# Upgrade HireWave v0.2 -> v0.3 on Windows (keep existing data)

1. **Back up** your current entire HireWave folder, including the actual `DATA_DIR` and the current `.env`. Keep both locally and never send them to anyone.
2. Unzip `HireWave_Unified_Profile_v0.3.zip` to a **new folder**. Do not overwrite the running copy.
3. Copy your existing `.env` from the previous project into the new project folder. If not present, copy `.env.example` to `.env` and configure secrets.
4. Check the actual data directory path using `DATA_DIR` in `.env`. If it is relative, copy the old `data/` directory to the matching location in the new project. If it is absolute, point to the existing private data directory only after a backup.
5. Stop the previous API and web servers.
6. Open PowerShell in the **new** project folder and run:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd test
npm.cmd run dev
```

7. Open `http://localhost:5173`, sign in and visit `Candidates -> candidate profile`.
8. To test multi-platform data without external integrations, open `Plugins -> Import talent pool CSV`, paste `SAMPLE_UNIFIED_CANDIDATES.csv` content and import. Example Asha Verma should appear once with both imported source labels and different employer/notice period values retained for HR review.
9. To import other permitted platform data, export it with authorization and provide `source_platform`, `source_url` and relevant recruitment columns. Do not scrape or bypass platform access restrictions.

Do not confuse sample imported platform labels with live platform API integrations. Production external API integration work, Postgres, durable queues and security hardening remain unfinished.
