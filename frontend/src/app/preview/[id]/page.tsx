import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront/storefront";
import { api } from "@/lib/api";
import { withSampleContent } from "@/lib/sample-storefront";
import { isTemplate, type StorefrontData } from "@/lib/storefront";

export const metadata: Metadata = { robots: { index: false } };

/** Shows a draft to its owner. The backend refuses anyone else. */
export default async function PreviewPage({ params, searchParams }: PageProps<"/preview/[id]">) {
  const { id } = await params;
  const { template } = await searchParams;
  const data = await api<StorefrontData>(`/api/shops/${id}/details`).catch(() => notFound());

  const chosen = isTemplate(template)
    ? template
    : isTemplate(data.shop.template)
      ? data.shop.template
      : "generic";

  return <Storefront data={withSampleContent(data, chosen)} template={chosen} />;
}
