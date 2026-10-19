import assert from "node:assert/strict";
import test from "node:test";
import { betterAuthBaseURL, developmentAuthHosts } from "../lib/auth-origin.ts";

test("development auth permits only explicit localhost and private-LAN hosts", () => {
  assert.deepEqual(developmentAuthHosts("172.20.8.55:3000, 192.168.1.20:3000"), [
    "localhost:3000",
    "127.0.0.1:3000",
    "172.20.8.55:3000",
    "192.168.1.20:3000",
  ]);
  assert.throws(() => developmentAuthHosts("*:3000"));
  assert.throws(() => developmentAuthHosts("example.com:3000"));
  assert.throws(() => developmentAuthHosts("http://172.20.8.55:3000"));
});

test("development uses request-aware HTTP origins while production remains canonical", () => {
  assert.deepEqual(betterAuthBaseURL({ NODE_ENV: "development", BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_DEV_HOSTS: "172.20.8.55:3000" }), {
    allowedHosts: ["localhost:3000", "127.0.0.1:3000", "172.20.8.55:3000"],
    protocol: "http",
    fallback: "http://localhost:3000",
  });
  assert.equal(betterAuthBaseURL({ NODE_ENV: "production", BETTER_AUTH_URL: "https://ablls.example", BETTER_AUTH_DEV_HOSTS: "172.20.8.55:3000" }), "https://ablls.example");
});
