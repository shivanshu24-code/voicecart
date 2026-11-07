import { createHash } from "node:crypto";
import { config } from "../config.js";
import { ApiError } from "../lib/errors.js";
import type { Product } from "../schemas/onboarding.schema.js";

const folderFor = (shopId: string) => `voicecart/${shopId}`;

/** Lets the owner's browser upload into this shop's folder only, for about an hour. */
export function signUpload(shopId: string) {
  const { cloudinaryCloud, cloudinaryKey, cloudinarySecret } = config;
  if (!cloudinaryCloud || !cloudinaryKey || !cloudinarySecret) {
    throw new ApiError(503, "uploads_not_configured", "Photo uploads are not configured.");
  }

  const params = {
    allowed_formats: "jpg,jpeg,png,webp,heic",
    folder: folderFor(shopId),
    timestamp: String(Math.floor(Date.now() / 1000)),
    // Keeps originals to a sensible size, however large the phone's photo is.
    transformation: "c_limit,w_2400,h_2400",
  };

  // Cloudinary signs the parameters in alphabetical order, as above.
  const signed = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const signature = createHash("sha1").update(`${signed}${cloudinarySecret}`).digest("hex");

  return { ...params, signature, api_key: cloudinaryKey, cloud_name: cloudinaryCloud };
}

/** Only photos in this shop's own folder, so a page can't load images from elsewhere. */
export function isShopImage(url: string, shopId: string) {
  const prefix = `https://res.cloudinary.com/${config.cloudinaryCloud}/image/upload/`;
  if (!url.startsWith(prefix)) return false;
  const path = url.slice(prefix.length).replace(/^v\d+\//, "");
  return new RegExp(`^${folderFor(shopId)}/[\\w-]+\\.(jpe?g|png|webp|heic)$`).test(path);
}

export function assertShopImages(urls: (string | null | undefined)[], shopId: string) {
  if (urls.some((url) => url && !isShopImage(url, shopId))) {
    throw new ApiError(400, "image_invalid", "That photo can't be used.");
  }
}

export const productImages = (product: Product) => [
  ...product.images,
  ...product.options.map((option) => option.image_url),
  ...product.choices.flatMap((choice) => Object.values(choice.images)),
];
