import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { acceptPrivacy, signOut } from "@/app/actions";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PolicyContent } from "@/components/landing/policy-content";

export const metadata: Metadata = { title: "Privacy Policy | VoiceCart", robots: { index: false } };

/** Shown once after sign-in. The proxy keeps people here until they agree. */
export default async function ConsentPage({ searchParams }: PageProps<"/consent">) {
  const { error } = await searchParams;
  const t = await getTranslations("consent");
  const policy = await getTranslations("privacy");

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3.5">
          <Logo />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl px-5 py-8 md:py-12">
          <h1 className="font-display text-4xl tracking-tight md:text-5xl">{t("title")}</h1>
          <p className="mt-3 text-lg leading-relaxed text-muted">{t("body")}</p>
          <p className="mt-6 text-sm text-muted">{policy("updated")}</p>
          <div className="mt-8">
            <PolicyContent />
          </div>
        </div>
      </main>

      <footer className="border-t border-line bg-card">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm text-muted">{t("note")}</p>
            {error && (
              <p role="alert" className="mt-1 text-sm text-accent">
                {t("failed")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <form action={signOut}>
              <button type="submit" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
                {t("decline")}
              </button>
            </form>
            <form action={acceptPrivacy}>
              <button type="submit" className="rounded-md bg-brand px-6 py-3 font-medium text-paper transition-colors hover:bg-brand-dark">
                {t("agree")}
              </button>
            </form>
          </div>
        </div>
      </footer>
    </div>
  );
}
