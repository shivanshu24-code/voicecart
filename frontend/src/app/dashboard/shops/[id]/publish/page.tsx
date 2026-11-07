import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PublishPanel } from "@/components/publish/publish-panel";
import { api } from "@/lib/api";
import { isPreview } from "@/lib/env";
import { isTemplate, kindOfCategory, type Template } from "@/lib/storefront";

type Details = {
  shop: {
    id: string;
    name: string;
    slug: string | null;
    template: string;
    category: string;
    is_published: boolean;
    logo_url: string | null;
    banner_url: string | null;
  };
  products: unknown[];
  blockers: string[];
  suggestedSlug: string;
};

export default async function PublishPage({ params }: PageProps<"/dashboard/shops/[id]/publish">) {
  if (isPreview) redirect("/dashboard");

  const { id } = await params;
  const t = await getTranslations("publish");
  const details = await api<Details>(`/api/shops/${id}/details`).catch(() => notFound());

  const headerList = await headers();
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const origin = process.env.SITE_URL ?? `${protocol}://${headerList.get("host")}`;
  const template: Template = isTemplate(details.shop.template) ? details.shop.template : "generic";

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft aria-hidden size={15} strokeWidth={1.5} />
        {t("back")}
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">{details.shop.name}</h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/shops/${id}/details`}
            className="rounded-md border border-line bg-card px-4 py-2.5 font-medium transition-colors hover:border-muted"
          >
            {t("editDetails")}
          </Link>
          <Link
            href={`/dashboard/shops/${id}/products`}
            className="rounded-md border border-line bg-card px-4 py-2.5 font-medium transition-colors hover:border-muted"
          >
            {t("editProducts")}
          </Link>
        </div>
      </div>
      <PublishPanel
        shopId={id}
        origin={origin}
        lockedSlug={details.shop.slug}
        initialSlug={details.suggestedSlug}
        initialTemplate={template}
        shopKind={kindOfCategory(details.shop.category)}
        initiallyPublished={details.shop.is_published}
        initialLogo={details.shop.logo_url}
        initialBanner={details.shop.banner_url}
        blockers={details.blockers}
        hasProducts={details.products.length > 0}
      />
    </div>
  );
}
