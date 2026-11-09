import assert from "node:assert/strict";
import { test } from "node:test";
import { draftsFromRows, parseCsv } from "../src/lib/spreadsheet";

test("parseCsv handles quotes, commas and Windows line endings", () => {
  const rows = parseCsv('﻿Name,Price\r\n"Rice, Basmati",120\r\n"Say ""hi""",5\r\n');
  assert.deepEqual(rows, [["Name", "Price"], ["Rice, Basmati", "120"], ['Say "hi"', "5"]]);
});

test("draftsFromRows maps common headers and price forms", () => {
  const result = draftsFromRows([
    [],
    ["Item Name", "MRP (₹)", "Category", "Pack Size", "In Stock"],
    ["Toor Dal", "₹1,160", "Dal", "1 kg", "yes"],
    ["Basmati Rice", "100 - 200", "Rice", "", ""],
    ["Gift Hamper", "", "", "", "no"],
    ["", "", "", "", ""],
  ]);
  assert.ok(result.ok);
  const [dal, rice, hamper] = result.drafts;
  assert.equal(result.drafts.length, 3);
  assert.deepEqual([dal?.kind, dal?.price, dal?.category, dal?.unit, dal?.is_available], ["fixed", "1160", "Dal", "1 kg", true]);
  assert.deepEqual([rice?.kind, rice?.price, rice?.priceMax], ["range", "100", "200"]);
  assert.deepEqual([hamper?.kind, hamper?.is_available], ["request", false]);
});

test("draftsFromRows reads Hindi headers and numbers from Excel", () => {
  const result = draftsFromRows([["नाम", "दाम"], ["चीनी", 45]]);
  assert.ok(result.ok);
  assert.equal(result.drafts[0]?.price, "45");
});

test("draftsFromRows skips repeated names and rows with no name", () => {
  const result = draftsFromRows([["name", "price"], ["Salt", "20"], ["salt", "22"], ["", "9"]]);
  assert.ok(result.ok);
  assert.equal(result.drafts.length, 1);
  assert.equal(result.skipped, 2);
});

test("draftsFromRows explains sheets it can't use", () => {
  assert.deepEqual(draftsFromRows([]), { ok: false, code: "sheetEmpty" });
  assert.deepEqual(draftsFromRows([["foo", "bar"], ["a", "b"]]), { ok: false, code: "sheetNoName" });
});

test("the sample grocery sheets read cleanly", async () => {
  const { readFileSync } = await import("node:fs");
  const { readSheet } = await import("read-excel-file/node");
  const csv = draftsFromRows(parseCsv(readFileSync("../docs/samples/grocery-products.csv", "utf8")));
  const xlsx = draftsFromRows(await readSheet("../docs/samples/grocery-products.xlsx"));
  for (const result of [csv, xlsx]) {
    assert.ok(result.ok);
    assert.equal(result.drafts.length, 60);
    assert.equal(result.skipped, 0);
    assert.deepEqual(
      result.drafts.filter((draft) => draft.kind !== "fixed").map((draft) => draft.kind),
      ["request", "range"],
    );
  }
});
