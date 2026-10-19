import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nextDevelopmentOrigins } from "../lib/next-dev-origins.mjs";

const authForm = readFileSync(new URL("../components/auth-form.tsx", import.meta.url), "utf8");

test("credential forms cannot fall back to GET and remain inert before hydration", () => {
  assert.match(authForm, /<form method="post" action=\{`\/api\/auth\/\$\{isLogin \? "sign-in" : "sign-up"\}\/email`\}/);
  assert.match(authForm, /disabled=\{!hydrated \|\| pending\}/);
  assert.match(authForm, /disabled=\{!hydrated\}/);
  assert.match(authForm, /<noscript>/);
  assert.doesNotMatch(authForm, /method="get"/i);
});

test("Next development origins accept only explicit private LAN hostnames", () => {
  assert.deepEqual(nextDevelopmentOrigins("172.20.8.55:3000, 192.168.1.25:3000"), ["172.20.8.55", "192.168.1.25"]);
  assert.deepEqual(nextDevelopmentOrigins("10.0.0.4:3000,172.31.255.255:3000"), ["10.0.0.4", "172.31.255.255"]);
  assert.deepEqual(nextDevelopmentOrigins("http://172.20.8.55:3000, *.example.com, example.com:3000, 172.32.0.1:3000"), []);
});
