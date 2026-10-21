import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import "dotenv/config";
import pg from "pg";

const source = new URL(process.env.DATABASE_URL ?? "invalid:");
if (!["localhost", "127.0.0.1"].includes(source.hostname) || source.port !== "5433" || source.pathname.slice(1) !== "ablls_db") {
  throw new Error("Client identifier migration tests require the dedicated local ProgressVale PostgreSQL server.");
}

const databaseName = `progressvale_client_id_test_${Date.now()}_${randomBytes(3).toString("hex")}`;
const maintenanceURL = new URL(source);
maintenanceURL.pathname = "/postgres";
const testURL = new URL(source);
testURL.pathname = `/${databaseName}`;
const maintenance = new pg.Client({ connectionString: maintenanceURL.toString() });
let database;

try {
  await maintenance.connect();
  await maintenance.query(`CREATE DATABASE "${databaseName}"`);
  database = new pg.Client({ connectionString: testURL.toString() });
  await database.connect();
  await database.query(`
    CREATE TABLE "Client" (
      id TEXT PRIMARY KEY,
      "ownerId" TEXT NOT NULL,
      name TEXT NOT NULL,
      identifier TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL
    );
    CREATE UNIQUE INDEX "Client_ownerId_identifier_key" ON "Client" ("ownerId", identifier);
  `);
  await database.query(`
    INSERT INTO "Client" (id, "ownerId", name, identifier, "createdAt") VALUES
      ('valid', 'owner-a', 'Valid', 'PV-ABC123', '2026-01-01'),
      ('missing', 'owner-a', 'Missing', NULL, '2026-01-02'),
      ('empty', 'owner-a', 'Empty', '', '2026-01-03'),
      ('legacy', 'owner-a', 'Legacy', 'OLD-42', '2026-01-04'),
      ('duplicate-first', 'owner-a', 'Duplicate first', 'PV-ZZZ999', '2026-01-05'),
      ('duplicate-second', 'owner-b', 'Duplicate second', 'PV-ZZZ999', '2026-01-06');
  `);

  const migration = await readFile(new URL("../prisma/migrations/20261020150000_automatic_client_identifiers/migration.sql", import.meta.url), "utf8");
  const cleanupMigration = await readFile(new URL("../prisma/migrations/20261020151000_drop_redundant_owner_identifier_index/migration.sql", import.meta.url), "utf8");
  await database.query(migration);
  await database.query(cleanupMigration);

  const first = await database.query(`SELECT id, identifier, "legacyIdentifier" FROM "Client" ORDER BY id`);
  assert.equal(first.rows.every((row) => /^PV-[A-Z0-9]{6}$/.test(row.identifier)), true);
  assert.equal(new Set(first.rows.map((row) => row.identifier)).size, first.rows.length);
  assert.equal(first.rows.find((row) => row.id === "valid").identifier, "PV-ABC123");
  assert.equal(first.rows.find((row) => row.id === "duplicate-first").identifier, "PV-ZZZ999");
  assert.equal(first.rows.find((row) => row.id === "legacy").legacyIdentifier, "OLD-42");
  assert.equal(first.rows.find((row) => row.id === "duplicate-second").legacyIdentifier, "PV-ZZZ999");

  await database.query(migration);
  await database.query(cleanupMigration);
  const second = await database.query(`SELECT id, identifier, "legacyIdentifier" FROM "Client" ORDER BY id`);
  assert.deepEqual(second.rows, first.rows, "repeating the backfill must not change assigned identifiers or preserved legacy values");

  const indexes = await database.query(`SELECT indexname FROM pg_indexes WHERE tablename = 'Client' ORDER BY indexname`);
  assert.equal(indexes.rows.some((row) => row.indexname === "Client_identifier_key"), true);
  assert.equal(indexes.rows.some((row) => row.indexname === "Client_ownerId_identifier_key"), false);
  console.log("Client identifier migration integration: passed (6 fictional clients, repeated idempotently).");
} finally {
  await database?.end().catch(() => {});
  await maintenance.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()`, [databaseName]).catch(() => {});
  await maintenance.query(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => {});
  await maintenance.end().catch(() => {});
}
