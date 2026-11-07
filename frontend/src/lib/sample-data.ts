import type { Shop } from "@/lib/api";

/** Shown only in local preview mode, when Supabase isn't configured. */
export const sampleShops: Shop[] = [
  {
    id: "sample-1",
    name: "Sharma Kirana Store",
    slug: "sharma-kirana",
    category: "grocery",
    is_published: true,
    product_count: 24,
  },
  {
    id: "sample-2",
    name: "Meera Fashion House",
    slug: null,
    category: "clothing",
    is_published: false,
    product_count: 0,
  },
];
