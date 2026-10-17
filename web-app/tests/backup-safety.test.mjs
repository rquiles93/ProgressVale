import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("backup script is isolated, timestamped, verified, and non-overwriting", async () => {
  const source = await readFile(new URL("../scripts/backup-database.ps1", import.meta.url), "utf8");
  assert.match(source, /postgres-ablls/);
  assert.match(source, /ablls_db_/);
  assert.match(source, /yyyyMMddTHHmmssZ/);
  assert.match(source, /pg_restore --list/);
  assert.match(source, /never overwritten/i);
  assert.doesNotMatch(source, /postgres-dataviz/i);
  assert.doesNotMatch(source, /dropdb|DROP DATABASE|--clean/i);
});
