import assert from "node:assert/strict";
import { test } from "node:test";
import { productSchema } from "../src/schemas/onboarding.schema.js";
import { productRow } from "../src/services/pricing.js";

const product = (input: Record<string, unknown>) =>
  productSchema.parse({ name: "Item", description: null, price_rupees: null, unit: null, ...input });

test("a single price stays a single price", () => {
  const row = productRow(product({ price_rupees: 42.5 }));
  assert.equal(row.price_paise, 4250);
  assert.equal(row.price_max_paise, null);
});

test("a range keeps both ends, even when said in reverse", () => {
  const row = productRow(product({ price_rupees: 2000, price_max_rupees: 500 }));
  assert.equal(row.price_paise, 50000);
  assert.equal(row.price_max_paise, 200000);
});

test("a range with equal ends is a single price", () => {
  const row = productRow(product({ price_rupees: 500, price_max_rupees: 500, price_from: true }));
  assert.equal(row.price_max_paise, null);
  assert.equal(row.price_from, true);
});

test("options win over any other price and set the lowest", () => {
  const row = productRow(
    product({
      price_rupees: 1,
      price_max_rupees: 2,
      price_from: true,
      options: [
        { label: "1 kg", price_rupees: 850 },
        { label: "Half kg", price_rupees: 450 },
      ],
    }),
  );
  assert.equal(row.price_paise, 45000);
  assert.equal(row.price_max_paise, null);
  assert.equal(row.price_from, false);
  assert.deepEqual(row.options[1], { label: "Half kg", is_available: true, image_url: null, price_paise: 45000 });
});

test("no price means price on request", () => {
  const row = productRow(product({ price_from: true }));
  assert.equal(row.price_paise, null);
  assert.equal(row.price_from, false);
});

test("the first photo becomes the cover", () => {
  const row = productRow(product({ images: ["https://a.example/1.jpg", "https://a.example/2.jpg"] }));
  assert.equal(row.image_url, "https://a.example/1.jpg");
  assert.equal(productRow(product({})).image_url, null);
});
