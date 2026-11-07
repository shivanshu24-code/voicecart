import assert from "node:assert/strict";
import { test } from "node:test";
import { businessProfileSchema, emptyProfile, type Extraction } from "../src/schemas/onboarding.schema.js";
import { mergeExtraction, normalisePhone } from "../src/services/merge.js";
import { missingFields, nextQuestion } from "../src/services/questions.js";

const draftAtta = {
  name: "Atta",
  description: null,
  category: null,
  price_rupees: 40,
  price_max_rupees: null,
  price_from: false,
  unit: "kg",
  options: [],
  choices: [],
  images: [],
};

type ExtractedProduct = Extraction["products"][number];
type ProductInput = Pick<ExtractedProduct, "name" | "evidence"> & Partial<ExtractedProduct>;
type ExtractionInput = Omit<Partial<Extraction>, "products"> & { products?: ProductInput[] };

const extraction = ({ products = [], ...partial }: ExtractionInput): Extraction => ({
  fields: [],
  hours: [],
  clarification: null,
  ...partial,
  products: products.map((product) => ({
    description: null,
    category: null,
    price_rupees: null,
    price_max_rupees: null,
    price_from: false,
    unit: null,
    options: [],
    choices: [],
    ...product,
  })),
});

test("keeps a value quoted from the owner's message", () => {
  const { profile } = mergeExtraction(
    emptyProfile,
    extraction({ fields: [{ field: "name", value: "Sharma Store", evidence: "Sharma Store" }] }),
    "We are Sharma Store in Indore",
  );
  assert.equal(profile.name, "Sharma Store");
});

test("rejects a value the owner never said", () => {
  const { profile, rejected } = mergeExtraction(
    emptyProfile,
    extraction({ fields: [{ field: "phone", value: "9876543210", evidence: "9876543210" }] }),
    "We sell atta and rice",
  );
  assert.equal(profile.phone, null);
  assert.deepEqual(rejected, ["phone"]);
});

test("rejects a product with no supporting words", () => {
  const { profile } = mergeExtraction(
    emptyProfile,
    extraction({
      products: [
        { name: "Sugar", description: null, price_rupees: 45, unit: "kg", evidence: "sugar" },
      ],
    }),
    "We sell atta",
  );
  assert.equal(profile.products.length, 0);
});

test("matches Hindi evidence despite punctuation", () => {
  const { profile } = mergeExtraction(
    emptyProfile,
    extraction({ fields: [{ field: "name", value: "शर्मा स्टोर", evidence: "शर्मा स्टोर" }] }),
    "हमारी दुकान, शर्मा स्टोर, इंदौर में है।",
  );
  assert.equal(profile.name, "शर्मा स्टोर");
});

test("a correction replaces only the corrected field", () => {
  const start = { ...emptyProfile, name: "Sharma Store", address: "MG Road" };
  const { profile } = mergeExtraction(
    start,
    extraction({ fields: [{ field: "address", value: "Station Road", evidence: "Station Road" }] }),
    "Actually we are on Station Road",
  );
  assert.equal(profile.name, "Sharma Store");
  assert.equal(profile.address, "Station Road");
});

test("a repeated product updates instead of duplicating", () => {
  const start = {
    ...emptyProfile,
    products: [draftAtta],
  };
  const { profile } = mergeExtraction(
    start,
    extraction({
      products: [
        { name: "atta", description: null, price_rupees: 42, unit: null, evidence: "atta is 42" },
      ],
    }),
    "Now atta is 42",
  );
  assert.equal(profile.products.length, 1);
  assert.equal(profile.products[0]?.price_rupees, 42);
  assert.equal(profile.products[0]?.unit, "kg");
});

test("stores split hours as two slots on one day", () => {
  const evidence = "9 to 1 and 5 to 9";
  const { profile } = mergeExtraction(
    emptyProfile,
    extraction({
      hours: [
        { day_of_week: 1, open_time: "09:00", close_time: "13:00", is_closed: false, evidence },
        { day_of_week: 1, open_time: "17:00", close_time: "21:00", is_closed: false, evidence },
      ],
    }),
    "Monday 9 to 1 and 5 to 9",
  );
  assert.deepEqual(
    profile.hours.map((hour) => hour.slot),
    [0, 1],
  );
});

test("rejects impossible times", () => {
  const { profile, rejected } = mergeExtraction(
    emptyProfile,
    extraction({
      hours: [
        { day_of_week: 1, open_time: "25:00", close_time: "13:00", is_closed: false, evidence: "x" },
      ],
    }),
    "x",
  );
  assert.equal(profile.hours.length, 0);
  assert.deepEqual(rejected, ["hours"]);
});

test("rejects an unknown category", () => {
  const { profile } = mergeExtraction(
    emptyProfile,
    extraction({ fields: [{ field: "category", value: "toys", evidence: "toys" }] }),
    "We sell toys",
  );
  assert.equal(profile.category, null);
});

test("normalises Indian phone numbers", () => {
  assert.equal(normalisePhone("+91 98765 43210"), "9876543210");
  assert.equal(normalisePhone("९८७६५४३२१०"), "9876543210");
  assert.equal(normalisePhone("12345"), null);
});

test("does not change the profile passed in", () => {
  const start = { ...emptyProfile, hours: [], products: [] };
  mergeExtraction(
    start,
    extraction({
      products: [{ name: "Atta", description: null, price_rupees: 40, unit: null, evidence: "atta" }],
    }),
    "atta",
  );
  assert.equal(start.products.length, 0);
});

test("asks for missing details, then finishes", () => {
  assert.deepEqual(missingFields(emptyProfile), [
    "name",
    "category",
    "hours",
    "products",
    "contact",
    "address",
  ]);
  const complete = {
    ...emptyProfile,
    name: "Sharma Store",
    category: "grocery" as const,
    phone: "9876543210",
    address: "MG Road",
    hours: [
      { day_of_week: 1, slot: 0, open_time: "09:00", close_time: "21:00", is_closed: false },
    ],
    products: [draftAtta],
  };
  assert.deepEqual(missingFields(complete), []);
  assert.match(nextQuestion(complete, "en"), /review/);
});

test("keeps a price range and a starting price", () => {
  const { profile } = mergeExtraction(
    emptyProfile,
    extraction({
      products: [
        { name: "Cakes", price_rupees: 500, price_max_rupees: 2000, evidence: "cakes 500 to 2000" },
        { name: "Pastries", price_rupees: 60, price_from: true, evidence: "pastries start at 60" },
      ],
    }),
    "cakes 500 to 2000 and pastries start at 60",
  );
  assert.equal(profile.products[0]?.price_max_rupees, 2000);
  assert.equal(profile.products[1]?.price_from, true);
});

test("keeps only the options and choices the owner said", () => {
  const { profile } = mergeExtraction(
    emptyProfile,
    extraction({
      products: [
        {
          name: "Truffle Cake",
          evidence: "truffle cake",
          options: [
            { label: "Half kg", price_rupees: 450, evidence: "half kg 450" },
            { label: "2 kg", price_rupees: 1600, evidence: "2 kg 1600" },
          ],
          choices: [
            { name: "Type", values: ["Eggless"], evidence: "eggless too" },
            { name: "Colour", values: ["Pink"], evidence: "pink icing" },
          ],
        },
      ],
    }),
    "truffle cake half kg 450, eggless too",
  );
  assert.deepEqual(profile.products[0]?.options, [
    { label: "Half kg", price_rupees: 450, is_available: true, image_url: null },
  ]);
  assert.deepEqual(profile.products[0]?.choices, [{ name: "Type", values: ["Eggless"], images: {} }]);
});

test("a later mention adds options and choices without losing earlier ones", () => {
  const first = mergeExtraction(
    emptyProfile,
    extraction({
      products: [
        {
          name: "Kurta",
          evidence: "kurta",
          options: [{ label: "Cotton", price_rupees: 899, evidence: "cotton 899" }],
          choices: [{ name: "Colour", values: ["Blue"], evidence: "blue" }],
        },
      ],
    }),
    "kurta cotton 899 in blue",
  ).profile;

  const { profile } = mergeExtraction(
    first,
    extraction({
      products: [
        {
          name: "kurta",
          evidence: "kurta",
          options: [
            { label: "cotton", price_rupees: 950, evidence: "cotton is 950" },
            { label: "Silk", price_rupees: 1499, evidence: "silk 1499" },
          ],
          choices: [{ name: "colour", values: ["Blue", "Red"], evidence: "red" }],
        },
      ],
    }),
    "kurta cotton is 950 now, silk 1499, also red",
  );

  assert.deepEqual(profile.products[0]?.options.map((option) => option.price_rupees), [950, 1499]);
  assert.deepEqual(profile.products[0]?.choices, [{ name: "Colour", values: ["Blue", "Red"], images: {} }]);
});

test("a new single price replaces an old range", () => {
  const first = mergeExtraction(
    emptyProfile,
    extraction({
      products: [{ name: "Cakes", price_rupees: 500, price_max_rupees: 2000, evidence: "cakes" }],
    }),
    "cakes 500 to 2000",
  ).profile;

  const { profile } = mergeExtraction(
    first,
    extraction({ products: [{ name: "Cakes", price_rupees: 700, evidence: "cakes are 700" }] }),
    "cakes are 700",
  );
  assert.equal(profile.products[0]?.price_rupees, 700);
  assert.equal(profile.products[0]?.price_max_rupees, null);
});

test("a draft saved before variety existed still loads", () => {
  const parsed = businessProfileSchema.parse({
    ...emptyProfile,
    products: [{ name: "Atta", description: null, price_rupees: 40, unit: "kg" }],
  });
  assert.deepEqual(parsed.products[0]?.options, []);
  assert.equal(parsed.products[0]?.price_from, false);
});

test("an impossible price is dropped so the draft stays valid", () => {
  const { profile } = mergeExtraction(
    emptyProfile,
    extraction({
      products: [
        {
          name: "Atta",
          price_rupees: 99_000_000,
          evidence: "atta",
          options: [{ label: "1 kg", price_rupees: -5, evidence: "atta" }],
        },
      ],
    }),
    "atta",
  );
  assert.equal(profile.products[0]?.price_rupees, null);
  assert.deepEqual(profile.products[0]?.options, []);
  assert.equal(businessProfileSchema.safeParse(profile).success, true);
});

test("accepts an option quoted with its words reordered", () => {
  const { profile } = mergeExtraction(
    emptyProfile,
    extraction({
      products: [
        {
          name: "Truffle Cake",
          evidence: "truffle cake",
          options: [
            { label: "Half kg", price_rupees: 450, evidence: "half kg 450" },
            { label: "5 kg", price_rupees: 3000, evidence: "5 kg 3000" },
          ],
        },
      ],
    }),
    "truffle cake is 450 for half kg, 850 for 1 kg",
  );
  assert.deepEqual(profile.products[0]?.options.map((option) => option.label), ["Half kg"]);
});

test("capitalises spoken names", () => {
  const { profile } = mergeExtraction(
    emptyProfile,
    extraction({
      products: [
        {
          name: "pastries",
          category: "pastries",
          evidence: "pastries",
          options: [{ label: "half kg", price_rupees: 450, evidence: "half kg 450" }],
          choices: [{ name: "flavour", values: ["vanilla"], evidence: "vanilla" }],
        },
      ],
    }),
    "pastries 450 for half kg in vanilla",
  );
  const product = profile.products[0];
  assert.equal(product?.name, "Pastries");
  assert.equal(product?.category, "Pastries");
  assert.equal(product?.options[0]?.label, "Half kg");
  assert.deepEqual(product?.choices, [{ name: "Flavour", values: ["Vanilla"], images: {} }]);
});
