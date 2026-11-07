import { useTranslations } from "next-intl";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";

const primary =
  "inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-brand-dark";

export function SiteHeader() {
  const t = useTranslations("landing");

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5 md:px-8">
        <Link href="/" aria-label={t("home")}>
          <Logo animated />
        </Link>
        <nav aria-label={t("mainNav")} className="hidden items-center gap-8 text-sm text-muted lg:flex">
          <Link href="/#how" className="transition-colors hover:text-ink">{t("nav.how")}</Link>
          <Link href="/#features" className="transition-colors hover:text-ink">{t("nav.features")}</Link>
          <Link href="/#designs" className="transition-colors hover:text-ink">{t("nav.designs")}</Link>
          <Link href="/#faq" className="transition-colors hover:text-ink">{t("nav.faq")}</Link>
        </nav>
        <div className="flex items-center gap-5">
          <span className="hidden md:block"><LanguageSwitcher /></span>
          <Link href="/login" className="hidden text-sm transition-colors hover:text-brand sm:block">
            {t("signIn")}
          </Link>
          <Link href="/login" className={primary}>
            {t("start")}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooterBar() {
  const t = useTranslations("landing");

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-8 text-sm text-muted md:px-8">
        <Logo size={26} className="text-ink" />
        <div className="flex flex-wrap items-center gap-6">
          <Link href="/#features" className="hover:text-ink">{t("nav.features")}</Link>
          <Link href="/privacy" className="hover:text-ink">{t("privacy")}</Link>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
