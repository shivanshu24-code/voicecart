import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { config } from "../src/config.js";
import { ApiError } from "../src/lib/errors.js";
import { assertShopImages, isShopImage, signUpload } from "../src/services/images.js";

const shop = "d3a40ad8-f912-4296-8116-d4fdb19be5f0";
const other = "56b046ca-9e36-41eb-ad58-cd2be6f1599f";

Object.assign(config, { cloudinaryCloud: "demo", cloudinaryKey: "123", cloudinarySecret: "shh" });
const base = "https://res.cloudinary.com/demo/image/upload";

test("accepts a photo in the shop's own folder", () => {
  assert.equal(isShopImage(`${base}/v1700/voicecart/${shop}/abc_1.jpg`, shop), true);
});

test("rejects another shop's folder, other hosts and odd paths", () => {
  assert.equal(isShopImage(`${base}/v1/voicecart/${other}/abc.jpg`, shop), false);
  assert.equal(isShopImage(`https://evil.example/voicecart/${shop}/abc.jpg`, shop), false);
  assert.equal(isShopImage(`https://res.cloudinary.com/other/image/upload/voicecart/${shop}/a.jpg`, shop), false);
  assert.equal(isShopImage(`${base}/v1/voicecart/${shop}/../x/a.jpg`, shop), false);
  assert.equal(isShopImage(`${base}/v1/voicecart/${shop}/a.svg`, shop), false);
});

test("blocks a save with a foreign photo and ignores empty slots", () => {
  assert.throws(() => assertShopImages(["https://evil.example/a.jpg"], shop), ApiError);
  assert.doesNotThrow(() => assertShopImages([null, undefined], shop));
});

test("signs the upload for this shop's folder without exposing the secret", () => {
  const upload = signUpload(shop);
  const text = `allowed_formats=${upload.allowed_formats}&folder=voicecart/${shop}&timestamp=${upload.timestamp}&transformation=${upload.transformation}shh`;
  assert.equal(upload.signature, createHash("sha1").update(text).digest("hex"));
  assert.equal(JSON.stringify(upload).includes("shh"), false);
});
