import { Mic, Store } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CreateShopForm } from "@/components/dashboard/create-shop-form";
import { api, type Shop } from "@/lib/api";
import { isPreview } from "@/lib/env";
import { sampleShops } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/server";

async function loadDashboard() {
  if (isPreview) return { shops: sampleShops, name: undefined, failed: false };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const name = data?.claims.user_metadata?.full_name as string | undefined;

  try {
    return { shops: await api<Shop[]>("/api/shops"), name, failed: false };
  } catch {
    return { shops: [], name, failed: true };
  }
}

export default async function DashboardPage() {
  const { shops, name, failed } = await loadDashboard();
  const t = await getTranslations("dashboard");
  const category = await getTranslations("categories");

  const published = shops.filter((shop) => shop.is_published).length;
  const stats = [
    { label: t("stats.shops"), value: shops.length },
    { label: t("stats.published"), value: published },
    { label: t("stats.drafts"), value: shops.length - published },
    { label: t("stats.products"), value: shops.reduce((sum, shop) => sum + shop.product_count, 0) },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {isPreview && (
        <p className="border-b border-line pb-3 text-sm text-muted">{t("previewBanner")}</p>
      )}
      {failed && (
        <p role="alert" className="border-b border-line pb-3 text-sm text-accent">
          {t("loadFailed")}
        </p>
      )}

      <header>
        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          {name ? t("greeting", { name }) : t("greetingFallback")}
        </h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </header>

      <dl className="grid grid-cols-2 gap-y-6 border-y border-line py-6 lg:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 font-display text-4xl">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <section className="rounded-md border border-line bg-card lg:col-span-2">
          <h2 className="border-b border-line p-4 font-medium">{t("shops.title")}</h2>
          {shops.length === 0 ? (
            <div className="p-10 text-center">
              <Store aria-hidden className="mx-auto text-muted" size={26} strokeWidth={1.25} />
              <p className="mt-3 font-medium">{t("shops.emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted">{t("shops.emptyBody")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {shops.map((shop) => (
                <li key={shop.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{shop.name}</p>
                    <p className="text-sm text-muted">
                      {category(shop.category)} ·{" "}
                      {t("shops.productCount", { count: shop.product_count })}
                    </p>
                  </div>
                  {!isPreview && (
                    <Link
                      href={`/dashboard/shops/${shop.id}/publish`}
                      className="ml-auto shrink-0 text-sm underline underline-offset-4"
                    >
                      {shop.product_count === 0
                        ? t("shops.setup")
                        : shop.is_published
                          ? t("shops.manage")
                          : t("shops.publish")}
                    </Link>
                  )}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      shop.is_published
                        ? "bg-brand-soft text-brand-dark"
                        : "bg-accent-soft text-accent"
                    }`}
                  >
                    {shop.is_published ? t("shops.published") : t("shops.draft")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-md border border-line bg-card p-4">
            <h2 className="mb-4 font-medium">{t("create.title")}</h2>
            <CreateShopForm disabled={isPreview} />
          </section>
          <section className="rounded-md bg-panel p-4">
            <h2 className="flex items-center gap-2 font-medium">
              <Mic aria-hidden size={17} strokeWidth={1.5} />
              {t("voice.title")}
            </h2>
            <p className="mt-2 text-sm text-muted">{t("voice.body")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
