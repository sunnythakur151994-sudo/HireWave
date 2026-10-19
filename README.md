# HireWave

HireWave is a web application with a frontend and a Node.js backend API. This repository currently contains a demo/work-in-progress build.

## Project structure

- `apps/` — application code, including the backend API and frontend.
- `packages/shared/` — shared code used by the applications.
- `scripts/` — project maintenance and setup scripts.
- `package.json` and `package-lock.json` — root Node.js dependencies and scripts.

## Getting started

Install dependencies from the repository root:

```bash
npm ci
```

Check the scripts in `package.json` to find the commands for developing, building and starting the applications. Deployment commands depend on the service configuration.

## Backend configuration

The API reads settings from environment variables. Set credentials through your hosting provider's secret/environment settings; **do not commit real credentials or `.env` files**.

Relevant variables include:

- `JWT_SECRET` — production signing secret.
- `CREDENTIALS_KEY` — production key for protected credentials.
- `REVIEW_ACCESS_PASSWORD` — required by the current client-review production build.
- `NODE_ENV`, `PORT`, `CORS_ORIGIN`, `PUBLIC_WEB_URL` — environment and network settings.

The current backend code requires both `JWT_SECRET` and `CREDENTIALS_KEY` to contain at least 32 characters, not contain `change-me`, and not begin with `dev-`. They should be distinct, cryptographically random values. The review access password must be at least 16 characters in production. Other admin-related configuration may also be required depending on which features are enabled.

## Deployment status

This is a demo version undergoing setup. The backend has previously built successfully on Render but failed at startup during secret validation. Confirm runtime configuration and diagnose the failing variable before deploying to production. Do not weaken the validation to resolve deployment errors.

## Security

Keep passwords, API keys, tokens and `.env` files out of Git and screenshots. Before making this repository public, review commit history for accidentally committed credentials and rotate any exposed secrets.
