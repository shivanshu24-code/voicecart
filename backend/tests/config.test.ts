import assert from "node:assert/strict";
import { test } from "node:test";
import { missingProductionSettings } from "../src/config.js";

test("production names every missing setting", () => {
  const missing = missingProductionSettings({ NODE_ENV: "production", SUPABASE_URL: "https://x.supabase.co" });
  assert.equal(missing.includes("FRONTEND_ORIGIN"), true);
  assert.equal(missing.includes("SUPABASE_URL"), false);
});

test("development doesn't require production settings", () => {
  assert.deepEqual(missingProductionSettings({ NODE_ENV: "development" }), []);
});
