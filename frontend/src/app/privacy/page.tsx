import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PolicyContent } from "@/components/landing/policy-content";
import { SiteFooterBar, SiteHeader } from "@/components/landing/site-chrome";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return { title: `${t("title")} | VoiceCart`, description: t("intro") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");

  return (
    <div className="landing">
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-5 py-12 md:px-8 md:py-20">
        <p className="rise text-sm text-muted">{t("updated")}</p>
        <h1 className="rise mt-3 font-display text-5xl tracking-tight md:text-6xl">{t("title")}</h1>
        <p className="rise mt-5 text-lg leading-relaxed text-muted">{t("intro")}</p>
        <div className="mt-12">
          <PolicyContent />
        </div>
      </main>

      <SiteFooterBar />
    </div>
  );
}
