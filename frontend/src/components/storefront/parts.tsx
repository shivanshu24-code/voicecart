import { MapPin, MessageCircle, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { imageUrl } from "@/lib/images";
import { HideWhileSearching, SearchBox, SearchResults } from "./search";
import {
  cityOf,
  coverOf,
  formatPrice,
  groupHours,
  groupId,
  mapLink,
  priceOf,
  whatsappLink,
  type StorefrontHour,
  type StorefrontProduct,
  type StorefrontShop,
} from "@/lib/storefront";

export function Price({ product }: { product: StorefrontProduct }) {
  const t = useTranslations("storefront");

  if (!product.is_available) return <span className="text-sm opacity-60">{t("unavailable")}</span>;

  const { low, high, from, unit } = priceOf(product);
  if (low === null) return <span className="text-sm opacity-60">{t("askPrice")}</span>;

  const price = high === null ? formatPrice(low) : `${formatPrice(low)} – ${formatPrice(high)}`;
  return (
    <span className="whitespace-nowrap tabular-nums">
      {from ? t("priceFrom", { price }) : price}
      {unit && <span className="text-[0.85em] opacity-60"> / {unit}</span>}
    </span>
  );
}

type PhotoProps = {
  src: string;
  alt: string;
  width: number;
  height?: number;
  className?: string;
  eager?: boolean;
};

export function Photo({ src, alt, width, height, className = "", eager = false }: PhotoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary sizes and compresses these
    <img
      src={imageUrl(src, { width, height })}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      className={`object-cover ${className}`}
    />
  );
}

/** A small photo for list rows. Rows without a photo keep their text-only look. */
export function ProductThumb({ product, className = "" }: { product: StorefrontProduct; className?: string }) {
  const cover = coverOf(product);
  if (!cover) return null;
  return <Photo src={cover} alt="" width={200} height={200} className={`shrink-0 ${className}`} />;
}

/** A banner behind a dark hero. The tint keeps the text readable on any photo. */
export function Backdrop({ shop, tint }: { shop: StorefrontShop; tint: string }) {
  if (!shop.banner_url) return null;
  return (
    <>
      <Photo src={shop.banner_url} alt="" width={1920} height={1000} eager className="absolute inset-0 size-full" />
      <div aria-hidden className={`absolute inset-0 ${tint}`} />
    </>
  );
}

export function Logo({ shop, className = "h-8" }: { shop: StorefrontShop; className?: string }) {
  if (!shop.logo_url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary sizes and compresses these
    <img
      src={imageUrl(shop.logo_url, { width: 320, height: 160, fit: "limit" })}
      alt=""
      className={`w-auto max-w-32 shrink-0 object-contain ${className}`}
    />
  );
}

/** A quiet preview of the variety inside a product, such as "Half kg · 1 kg · 2 kg". */
export function Variety({ product, className = "" }: { product: StorefrontProduct; className?: string }) {
  const t = useTranslations("storefront");
  const labels = product.options.length > 0
    ? product.options.map((option) => option.label)
    : (product.choices[0]?.values ?? []);
  if (labels.length === 0) return null;

  const shown = labels.slice(0, 4).join(" · ");
  const hidden = labels.length - 4;
  return <p className={className}>{hidden > 0 ? t("moreOptions", { shown, count: hidden }) : shown}</p>;
}

/** Search appears once there's enough to search; the links once there's more than one group. */
const SEARCH_FROM = 5;

type Groups = { category: string; items: unknown[] }[];

export function GroupLinks({ groups, className = "" }: { groups: Groups; className?: string }) {
  const t = useTranslations("storefront");
  const total = groups.reduce((count, group) => count + group.items.length, 0);

  return (
    <>
      {total >= SEARCH_FROM && <SearchBox />}
      {total >= SEARCH_FROM && <SearchResults />}
      {groups.length > 1 && (
        <HideWhileSearching>
          <nav aria-label={t("productGroups")} className="mt-6 flex max-w-full gap-5 overflow-x-auto pb-1 text-sm whitespace-nowrap">
            {groups.map(({ category }, index) => (
              <a key={category} href={`#${groupId(index)}`} className={`underline-offset-4 hover:underline ${className}`}>
                {category || t("otherItems")}
              </a>
            ))}
          </nav>
        </HideWhileSearching>
      )}
    </>
  );
}

function useDayName() {
  const locale = useLocale();
  // 1 January 2023 was a Sunday, so day 0 lines up with Date.UTC(2023, 0, 1).
  return (index: number) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
      Date.UTC(2023, 0, 1 + index),
    );
}

export function HoursList({ hours }: { hours: StorefrontHour[] }) {
  const t = useTranslations("storefront");
  const day = useDayName();

  return (
    <dl className="space-y-2 text-[0.95rem]">
      {groupHours(hours).map((row) => (
        <div key={row.from} className="flex justify-between gap-6">
          <dt className="opacity-65">
            {day(row.from)}
            {row.to !== row.from && ` – ${day(row.to)}`}
          </dt>
          <dd className="text-right">{row.closed ? t("closed") : row.times}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Directions({ address }: { address: string }) {
  const t = useTranslations("storefront");

  return (
    <a
      href={mapLink(address)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
    >
      <MapPin aria-hidden size={14} strokeWidth={1.5} />
      {t("directions")}
    </a>
  );
}

/** Text shown above a shop's name, such as "Grocery · Indore". */
export function Eyebrow({ shop, className = "" }: { shop: StorefrontShop; className?: string }) {
  const category = useTranslations("categories");
  const city = cityOf(shop.address);
  const known = ["grocery", "clothing", "electronics", "bakery"].includes(shop.category);

  if (!known && !city) return null;
  return (
    <p className={`text-sm ${className}`}>
      {known && category(shop.category as "grocery")}
      {known && city && " · "}
      {city}
    </p>
  );
}

export function Tagline({ shop, fallback }: { shop: StorefrontShop; fallback: string }) {
  return <>{shop.description || fallback}</>;
}

/** The single best way to reach the shop: WhatsApp when there is one, otherwise a call. */
export function ContactLink({ shop, className = "" }: { shop: StorefrontShop; className?: string }) {
  const t = useTranslations("storefront");
  const message = t("whatsappMessage", { shop: shop.name });

  if (shop.whatsapp) {
    return (
      <a href={whatsappLink(shop.whatsapp, message)} target="_blank" rel="noreferrer" className={className}>
        <MessageCircle aria-hidden size={17} strokeWidth={1.75} />
        {t("whatsapp")}
      </a>
    );
  }
  if (shop.phone) {
    return (
      <a href={`tel:${shop.phone}`} className={className}>
        <Phone aria-hidden size={17} strokeWidth={1.75} />
        {t("call")}
      </a>
    );
  }
  return null;
}

export function CallLink({ shop, className = "" }: { shop: StorefrontShop; className?: string }) {
  const t = useTranslations("storefront");
  if (!shop.phone || !shop.whatsapp) return null;

  return (
    <a href={`tel:${shop.phone}`} className={className}>
      <Phone aria-hidden size={17} strokeWidth={1.75} />
      {t("call")}
    </a>
  );
}

const pill = "inline-flex items-center gap-2 font-medium transition-opacity hover:opacity-85";

export function SiteNav({ shop, className = "", cta }: { shop: StorefrontShop; className?: string; cta: string }) {
  const t = useTranslations("storefront");

  return (
    <nav className={`sticky top-0 z-20 ${className}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 md:px-8">
        <a href="#top" className="flex min-w-0 items-center gap-3 font-display text-xl">
          <Logo shop={shop} />
          <span className="truncate">{shop.name}</span>
        </a>
        <div className="flex shrink-0 items-center gap-7 text-sm">
          <a href="#products" className="hidden hover:opacity-70 md:block">
            {t("products")}
          </a>
          <a href="#visit" className="hidden hover:opacity-70 md:block">
            {t("visit")}
          </a>
          <span className="hidden md:block">
            <ContactLink shop={shop} className={`px-4 py-2 ${pill} ${cta}`} />
          </span>
        </div>
      </div>
    </nav>
  );
}

export const buttonBase = `${pill} justify-center px-6 py-3.5`;

/** Phones only: the nav button is hidden there, so this keeps contact one tap away. */
export function ContactBar({ shop }: { shop: StorefrontShop }) {
  const t = useTranslations("storefront");
  const message = t("whatsappMessage", { shop: shop.name });
  const button = "flex flex-1 items-center justify-center gap-2 px-4 py-3 font-medium";

  return (
    <div className="border-t border-black/10 bg-white p-3 md:hidden">
      <div className="flex gap-3">
        {shop.whatsapp && (
          <a
            href={whatsappLink(shop.whatsapp, message)}
            target="_blank"
            rel="noreferrer"
            className={`${button} bg-(--shop) text-white`}
          >
            <MessageCircle aria-hidden size={18} strokeWidth={1.75} />
            {t("whatsapp")}
          </a>
        )}
        {shop.phone && (
          <a
            href={`tel:${shop.phone}`}
            className={`${button} ${shop.whatsapp ? "border border-black/15 text-[#1f1e1b]" : "bg-(--shop) text-white"}`}
          >
            <Phone aria-hidden size={18} strokeWidth={1.75} />
            {t("call")}
          </a>
        )}
      </div>
    </div>
  );
}

export function SiteFooter({ shop, className = "" }: { shop: StorefrontShop; className?: string }) {
  const t = useTranslations("storefront");

  return (
    <footer className={className}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm md:px-8">
        <p>
          <span className="font-display text-lg">{shop.name}</span>
          <span className="ml-3 opacity-60">{t("madeWith")}</span>
          <Link href="/privacy" className="ml-3 underline underline-offset-4 opacity-60 hover:opacity-100">
            {t("privacy")}
          </Link>
        </p>
        <LanguageSwitcher />
      </div>
    </footer>
  );
}
