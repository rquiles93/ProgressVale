# ABLLS-R application status

## Implemented

- Email/password registration, login, logout, persistent sessions, profile editing, password changes, session revocation, and rate limiting.
- Google OAuth architecture restricted to basic identity scopes; activation awaits real credentials.
- User-owned client creation, editing, search, Service Settings, ownership enforcement, and empty states.
- Persistent assessments with 25 source sections, 544 tasks, 18 supported sections, seven permanent exclusions, score and note persistence, section snapshots, manual service-setting overrides, explicit finalization, and read-only history.
- Client progress summaries, historical comparisons, and a reconstructed Skills Tracking reporting grid shared by the UI, five-page A3 PDF, and five-sheet real-cell XLSX export. Reports contain all 25 sections and 544 tasks without changing the 18-section assessment scope. Client and tracking pages expose clearly labeled Skills Tracking PDF/Excel actions, while detailed assessment PDF/CSV exports remain separate.
- In-progress assessments can be previewed and exported as a clearly labeled provisional final layer after historical finalized evaluations. This read-only reporting path does not finalize or otherwise change the assessment.
- Dedicated two-assessment comparison with compatibility rules, Service Setting snapshots, transparent per-section denominators, and explicit task states.
- Authenticated assessment CSV exports with UTF-8 BOM, blank unanswered values, locked-state labels, ownership enforcement, and formula neutralization.
- Paginated assessment history and in-assessment task-state navigation with unsaved-change protection.
- Local PostgreSQL backup, integrity verification, restore-rehearsal guidance, and deployment checklist.

## Automated verification

- Dataset structure, task ordering, required fields, task-specific score scales, source-document hashes, supported/excluded sections, Service Setting combinations, and six Section B images.
- Registration, duplicate rejection, password hashing, login failure, session persistence, profile update, password change, session revocation, logout, and route protection.
- Client/assessment ownership, snapshot persistence, explicit zero, notes, duplicate active-assessment prevention, section locks, finalization, and immutable finalized-state conditions.
- Resume position, progression/regression calculations, zero versus unanswered, stable tracking colors, long-note PDF pagination, multi-assessment tracking PDFs, private cache headers, and PDF IDOR protection.
- Comparison compatibility, changed score ranges, locked versus unanswered tasks, CSV escaping/formula protection, and CSV ownership isolation.
- Skills Tracking geometry for verified 1/2/4-point tasks, all 25 sections and 544 tasks, seven complete uncolored excluded-section grids, cumulative acquisition colors, stable chronological colors through 20-assessment histories, regression/reacquisition, Service Setting history, five-page complete-section PDF pagination, five-sheet real-cell XLSX structure, and XLSX authorization.
- Authenticated route coverage verifies the visible Skills Tracking labels, provisional screen and export routes, anonymous/cross-account isolation, five-page PDF, five-sheet XLSX, and unchanged in-progress assessment status.
- The focused unit suite passes 25/25 tests. Dedicated PostgreSQL integration passes persistence, authentication lifecycle, ownership/isolation, PDF/CSV/XLSX authorization, and migration-current checks.
- Automated desktop browser QA passes login, empty state, client search/detail, assessment start, scoring, note save/reload, examples popover, previous/next navigation, explicit finalization, Skills Tracking rendering, and logout using disposable fictional records.
- TypeScript, ESLint, Prisma validation/migrations, production build, and whitespace checks.

## Stabilization findings

- Corrected tracking markers that treated stored `null` scores as answered.
- Added distinct historical locked-section rendering on the tracking screen.
- Corrected resume selection to use the first unanswered enabled task.
- Added transactional write guards so score/section writes cannot proceed after concurrent finalization.
- Added dialog focus containment, Escape handling, focus restoration, accessible search labeling, and explicit error announcements.
- Added generic non-cached PDF failure responses without private record details.
- Separated Skills Tracking reporting structure from assessment availability, correcting the previous 18-section/403-task export filter.
- Rebalanced Skills Tracking PDF/XLSX groups to five complete sections per page or worksheet and added wrapped XLSX status headings.

## External configuration pending

- Google Cloud OAuth client and approved callback URL.
- Transactional email provider and password-recovery workflow.
- Hosted PostgreSQL, secret management, TLS origin, monitoring, backup retention, and deployment environment.
- Privacy, security, accessibility, publisher/licensing, data-retention, and jurisdiction-specific legal review.

## Known limitations and unresolved risks

- The application has not completed user-led acceptance testing or an independent security/accessibility audit.
- Google login and password-reset email delivery remain unavailable.
- The npm audit currently reports high-severity transitive advisories in Prisma configuration and Next ESLint toolchains. Registry-proposed fixes require incompatible major downgrades, so they have not been forced.
- Generated reports are application summaries and are not official publisher-issued ABLLS-R forms.
- The `R` regression marker is an application transparency convention, not a claimed publisher convention. See `docs/SKILLS_TRACKING_METHOD.md`.
- No claim of production readiness, clinical validation, or HIPAA compliance is made.
- On 2026-10-14 Docker Desktop required an extended startup, after which `postgres-ablls` became healthy on port 5433. Database persistence, authentication, export ownership, migration status, and authenticated browser workflows passed against the dedicated database. Temporary fictional QA records were removed afterward.

## Manual review remaining

Complete `docs/MANUAL_QA_CHECKLIST.md` with fictional data, emphasizing keyboard/screen-reader behavior, mobile responsive layouts, native Excel open/repair-warning behavior, live browser download dialogs, interrupted saves, and cross-browser rendering before any production decision.
