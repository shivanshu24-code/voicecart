import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Storefront } from "@/components/storefront/storefront";
import { apiUrl } from "@/lib/api-url";
import type { StorefrontData } from "@/lib/storefront";
import { STOREFRONT_TAG } from "@/lib/storefront-cache";

const getStorefront = cache(async (slug: string) => {
  const response = await fetch(`${apiUrl()}/api/storefront/${encodeURIComponent(slug)}`, {
    // Cached so most visits skip the API entirely. Owner edits clear it at once,
    // and the time limit is a backstop for changes made elsewhere.
    next: { revalidate: 300, tags: [STOREFRONT_TAG] },
  });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("storefront_unavailable");

  const body = (await response.json()) as { data: StorefrontData };
  return body.data;
});

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { shop } = await getStorefront(slug);
  const description = shop.description ?? shop.address ?? undefined;

  return {
    title: shop.name,
    description,
    openGraph: { title: shop.name, description, type: "website" },
  };
}

export default async function ShopPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  return <Storefront data={await getStorefront(slug)} />;
}
