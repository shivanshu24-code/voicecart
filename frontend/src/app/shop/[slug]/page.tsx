import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Storefront } from "@/components/storefront/storefront";
import { apiUrl } from "@/lib/api-url";
import type { StorefrontData } from "@/lib/storefront";

const getStorefront = cache(async (slug: string) => {
  const response = await fetch(`${apiUrl()}/api/storefront/${encodeURIComponent(slug)}`, {
    cache: "no-store",
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
