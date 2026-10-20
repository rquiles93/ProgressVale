import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import pg from "pg";

const source = new URL(process.env.DATABASE_URL ?? "invalid:");
if (!["localhost", "127.0.0.1"].includes(source.hostname) || source.port !== "5433" || source.pathname.slice(1) !== "ablls_db") throw new Error("Auth integration setup requires the dedicated local ProgressVale PostgreSQL server.");
const databaseName = `progressvale_auth_test_${Date.now()}_${randomBytes(3).toString("hex")}`;
const testURL = new URL(source); testURL.pathname = `/${databaseName}`;
const maintenanceURL = new URL(source); maintenanceURL.pathname = "/postgres";
const baseURL = "http://127.0.0.1:3011";
const env = { ...process.env, DATABASE_URL: testURL.toString(), AUTH_TEST_DATABASE_URL: testURL.toString(), AUTH_TEST_BASE_URL: baseURL, BETTER_AUTH_URL: baseURL, BETTER_AUTH_DEV_HOSTS: "127.0.0.1:3011", BETTER_AUTH_SECRET: "isolated-integration-secret-at-least-32-bytes", BREVO_API_KEY: "", BREVO_SENDER_EMAIL: "", BREVO_SENDER_NAME: "", GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "" };
let server;
const maintenance = new pg.Client({ connectionString: maintenanceURL.toString() });
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
let maintenanceConnected = false;

async function waitForServer() { for (let i = 0; i < 80; i += 1) { try { if ((await fetch(`${baseURL}/login`)).ok) return; } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Isolated auth server did not become ready."); }

try {
  await maintenance.connect();
  maintenanceConnected = true;
  await maintenance.query(`CREATE DATABASE "${databaseName}"`);
  const migrate = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { cwd: resolve(projectRoot), env, stdio: "inherit" });
  if (migrate.status !== 0) throw new Error("Isolated migration failed.");
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "3011"], { cwd: projectRoot, env, stdio: ["ignore", "pipe", "pipe"] });
  await waitForServer();
  const result = spawnSync(process.execPath, ["--test", "tests/auth-integration.db.mjs"], { cwd: projectRoot, env, stdio: "inherit" });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally {
  server?.kill();
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (maintenanceConnected) {
    await maintenance.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()`, [databaseName]).catch(() => {});
    await maintenance.query(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => {});
    await maintenance.end();
  }
}
