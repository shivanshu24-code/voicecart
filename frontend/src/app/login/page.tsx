import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { CSSProperties } from "react";
import { GoogleButton } from "@/components/auth/google-button";
import { Logo } from "@/components/brand/logo";
import { VoiceDemo } from "@/components/auth/voice-demo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { isAuthConfigured, isPreview } from "@/lib/env";

const order = (i: number) => ({ "--i": i }) as CSSProperties;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const t = await getTranslations("login");
  const common = await getTranslations("common");

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="flex flex-col justify-between gap-16 p-6 sm:p-10 lg:p-14">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label={common("appName")}>
            <Logo />
          </Link>
          <LanguageSwitcher />
        </header>

        <div className="max-w-lg">
          <h1 className="rise font-display text-5xl leading-[1.08] tracking-tight sm:text-6xl">
            {t("title")}
          </h1>
          <p className="rise mt-6 max-w-md text-lg leading-relaxed text-muted" style={order(1)}>
            {t("subtitle")}
          </p>

          <div className="rise mt-10 max-w-xs" style={order(2)}>
            {error && (
              <p role="alert" className="mb-4 text-sm text-accent">
                {t("failed")}
              </p>
            )}
            {isAuthConfigured ? (
              <GoogleButton label={t("google")} />
            ) : (
              <p className="text-sm text-muted">{t("notConfigured")}</p>
            )}
            {isPreview && (
              <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
                {t("openPreview")}
              </Link>
            )}
          </div>
        </div>

        <p className="text-sm text-muted">
          {t("footnote")}{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            {t("privacy")}
          </Link>
        </p>
      </section>

      <section className="flex items-center justify-center bg-panel p-6 py-16 sm:p-10 lg:p-14">
        <VoiceDemo />
      </section>
    </main>
  );
}
