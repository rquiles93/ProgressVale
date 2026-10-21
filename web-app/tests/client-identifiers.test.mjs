import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  ClientIdentifierGenerationError,
  CLIENT_IDENTIFIER_PATTERN,
  createWithGeneratedClientIdentifier,
  generateClientIdentifier,
} from "../lib/client-identifier.ts";

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("generated client identifiers use the canonical format and practical collision space", () => {
  const identifiers = Array.from({ length: 2_000 }, generateClientIdentifier);
  assert.equal(identifiers.every((identifier) => CLIENT_IDENTIFIER_PATTERN.test(identifier)), true);
  assert.equal(new Set(identifiers).size, identifiers.length);
});

test("creation retries identifier collisions without swallowing unrelated errors", async () => {
  const collision = new Error("collision");
  let calls = 0;
  const result = await createWithGeneratedClientIdentifier(
    async (identifier) => {
      calls += 1;
      if (calls < 3) throw collision;
      return identifier;
    },
    (error) => error === collision,
  );
  assert.equal(calls, 3);
  assert.match(result, CLIENT_IDENTIFIER_PATTERN);

  const unrelated = new Error("database unavailable");
  await assert.rejects(
    createWithGeneratedClientIdentifier(async () => { throw unrelated; }, () => false),
    (error) => error === unrelated,
  );
});

test("creation reports exhausted identifier collisions deterministically", async () => {
  let calls = 0;
  await assert.rejects(
    createWithGeneratedClientIdentifier(
      async () => { calls += 1; throw new Error("collision"); },
      () => true,
      4,
    ),
    ClientIdentifierGenerationError,
  );
  assert.equal(calls, 4);
});

test("client mutations never accept or overwrite a browser-supplied identifier", async () => {
  const source = await readProjectFile("app/actions/clients.ts");
  assert.doesNotMatch(source, /formData\.get\(["']identifier["']\)/);
  assert.match(source, /data: \{ name: input\.name, serviceSettings: input\.serviceSettings \}/);
  assert.match(source, /id_ownerId: \{ id: clientId, ownerId \}/);
});

test("client form explains automatic IDs and renders existing IDs read-only", async () => {
  const source = await readProjectFile("components/client-form-dialog.tsx");
  assert.doesNotMatch(source, /name=["']identifier["']/);
  assert.match(source, /Automatically generated when you create the client\./);
  assert.match(source, /Se genera automáticamente al crear el cliente\./);
  assert.match(source, /client\?\.identifier/);
});

test("schema and migration enforce global uniqueness and preserve legacy values", async () => {
  const [schema, migration] = await Promise.all([
    readProjectFile("prisma/schema.prisma"),
    readProjectFile("prisma/migrations/20261020150000_automatic_client_identifiers/migration.sql"),
  ]);
  assert.match(schema, /identifier\s+String\s+@unique\s+@db\.VarChar\(9\)/);
  assert.match(schema, /legacyIdentifier\s+String\?/);
  assert.doesNotMatch(schema, /@@unique\(\[ownerId, identifier\]\)/);
  assert.match(migration, /"legacyIdentifier"/);
  assert.match(migration, /ALTER COLUMN identifier SET NOT NULL/);
  assert.match(migration, /ADD CONSTRAINT "Client_identifier_key" UNIQUE \(identifier\)/);
  assert.match(migration, /PV-/);
});
