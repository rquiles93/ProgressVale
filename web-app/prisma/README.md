# Database foundation

The schema is prepared for PostgreSQL but no database migration has been created or applied in this phase.

## Ownership boundary

Every client belongs to one user. Assessments store the same `ownerId` and use a composite foreign key to the client, preventing an assessment from referencing a client owned by a different user. Application queries must always be scoped by the authenticated user's `ownerId` before returning or changing clients, assessments, scores, or notes.

Each new assessment receives its own ID and related score/note records. There is intentionally no uniqueness constraint that would replace an older assessment for the same client.

`AssessmentScore.score` is nullable: `null` means unanswered and `0` means an explicit zero. `maxScore` records the valid maximum for that skill. Application validation must enforce `0 <= score <= maxScore` when a score is provided.

## Later local setup

1. Copy `.env.example` to `.env` and set a real local PostgreSQL connection string.
2. Run `npm install`.
3. Run `npm run prisma:validate`.
4. Create the first migration only when the target database is available: `npx prisma migrate dev --name init`.

Do not reuse a production credential in the local `.env` file.
