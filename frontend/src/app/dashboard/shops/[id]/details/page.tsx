import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShopDetailsForm, type ShopDetails } from "@/components/details/shop-details-form";
import { api } from "@/lib/api";
import { isPreview } from "@/lib/env";
import type { Hour } from "@/lib/voice-types";

type Details = { shop: ShopDetails; hours: Hour[] };

export default async function ShopDetailsPage({ params }: PageProps<"/dashboard/shops/[id]/details">) {
  if (isPreview) redirect("/dashboard");

  const { id } = await params;
  const t = await getTranslations("details");
  const { shop, hours } = await api<Details>(`/api/shops/${id}/details`).catch(() => notFound());

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/dashboard/shops/${id}/publish`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft aria-hidden size={15} strokeWidth={1.5} />
        {t("back")}
      </Link>
      <h1 className="mt-4 font-display text-3xl tracking-tight md:text-4xl">{t("title", { shop: shop.name })}</h1>
      <p className="mt-1 text-muted">{t("body")}</p>
      <ShopDetailsForm shopId={id} shop={shop} hours={hours} />
    </div>
  );
}
