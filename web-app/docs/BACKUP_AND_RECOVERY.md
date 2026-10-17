# Backup and recovery runbook

This workflow is only for the dedicated ABLLS-R PostgreSQL container named `postgres-ablls` and database `ablls_db`. It must never be pointed at `postgres-dataviz`.

## Create a backup

From `web-app/` in PowerShell:

```powershell
.\scripts\backup-database.ps1
```

The script:

- checks that the exact `postgres-ablls` container is running;
- reads the database user and password only from that container's existing environment;
- creates a PostgreSQL custom-format dump with a UTC timestamp;
- validates the dump with `pg_restore --list` before copying it out;
- refuses to overwrite an existing filename;
- writes to `web-app/backups/`, which is ignored by Git through the `*.backup` rule.

Store backups on encrypted media with access limited to authorized operators. A backup may contain authentication and client assessment data. Do not email it or upload it to an unapproved service.

## Verify an existing backup

Verification is read-only. Copy the file into the isolated container under a unique temporary name, list its archive contents, and remove only that temporary copy:

```powershell
docker cp .\backups\ablls_db_TIMESTAMP.backup postgres-ablls:/tmp/ablls_verify.backup
docker exec postgres-ablls pg_restore --list /tmp/ablls_verify.backup
docker exec postgres-ablls rm -f -- /tmp/ablls_verify.backup
```

A zero exit code and a non-empty archive list confirm that PostgreSQL can read the archive. This does not prove a full restore; periodically test restoration in a disposable database.

## Restore rehearsal (manual and destructive only to the disposable target)

Do not restore over `ablls_db`. The following commands deliberately use a disposable database named `ablls_restore_test`. Review the backup path and container name before running them.

```powershell
docker cp .\backups\ablls_db_TIMESTAMP.backup postgres-ablls:/tmp/ablls_restore_test.backup
docker exec postgres-ablls sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" createdb --username="$POSTGRES_USER" ablls_restore_test'
docker exec postgres-ablls sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore --username="$POSTGRES_USER" --dbname=ablls_restore_test --exit-on-error /tmp/ablls_restore_test.backup'
docker exec postgres-ablls sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" psql --username="$POSTGRES_USER" --dbname=ablls_restore_test --command="SELECT COUNT(*) FROM \"Assessment\";"'
```

After confirming the rehearsal and only with explicit approval, remove the disposable database and temporary archive. No restore or cleanup command is automated by this repository.

For a real incident, stop application writes first, preserve the current database separately, restore into a new database, validate migrations and record counts, then switch `DATABASE_URL` during a controlled maintenance window.
