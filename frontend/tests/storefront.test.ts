import assert from "node:assert/strict";
import { test } from "node:test";
import { hasAcceptedPrivacy, PRIVACY_VERSION } from "../src/lib/consent";
import { openStatus } from "../src/lib/opening";
import {
  addLine,
  fixedPaise,
  orderCount,
  orderText,
  orderTotal,
  parseLines,
  resolveLines,
  setLineQuantity,
  lineKey,
  MAX_QUANTITY,
  type OrderLine,
} from "../src/lib/order";
import { matchesSearch, type StorefrontHour, type StorefrontProduct } from "../src/lib/storefront";

const india = "Asia/Kolkata";
// 3 January 2023 was a Tuesday. These are Indian times, written in UTC.
const at = (date: number, hour: number, minute = 0) =>
  new Date(Date.UTC(2023, 0, date, hour, minute) - 5.5 * 60 * 60 * 1000);

const slot = (day_of_week: number, open_time: string, close_time: string, slotNumber = 0): StorefrontHour => ({
  day_of_week,
  slot: slotNumber,
  open_time,
  close_time,
  is_closed: false,
});
const closed = (day_of_week: number): StorefrontHour => ({
  day_of_week,
  slot: 0,
  open_time: null,
  close_time: null,
  is_closed: true,
});

const week = [closed(0), ...[1, 2, 3, 4, 5, 6].map((day) => slot(day, "09:00:00", "21:00:00"))];

test("open during hours, with the closing time", () => {
  assert.deepEqual(openStatus(week, at(3, 12), india), { open: true, until: "21:00:00" });
});

test("closed exactly at closing time, opening tomorrow", () => {
  assert.deepEqual(openStatus(week, at(3, 21), india), {
    open: false,
    opensAt: "09:00:00",
    opensIn: "tomorrow",
    day: 3,
  });
});

test("before opening, it opens today", () => {
  const status = openStatus(week, at(3, 7), india);
  assert.equal(status?.open === false && status.opensIn, "today");
});

test("uses the shop's time, not the visitor's", () => {
  // 11:00 in New York on a Tuesday is 21:30 in India, after closing.
  assert.equal(openStatus(week, new Date(Date.UTC(2023, 0, 3, 16, 0)), india)?.open, false);
});

test("a closed Sunday points to Monday", () => {
  const status = openStatus(week, at(1, 12), india);
  assert.equal(status?.open === false && status.opensIn, "tomorrow");
});

test("Saturday evening points past a closed Sunday to Monday", () => {
  const status = openStatus(week, at(7, 22), india);
  assert.deepEqual(status, { open: false, opensAt: "09:00:00", opensIn: "later", day: 1 });
});

test("handles an afternoon break", () => {
  const hours = [slot(2, "10:00", "13:00"), slot(2, "16:00", "20:00", 1)];
  const status = openStatus(hours, at(3, 14), india);
  assert.equal(status?.open === false && status.opensAt, "16:00");
  assert.deepEqual(openStatus(hours, at(3, 17), india), { open: true, until: "20:00" });
});

test("hours past midnight stay open into the next day", () => {
  const hours = [slot(2, "18:00", "01:00"), closed(3)];
  assert.deepEqual(openStatus(hours, at(4, 0, 30), india), { open: true, until: "01:00" });
});

test("Saturday night hours reach into Sunday morning", () => {
  assert.equal(openStatus([slot(6, "18:00", "02:00"), closed(0)], at(1, 1), india)?.open, true);
});

test("says nothing about a day the owner never mentioned", () => {
  assert.equal(openStatus([slot(1, "09:00", "21:00")], at(3, 12), india), null);
  assert.equal(openStatus([], at(3, 12), india), null);
  assert.equal(openStatus([closed(2)], at(3, 12), india), null);
});

const product = (extra: Partial<StorefrontProduct>): StorefrontProduct => ({
  name: "Item",
  description: null,
  category: null,
  price_paise: null,
  price_max_paise: null,
  price_from: false,
  unit: null,
  image_url: null,
  attributes: {},
  options: [],
  choices: [],
  images: [],
  is_available: true,
  ...extra,
});

const cake = product({
  name: "Truffle Cake",
  category: "Cakes",
  description: "Rich dark chocolate",
  price_paise: 45000,
  options: [
    { label: "Half kg", price_paise: 45000, is_available: true },
    { label: "1 kg", price_paise: 85000, is_available: false },
  ],
  choices: [{ name: "Type", values: ["Eggless"] }],
});
const pastry = product({ name: "Pastry", price_paise: 6000 });
const wedding = product({ name: "Wedding Cake" });
const frames = product({ name: "Frame", price_paise: 25000, price_max_paise: 90000 });

test("search looks at names, groups, descriptions, options and choices", () => {
  for (const query of ["truffle", "CAKES", "dark", "half", "eggless", "  cake  truffle "]) {
    assert.equal(matchesSearch(cake, query), true, query);
  }
  assert.equal(matchesSearch(cake, "vanilla"), false);
  assert.equal(matchesSearch(cake, "truffle vanilla"), false);
});

test("search works in Hindi", () => {
  assert.equal(matchesSearch(product({ name: "कॉटन कुर्ता" }), "कुर्ता"), true);
});

const line = (name: string, quantity = 1, option: string | null = null, picks: string[] = []): OrderLine => ({
  name,
  option,
  picks,
  quantity,
});

test("adding the same item again raises its quantity, a different option doesn't", () => {
  let lines = addLine([], line("Truffle Cake", 1, "Half kg"));
  lines = addLine(lines, line("Truffle Cake", 2, "Half kg"));
  assert.equal(lines.length, 1);
  assert.equal(lines[0]?.quantity, 3);
  assert.equal(addLine(lines, line("Truffle Cake", 1, "1 kg")).length, 2);
  assert.equal(addLine(lines, line("Truffle Cake", 1, "Half kg", ["Eggless"])).length, 2);
});

test("quantity stays in range and zero removes the line", () => {
  const lines = [line("Pastry", 2)];
  const key = lineKey(lines[0]!);
  assert.equal(setLineQuantity(lines, key, 500)[0]?.quantity, MAX_QUANTITY);
  assert.deepEqual(setLineQuantity(lines, key, 0), []);
});

test("a saved list uses today's prices and drops what's gone or sold out", () => {
  const products = [cake, pastry];
  const resolved = resolveLines(
    [line("Pastry", 2), line("Truffle Cake", 1, "Half kg"), line("Truffle Cake", 1, "1 kg"), line("Removed", 1)],
    products,
  );
  assert.deepEqual(resolved.map((item) => item.totalPaise), [12000, 45000]);
  assert.equal(resolveLines([line("Pastry")], [{ ...pastry, is_available: false }]).length, 0);
  assert.equal(resolveLines([line("Truffle Cake")], products).length, 0);
});

test("a range or unpriced item has no total of its own", () => {
  assert.equal(fixedPaise(frames), null);
  assert.equal(fixedPaise(wedding), null);
  assert.equal(fixedPaise(product({ price_paise: 100, price_from: true })), null);
  assert.equal(fixedPaise(pastry), 6000);
});

test("builds one clear numbered message", () => {
  const resolved = resolveLines(
    [line("Truffle Cake", 2, "Half kg", ["Eggless"]), line("Wedding Cake", 1)],
    [cake, wedding],
  );
  assert.equal(orderCount(resolved), 3);
  assert.equal(orderTotal(resolved), 90000);
  assert.equal(
    orderText(resolved, { intro: "Hello, I'd like to order:", total: "Total: ₹900", toConfirm: "price to confirm" }),
    "Hello, I'd like to order:\n1. Truffle Cake, Half kg, Eggless × 2 — ₹900\n2. Wedding Cake × 1 — price to confirm\n\nTotal: ₹900",
  );
});

test("a damaged saved list is ignored", () => {
  assert.deepEqual(parseLines("not json"), []);
  assert.deepEqual(parseLines('{"a":1}'), []);
  assert.deepEqual(parseLines('[null,{"name":5},{"name":"Pastry","quantity":2}]'), [line("Pastry", 2)]);
});

test("privacy agreement must match the current policy version", () => {
  assert.equal(hasAcceptedPrivacy({ user_metadata: { privacy_version: PRIVACY_VERSION } }), true);
  assert.equal(hasAcceptedPrivacy({ user_metadata: { privacy_version: "2020-01-01" } }), false);
  assert.equal(hasAcceptedPrivacy({ user_metadata: {} }), false);
  assert.equal(hasAcceptedPrivacy({}), false);
});
