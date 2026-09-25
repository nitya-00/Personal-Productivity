# TimeLens architecture plan

## Phase 0 inspection

The workspace is empty: it contains no application source, package manifest,
lockfile, Git repository, environment file, frontend, backend, database schema,
or existing build configuration.

Available local tooling:

- Node.js `v24.11.1`
- npm `11.6.2`
- pnpm `11.19.0`
- PostgreSQL client `16.15`

No PostgreSQL server responded at the default local endpoint during inspection.
No `Daily Tracking Backup.numbers` file was found in the workspace, so no
historical-sheet assumptions have been made. If it is supplied later, it will be
read-only and inspected before any import work is proposed.

## Proposed architecture

TimeLens will be a small, conventional monorepo:

```text
frontend/          React + TypeScript + Vite application
backend/           Express + TypeScript API
prisma/            Prisma schema, migrations, and seed data
docs/              Product and architecture notes
```

The browser app will call a versioned, same-purpose REST API under `/api`.
Express will validate input with Zod, coordinate application rules, and access
PostgreSQL exclusively through Prisma. The frontend will receive human-friendly
time-log, goal, and analytics data; it will never receive database identifiers
unless an internal update operation genuinely requires one.

The first personal MVP will use one local profile rather than authentication.
Authentication is deliberately deferred to Phase 13, where it requires explicit
approval.

## Chosen stack

| Concern | Technology | Rationale |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS | Fast, typed, lightweight UI for a table-first workflow. |
| Navigation | React Router | Explicit pages without a heavier framework. |
| Charts | Recharts | Limited, purposeful analytics charts. |
| API | Node.js, Express, TypeScript | Simple REST backend with clear route boundaries. |
| Validation | Zod | Validates API input at the boundary. |
| Database | PostgreSQL | Durable relational storage for daily blocks and analysis. |
| ORM | Prisma | Typed schema, migrations, and readable database access. |

## Core modules

- **Daily log:** Creates exactly 24 fixed hourly blocks for each date and updates
  a selected block without overwriting the rest of the day.
- **Categories:** Stores granular categories; analytics maps DSA, ML, Project,
  and College to the higher-level Study group.
- **Analytics:** Calculates totals, percentages, period comparisons, hourly
  patterns, planned-versus-actual completion, and distraction counts from stored
  blocks. It contains no AI-derived statistics.
- **Goals:** Holds simple goals and deadline/progress data, including wake and
  sleep preferences when that phase is reached.
- **100 Days Challenge:** Tracks one optional new experience per challenge day
  and category distribution.
- **Check-ins:** Stores optional morning, afternoon, and night energy/focus/mood
  ratings.
- **Reminders:** Stores reminder preferences first; delivery mechanism is deferred
  until its dedicated phase and any required service decision.
- **Experiments:** Defines a duration and tracked measures, then presents before/
  during results without declaring success or failure.

## Data flow

```text
Daily table / pages
        ↓ HTTP + validated payloads
Express routes and controllers
        ↓ business rules + analytics service
Prisma
        ↓
PostgreSQL
        ↑ calculated, human-readable responses
Dashboard / analytics / goals / challenge views
```

For a new date, the daily-log service will create the `DailyLog` and its 24
hourly blocks transactionally. Analytics will aggregate persisted blocks for the
selected period; it will distinguish percentage of period from percentage change
against a comparable prior period. Partial-week comparisons will use matched
elapsed-day windows rather than a partial week versus a full week.

## Data model outline

The intended Phase 2 schema includes `User`, `Category`, `DailyLog`,
`HourlyBlock`, `Goal`, `Challenge`, `ChallengeDay`, `Reminder`, `CheckIn`, and
`Experiment`. It will use a unique daily log per user/date and a unique hourly
block per daily log/hour index (0 through 23), preserving the fixed 24-block
model. Exact relations and fields will be documented in the Prisma schema during
Phase 2, after the foundation is approved.

## Phase plan

0. Inspect the project and record this plan. No application code.
1. Create frontend/backend foundation, PostgreSQL/Prisma configuration, and a
   verified `/api/health` connection.
2. Define and migrate the Prisma schema; seed categories; verify 24-block daily
   log creation and CRUD.
3. Build the editable, date-navigable 24-hour Daily Log.
4. Build the data-backed Dashboard with high-level cards and one cautious insight
   and recommendation.
5. Add 7-, 15-, and 30-day analytics and only charts that improve understanding.
6. Add goals, planning, deadlines, and planned-versus-actual tracking.
7. Add the 100 Days Challenge.
8. Add optional daily check-ins and cautious descriptive analysis.
9. Add the simplest reliable reminders after agreeing on delivery scope.
10. Add phone-free final-hour calculation and reporting.
11. Add a traceable, conservative rule-based insight engine.
12. Add personal experiments and before/during comparison.
13. Add authentication and multi-user isolation only with approval.
14. Polish accessibility, responsiveness, error/empty states, and verification.
15. Discuss deployment architecture and provider choice before any deployment.

Each implementation phase will begin with a Git-status check when a repository
exists, finish with focused checks, report changed files and issues, and pause
for approval before the next phase. No external service, authentication,
database reset, destructive migration, or public deployment is planned without
the requested approval.
