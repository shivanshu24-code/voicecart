import assert from "node:assert/strict";
import { test } from "node:test";
import { publishBlockers, templateForCategory, templates } from "../src/services/publish.js";
import { isValidSlug, slugify } from "../src/services/slug.js";

test("makes English slugs", () => {
  assert.equal(slugify("Sharma Grocery"), "sharma-grocery");
  assert.equal(slugify("  Meera's Fashion & Co. "), "meera-s-fashion-co");
  assert.equal(slugify("Café Delhi"), "cafe-delhi");
});

test("transliterates Hindi names", () => {
  assert.equal(slugify("शर्मा स्टोर"), "sharma-stor");
  assert.equal(slugify("गुप्ता बेकरी"), "gupta-bekari");
  assert.equal(slugify("मीरा फैशन"), "mira-phaishan");
  assert.equal(slugify("किराना"), "kirana");
});

test("handles mixed scripts and numbers", () => {
  assert.equal(slugify("शर्मा Store 24"), "sharma-store-24");
});

test("returns nothing when a name can't make a slug", () => {
  assert.equal(slugify("!!!"), "");
  assert.equal(slugify("ab"), "");
  assert.equal(slugify("Admin"), "");
});

test("validates owner-chosen slugs", () => {
  assert.equal(isValidSlug("sharma-store"), true);
  assert.equal(isValidSlug("Sharma"), false);
  assert.equal(isValidSlug("a--b"), false);
  assert.equal(isValidSlug("-abc"), false);
  assert.equal(isValidSlug("../etc"), false);
  assert.equal(isValidSlug("api"), false);
});

const ready = {
  phone: "9876543210",
  whatsapp: null,
  address: "MG Road",
  confirmed_fields: { phone: true },
};

test("allows a complete, confirmed shop", () => {
  assert.deepEqual(publishBlockers(ready, 2, 7), []);
});

test("blocks an unconfirmed phone number", () => {
  assert.deepEqual(publishBlockers({ ...ready, confirmed_fields: {} }, 2, 7), [
    "contact_unconfirmed",
  ]);
});

test("accepts a confirmed WhatsApp number alone", () => {
  const shop = { ...ready, phone: null, whatsapp: "9876543210", confirmed_fields: { whatsapp: true } };
  assert.deepEqual(publishBlockers(shop, 1, 1), []);
});

test("lists everything missing", () => {
  const shop = { phone: null, whatsapp: null, address: null, confirmed_fields: {} };
  assert.deepEqual(publishBlockers(shop, 0, 0), ["contact", "address", "hours", "products"]);
});

test("every category has a template", () => {
  assert.equal(templateForCategory("bakery"), "storefront-bakery");
  assert.equal(templateForCategory("other"), "storefront-generic");
  assert.equal(templates.length, 25);
  assert.equal(templates.includes(templateForCategory("clothing")), true);
});
