# HireWave

> **Current status:** Demo build in deployment testing; the backend builds successfully, but the hosted API startup is currently blocked by environment-secret validation.

**A unified recruitment workspace for managing jobs, discovering talent, evaluating candidates, and coordinating hiring workflows.**

HireWave brings the core stages of a recruiter's day into a single web application. Teams can define hiring requirements, connect authorized talent sources, import existing candidate records, organize profiles, run structured searches, compare candidate fit, and manage outreach. A dedicated administration area provides oversight of workspace activity and connected services.

---

## What HireWave Does

| Area | Purpose |
| --- | --- |
| **Recruitment dashboard** | A central view of recruitment activity, workflows, and key metrics. |
| **Jobs and intake** | Create jobs from role descriptions and organize hiring requirements. |
| **Talent sources** | Connect supported sources and work with imported candidate pools. |
| **Candidate management** | Browse, review, and maintain candidate profiles. |
| **Sourcing runs** | Execute searches against configured sources and review results. |
| **Candidate shortlists** | Compare matches and build role-specific candidate slates. |
| **Outreach** | Prepare and coordinate candidate communication workflows. |
| **Automation and agents** | Access workflow-oriented recruitment automation interfaces. |
| **Analytics and billing** | Review workspace activity, usage, and account-plan information. |
| **Admin portal** | Review organization-level operational information and activity. |
| **Contact extraction** | Extract structured professional contact details from locally supplied text, where authorized. |

> **Integration note:** Features that depend on external providers require configured integrations and appropriate permissions. The application also includes a fictional demo talent pool for evaluation; demo records are not real candidates. Some integrations are catalog entries rather than active live connections.

## Product Experience

HireWave uses a dark, neon-accented dashboard interface, with navigation designed around the main recruitment workflow. The web application includes guided onboarding elements and a visual tour to introduce the workspace. Recruiter-facing screens and administrative functions are distinct parts of the experience.

### A Typical Recruitment Workflow

1. **Define the role** — enter or paste a job description and identify the relevant requirements.
2. **Choose sources** — select configured talent connectors or an imported candidate pool.
3. **Run sourcing** — collect available candidate results within connector and account limits.
4. **Review profiles** — inspect qualifications and supporting source information.
5. **Build a shortlist** — compare candidates against the role and organize a candidate slate.
6. **Coordinate next steps** — prepare outreach and track recruitment activity.

## Technology Stack

| Layer | Technology | Responsibility |
| --- | --- | --- |
| **Frontend** | React, TypeScript, Vite | Interactive recruitment interface and browser-side application. |
| **Navigation** | React Router | Client-side navigation and protected application routes. |
| **Server-state management** | TanStack Query | Data fetching and application request state. |
| **Styling** | Tailwind CSS, CSS | Dashboard design, layout, and responsive presentation. |
| **Backend** | Node.js, TypeScript, Fastify | HTTP API, routing, authentication, and recruitment operations. |
| **Validation** | Zod | Validation of incoming structured data. |
| **Authentication** | JWT via Fastify JWT | Token-based authenticated access. |
| **Shared logic** | TypeScript workspace package | Common types, parsing, validation, and matching utilities. |
| **Tooling** | npm workspaces, TypeScript compiler | Dependency management and application builds. |

The source is authored primarily in **TypeScript**. During a production build, the TypeScript compiler generates JavaScript that the Node.js runtime can execute.

## Architecture

```text
                        Browser
                           |
                  React + Vite Web App
                           |
                      HTTP / JSON
                           |
                    Fastify API Server
                           |
          +----------------+----------------+
          |                |                |
     Authentication   Recruitment       Integrations
                       workflows          & imports
          |                |                |
          +----------------+----------------+
                           |
                   Storage abstraction
                           |
                 Application data files

          Shared TypeScript package supplies common
          models, parsing, and recruitment logic.
```

### Repository Layout

```text
HireWave/
├── apps/
│   ├── api/
│   │   ├── db/
│   │   │   └── schema.sql       # Reference PostgreSQL schema
│   │   └── src/
│   │       ├── index.ts         # API entry point
│   │       ├── server.ts        # Fastify server and route registration
│   │       ├── env.ts           # Runtime configuration
│   │       ├── auth.ts          # Authentication utilities
│   │       ├── storage.ts       # Application data access
│   │       ├── connectors.ts    # Talent-source integrations
│   │       ├── runner.ts        # Sourcing execution
│   │       ├── agent-services.ts
│   │       └── routes-*.ts      # API endpoints by feature
│   └── web/
│       ├── public/             # Static assets and onboarding visuals
│       └── src/
│           ├── App.tsx         # Frontend routes
│           ├── components/     # Layout and reusable interface elements
│           ├── lib/            # API and authentication clients
│           └── pages/          # Product screens
├── packages/
│   └── shared/
│       └── src/                # Shared models and business utilities
├── scripts/                   # Setup and maintenance tooling
├── package.json               # Root workspace scripts
└── package-lock.json          # Locked npm dependency versions
```

The repository can also contain patch, migration, and Windows setup utilities used during development. They are not separate runtime applications.

### Backend Responsibilities

The API accepts requests from the web application and applies authentication, input validation, organization-specific access, and business rules. Feature routes manage jobs, candidates, connectors, sourcing runs, outreach-related operations, automation, and administrative views. Shared modules provide reusable structures and recruitment logic.

### Data and Persistence

The included demonstration implementation uses a **JSON-file storage adapter**. The repository also provides a **PostgreSQL schema** as a foundation for a more durable production database integration; the schema alone does not mean the running application is backed by PostgreSQL.

For real-world use, persistent storage, backups, operational monitoring, and credential management should be configured before relying on the service for business-critical records.

## Getting Started Locally

**Requirements:** Node.js 20 or newer and npm.

From the repository root:

```bash
npm ci
npm run dev
```

The development command builds the shared package and starts the API and web development servers. Default development addresses are:

- **Web interface:** `http://localhost:5173`
- **API:** `http://localhost:4000`

To compile the complete application:

```bash
npm run build
```

To run the compiled server:

```bash
npm start
```

For the production server to serve the web interface, the frontend build must be present alongside the API build.

## Configuration

Configure runtime settings through environment variables. Use a local `.env` file for development or your hosting platform's protected environment settings for deployment. **Do not store live secrets in Git.**

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime mode, including production. |
| `PORT` | API listening port; the hosting platform may supply it. |
| `JWT_SECRET` | Secret used for signing and verifying authentication tokens. |
| `CREDENTIALS_KEY` | Secret for protecting stored connector credentials. |
| `CORS_ORIGIN` | Allowed web application origins. |
| `PUBLIC_WEB_URL` | Public-facing application URL. |
| `DATA_DIR` | Application data directory. |
| `GITHUB_TOKEN` | Optional token for the supported GitHub integration. |
| `REVIEW_ACCESS_PASSWORD` | Access password required by the current review-build configuration in production. |
| `HIREWAVE_ADMIN_EMAIL` | Optional administrator email configuration. |
| `HIREWAVE_ADMIN_PASSWORD_HASH` | Administrator password hash, where admin access is configured. |
| `HIREWAVE_ADMIN_PASSWORD_POLICY` | Administrator password policy flag. |

Other optional settings support messaging providers, signup behavior, integration configuration, and selected recruitment capabilities.

**Production security:** Generate strong, independent random values for `JWT_SECRET` and `CREDENTIALS_KEY`. The current application validates that each has at least 32 characters and does not use development placeholder patterns. The review-access password requires at least 16 characters in the present production configuration. Never publish values or include them in logs.

## Deployment Model

HireWave contains a browser frontend and a Node.js API. They can be deployed behind a single service that serves the compiled frontend, or deployed separately with the correct API endpoint and allowed origins. The hosting environment must provide the required runtime secrets and persistent storage where necessary.

A successful build confirms compilation; the service is considered operational only after the server starts, passes its health check, and the frontend can communicate with the API.

## Security and Responsible Use

- Authenticated routes are protected by token verification and server-side access checks.
- Connector credentials should be handled only through protected server-side configuration or encrypted storage.
- Talent records and contact details should come from authorized sources, permitted integrations, or user-provided data.
- Demo content is explicitly fictional and intended for testing rather than live recruiting.
- Production use should include durable storage, backups, logging, access controls, and suitable data-retention practices.

---

**HireWave** — One workspace for the recruitment process, from role intake to candidate shortlisting and coordination.
