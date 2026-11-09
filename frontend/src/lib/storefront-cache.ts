import "server-only";
import { updateTag } from "next/cache";

/** Every public shop page is cached under this tag. */
export const STOREFRONT_TAG = "storefront";

/**
 * Drops cached shop pages so a shopkeeper's change shows straight away.
 * Only callable from server actions.
 */
export function refreshStorefronts() {
  updateTag(STOREFRONT_TAG);
}
