# Deployment-readiness checklist

This is a readiness guide, not a statement that the application is production-ready or compliant with any health-data regulation.

## Configuration and secrets

- [ ] Set `DATABASE_URL` to a private PostgreSQL database with TLS, a least-privilege application user, backups, monitoring, and tested recovery.
- [ ] Generate a unique high-entropy `BETTER_AUTH_SECRET` and keep it in the platform secret manager.
- [ ] Set `BETTER_AUTH_URL` to the canonical HTTPS origin; configure Better Auth trusted origins if more than one approved origin is required.
- [ ] Never copy local `.env`, database passwords, dumps, or client data into the image or Git.
- [ ] Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` unset until an approved OAuth client exists. Configure only `openid`, `email`, and `profile`, with the production callback URL `${BETTER_AUTH_URL}/api/auth/callback/google`.
- [ ] Configure an approved transactional email provider before presenting password recovery as available.

## Runtime and application

- [ ] Use a supported Node.js runtime compatible with Next.js 16, Prisma 7, and PDFKit's Node build. PDF routes require the Node runtime, writable memory, standard fonts, and enough memory for multi-page buffers.
- [ ] Run `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run build`, and `npm start` in controlled release stages.
- [ ] Serve only through HTTPS. Production cookies are configured `Secure`, `HttpOnly`, and `SameSite=Lax`; verify those attributes in the deployed browser.
- [ ] Keep the database private. Do not expose PostgreSQL directly to the public internet.
- [ ] Confirm download responses retain `private, no-store`, `nosniff`, and restrictive PDF content security headers at the CDN or proxy.
- [ ] Set request/body limits and platform timeouts that still allow long assessment and Skills Tracking PDF generation.

## Access control and operations

- [ ] Re-run authentication, cross-account ownership, finalized-assessment mutation, and PDF IDOR tests against a staging environment with fictional data.
- [ ] Confirm every client, assessment, score, note, and report lookup is scoped by the authenticated user on the server.
- [ ] Apply Prisma migrations before serving a release and verify `prisma migrate status` afterward; never use destructive reset commands on production.
- [ ] Configure structured security logging without client names, notes, scores, session tokens, credentials, or full database records.
- [ ] Define session revocation, account recovery, user offboarding, data export, retention, and deletion procedures before onboarding real clients.
- [ ] Establish incident response, breach notification, uptime monitoring, dependency review, and backup-restore drills.

## Privacy and legal review

- [ ] Complete privacy, security, contractual, accessibility, and publisher/licensing review for the intended jurisdiction and use.
- [ ] Minimize collected identifiers and document the lawful purpose and retention period for each data class.
- [ ] Obtain explicit approval before claiming HIPAA compliance, clinical validation, or equivalence to an official publisher-issued ABLLS-R form.
- [ ] Verify that generated summaries contain only the permitted minimum task identification and result data.
