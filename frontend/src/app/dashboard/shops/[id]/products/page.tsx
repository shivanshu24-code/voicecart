import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductManager } from "@/components/products/product-manager";
import type { ShopKind } from "@/components/products/product-fields";
import { api } from "@/lib/api";
import { isPreview } from "@/lib/env";
import type { ProductRow } from "@/lib/storefront";

type Details = {
  shop: { name: string; category: ShopKind };
  products: ProductRow[];
};

export default async function ProductsPage({ params }: PageProps<"/dashboard/shops/[id]/products">) {
  if (isPreview) redirect("/dashboard");

  const { id } = await params;
  const t = await getTranslations("products");
  const { shop, products } = await api<Details>(`/api/shops/${id}/details`).catch(() => notFound());

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/dashboard/shops/${id}/publish`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft aria-hidden size={15} strokeWidth={1.5} />
        {t("back")}
      </Link>
      <h1 className="mt-4 font-display text-3xl tracking-tight md:text-4xl">{t("title", { shop: shop.name })}</h1>
      <p className="mt-1 text-muted">{t("body")}</p>
      <ProductManager shopId={id} shopKind={shop.category} initialProducts={products} />
    </div>
  );
}
