# HireWave v0.3 — Unified Candidate Profile

## Included in code

- Candidates -> open candidate -> grouped unified profile (identity, work, education, skills, projects, preferences, professional contact).
- A **source evidence record** per field: plugin, optional source URL, fetched/imported timestamp, optional provider-reported update time, import vs API method.
- Source conflict label when different platform records report different values; neither value is silently deleted.
- More complete CSV importer for permitted professional data. Input labels such as `source_platform=Naukri` are **user-supplied source labels**, NOT proof of a live Naukri API connection.
- GitHub official API mapper includes public bio, company, location, optional published email, languages, profile link, public repository links and available API update timestamp. Account age is not employment experience.
- Stable ID through repeated source syncing when strong identity is present; name/company alone never merges records.
- Authenticated `GET /api/candidates/:id/profile` returns org-scoped candidate and candidate-confirmed availability by job.
- Suppression now keeps one-way hashes of known unique profile identifiers as well as email hashes, reducing accidental re-discovery under a different source ID.
- Existing data is retained, and single-source legacy candidates display basic source evidence. Multi-source legacy profiles with no preserved per-field attribution show only future attributable evidence; the old source claims cannot be reconstructed reliably.

## Example CSV headers

`name,title,company,location,skills,years,email,links,source_platform,source_url,source_updated_at,professional_phone,employment_history,education,degree,college,graduation_year,certifications,projects,github,portfolio,resume_url,expected_salary,current_salary,notice_period,available_from,preferred_locations,work_mode,preferred_roles,employment_type,work_authorization,languages,achievements`

One CSV row describes an imported candidate source record. For the same professional from another platform, provide a new row with that platform's source URL and matching **unique personal profile URL or professional email**; otherwise the app does **not** assume two similar names are the same person.

Only explicitly allowlisted recruitment-relevant fields are imported. Sensitive attributes (e.g. religion, caste, gender, age, date of birth, health, photos) are excluded. A `professional_phone` is not permission to call; follow channel-specific contact consent rules. Where applicable, attach the original permitted source.

## Important limitations

- This update **does not unlock LinkedIn, Naukri, Indeed, Glassdoor or ATS integrations**. Those require platform approval/credentials and connector implementation. Only existing implemented connectors return API data; imports are customer-authorized records.
- A platform may not expose all fields its users entered, even with official access. HireWave shows **only data actually returned with permission** and does not invent missing data.
- Imported `source_updated_at` is **user-provided**, not independently verified.
- Candidate experience, skills, availability and salary are only evidence from their respective sources until reviewed/confirmed. Candidate interest and interview availability are confirmed separately.
- Profile evidence is **not proof of identity**. Email and unique personal profile URLs are useful dedupe evidence, but ambiguous identity merges still require HR review. Further identity reconciliation tooling is recommended before enterprise rollout.
- The storage is still JSON-file MVP, not a production-ready PostgreSQL deployment. Real connector/provider end-to-end tests, full build, security tests and production hardening remain required.

## Upgrade existing Windows installation

1. Back up the current HireWave folder and its existing `.env` and `data/state.json` if present. **Never send credentials or candidate data to others.**
2. Extract `HireWave_Unified_Profile_v0.3.zip` to a **new** folder rather than overwriting the old running version.
3. Copy your existing `.env` into the new folder. The new package has no secrets.
4. Stop the old server. Copy the prior `data/` folder (or custom `DATA_DIR` content) into the same configured location for the new project. Confirm `DATA_DIR` in `.env` before starting.
5. In PowerShell in the newly extracted folder, run `Set-ExecutionPolicy -Scope Process Bypass` only if needed to run the script; use `npm.cmd install`, `npm.cmd run build`, `npm.cmd test`, then `npm.cmd run dev`.
6. Open Candidates -> a profile. Run the existing GitHub connector or import a full CSV to populate newly added fields. Old data will not magically acquire details from unavailable connectors.
7. Do not deploy to paying HR clients until external API permissions, security, privacy and integration QA are complete.
