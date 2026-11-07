import assert from "node:assert/strict";
import { test } from "node:test";
import { shopProfileSchema } from "../src/schemas/profile.schema.js";
import { confirmedAfterEdit } from "../src/services/publish.js";

const profile = (hours: unknown[], extra: Record<string, unknown> = {}) => ({
  name: "Sharma Store",
  category: "grocery",
  description: null,
  phone: "9876543210",
  whatsapp: null,
  address: "MG Road",
  hours,
  ...extra,
});

const open = { day_of_week: 1, slot: 0, open_time: "09:00", close_time: "21:00", is_closed: false };

test("accepts a day with an afternoon break and a closed day", () => {
  const parsed = shopProfileSchema.parse(
    profile([
      { ...open, close_time: "13:00" },
      { ...open, slot: 1, open_time: "16:00" },
      { day_of_week: 0, slot: 0, open_time: null, close_time: null, is_closed: true },
    ]),
  );
  assert.equal(parsed.hours.length, 3);
});

test("clears times on a closed day", () => {
  const parsed = shopProfileSchema.parse(profile([{ ...open, is_closed: true }]));
  assert.equal(parsed.hours[0]?.open_time, null);
});

test("allows hours that run past midnight", () => {
  assert.equal(
    shopProfileSchema.safeParse(profile([{ ...open, open_time: "18:00", close_time: "01:00" }])).success,
    true,
  );
});

test("rejects an open day without times, or with equal times", () => {
  assert.equal(shopProfileSchema.safeParse(profile([{ ...open, close_time: null }])).success, false);
  assert.equal(shopProfileSchema.safeParse(profile([{ ...open, close_time: "09:00" }])).success, false);
});

test("rejects the same slot twice and a bad phone number", () => {
  assert.equal(shopProfileSchema.safeParse(profile([open, open])).success, false);
  assert.equal(shopProfileSchema.safeParse(profile([], { phone: "12345" })).success, false);
});

test("confirms what the owner saved and drops what they cleared", () => {
  const confirmed = confirmedAfterEdit(
    { phone: true, whatsapp: true, products: true },
    { name: "Shop", category: "other", description: null, phone: "9876543210", whatsapp: null, address: "MG Road" },
  );
  assert.deepEqual(confirmed, {
    products: true,
    hours: true,
    name: true,
    category: true,
    phone: true,
    address: true,
  });
});
