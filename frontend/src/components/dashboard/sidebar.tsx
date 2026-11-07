import { Clock, Globe, LayoutDashboard, LogOut, Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";

const upcoming = [
  { key: "products", icon: Package },
  { key: "hours", icon: Clock },
  { key: "website", icon: Globe },
] as const;

export async function Sidebar() {
  const t = await getTranslations("nav");
  const common = await getTranslations("common");

  return (
    <aside className="flex flex-col gap-6 border-b border-line bg-paper p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
      <Link href="/" aria-label={common("appName")} className="px-3 pt-1">
        <Logo size={28} />
      </Link>

      <nav className="flex gap-1 overflow-x-auto md:flex-col">
        <Link
          href="/dashboard"
          aria-current="page"
          className="flex items-center gap-2 rounded-md bg-panel px-3 py-2 whitespace-nowrap"
        >
          <LayoutDashboard aria-hidden size={17} strokeWidth={1.5} />
          {t("overview")}
        </Link>
        {upcoming.map(({ key, icon: Icon }) => (
          <span
            key={key}
            className="flex items-center gap-2 rounded-md px-3 py-2 whitespace-nowrap text-muted"
          >
            <Icon aria-hidden size={17} strokeWidth={1.5} />
            {t(key)}
            <span className="ml-auto text-xs">{t("soon")}</span>
          </span>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-3 md:mt-auto md:flex-col md:items-stretch">
        <LanguageSwitcher />
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:text-ink"
          >
            <LogOut aria-hidden size={16} strokeWidth={1.5} />
            {common("signOut")}
          </button>
        </form>
      </div>
    </aside>
  );
}
