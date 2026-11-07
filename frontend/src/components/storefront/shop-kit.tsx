import { useTranslations } from "next-intl";
import { imageUrl } from "@/lib/images";
import { coverOf, cityOf, groupId, type StorefrontData, type StorefrontProduct, type StorefrontShop } from "@/lib/storefront";
import type { Theme } from "@/lib/themes";
import { OpenStatusLabel } from "./open-status";
import { OrderButton, QuickAdd } from "./order-list";
import { ContactLink, Directions, HoursList, Photo, Price, SiteFooter, Variety } from "./parts";
import { ProductOpen } from "./product-detail";
import { HideWhileSearching, SearchBox, SearchItem } from "./search";

export type LayoutProps = StorefrontData & { theme: Theme };
export type Group = { category: string; items: StorefrontProduct[] };

export const SEARCH_FROM = 5;

export const headingFont = (theme: Theme) => (theme.serif ? "font-display" : "font-semibold tracking-tight");

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0] ?? "")
    .join("")
    .toUpperCase();

/** The owner's logo, or a tidy monogram so no shop goes without one. */
export function BrandMark({ shop, theme, large = false }: { shop: StorefrontShop; theme: Theme; large?: boolean }) {
  const size = large ? "size-16 text-2xl" : "size-10 text-sm";

  if (shop.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Cloudinary sizes and compresses these
      <img
        src={imageUrl(shop.logo_url, { width: 160, height: 160, fit: "limit" })}
        alt=""
        className={`${size} shrink-0 rounded-(--t-radius) object-contain`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`flex ${size} shrink-0 items-center justify-center rounded-(--t-radius) bg-(--t-accent) text-(--t-on-accent) ${headingFont(theme)}`}
    >
      {initialsOf(shop.name)}
    </span>
  );
}

export function ShopHeader({ shop, products, theme }: LayoutProps & { products: StorefrontProduct[] }) {
  const canSearch = products.length >= SEARCH_FROM;

  return (
    <header className="sticky top-0 z-20 border-b border-(--t-line) bg-(--t-surface)">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 md:flex-nowrap md:px-6">
        <a href="#top" className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
          <BrandMark shop={shop} theme={theme} />
          <span className={`truncate text-lg ${headingFont(theme)}`}>{shop.name}</span>
        </a>
        <div className="order-3 w-full md:order-none md:flex md:flex-1 md:justify-center">
          {canSearch && <SearchBox className="max-w-xl rounded-(--t-radius)" />}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden lg:block">
            <ContactLink shop={shop} className="inline-flex items-center gap-2 text-sm font-medium" />
          </span>
          <OrderButton />
        </div>
      </div>
    </header>
  );
}

export function CategoryChips({ groups }: { groups: Group[] }) {
  const t = useTranslations("storefront");
  if (groups.length < 2) return null;

  return (
    <HideWhileSearching>
      <nav aria-label={t("productGroups")} className="no-scrollbar flex gap-2 overflow-x-auto py-1">
        {groups.map(({ category }, index) => (
          <a
            key={category}
            href={`#${groupId(index)}`}
            className="shrink-0 rounded-full border border-(--t-line) bg-(--t-surface) px-4 py-1.5 text-sm transition-colors hover:border-(--t-accent) hover:text-(--t-accent)"
          >
            {category || t("otherItems")}
          </a>
        ))}
      </nav>
    </HideWhileSearching>
  );
}


/** A photo, or a tinted tile with the product's first letter when there isn't one yet. */
export function ProductImage({ product, theme, className, width = 500, height = 500 }: {
  product: StorefrontProduct;
  theme: Theme;
  className: string;
  width?: number;
  height?: number;
}) {
  const cover = coverOf(product);

  return (
    <div className={`overflow-hidden bg-(--t-tint) ${className}`}>
      {cover ? (
        <Photo src={cover} alt={product.name} width={width} height={height} className="zoom size-full" />
      ) : (
        <div aria-hidden className={`flex size-full items-center justify-center text-5xl text-(--t-accent) opacity-50 ${headingFont(theme)}`}>
          {[...product.name][0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}

type CardProps = {
  product: StorefrontProduct;
  shop: StorefrontShop;
  theme: Theme;
  className?: string;
};

/** The standard shop card: photo, name, price and a one-tap add. */
export function ProductCard({ product, shop, theme, className = "" }: CardProps) {
  const t = useTranslations("storefront");

  return (
    <SearchItem
      name={product.name}
      className={`lift reveal group relative flex flex-col overflow-hidden rounded-(--t-radius) border border-(--t-line) bg-(--t-surface) ${className}`}
    >
      <ProductOpen product={product} shop={shop} />
      <div className="relative">
        <ProductImage product={product} theme={theme} className="aspect-square w-full" />
        {!product.is_available && (
          <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white">
            {t("soldOut")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className={`leading-snug break-words ${theme.serif ? "font-display text-lg" : "font-medium"}`}>{product.name}</p>
        <Variety product={product} className="truncate text-xs opacity-60" />
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-2 pt-2">
          <span className="min-w-0 text-sm font-semibold"><Price product={product} /></span>
          <QuickAdd product={product} />
        </div>
      </div>
    </SearchItem>
  );
}

/** The facts a shopper wants up front, all taken from the owner's real details. */
export function ShopFacts({ shop, hours, className = "" }: Pick<LayoutProps, "shop" | "hours"> & { className?: string }) {
  const city = cityOf(shop.address);

  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 text-sm ${className}`}>
      <OpenStatusLabel hours={hours} timeZone={shop.timezone} />
      {city && <span className="opacity-75">{city}</span>}
    </div>
  );
}

export function VisitBlock({ shop, hours, theme }: LayoutProps) {
  const t = useTranslations("storefront");

  return (
    <section id="visit" className="scroll-mt-24 border-t border-(--t-line)">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:px-6">
        <div>
          <h2 className={`text-2xl ${headingFont(theme)}`}>{t("visit")}</h2>
          {shop.address && <p className="mt-3 leading-relaxed opacity-80">{shop.address}</p>}
          {shop.address && <div className="mt-2"><Directions address={shop.address} /></div>}
        </div>
        {hours.length > 0 && (
          <div>
            <h2 className={`mb-3 text-2xl ${headingFont(theme)}`}>{t("hours")}</h2>
            <HoursList hours={hours} />
          </div>
        )}
      </div>
    </section>
  );
}

export const ShopFooter = ({ shop }: { shop: StorefrontShop }) => (
  <SiteFooter shop={shop} className="border-t border-(--t-line)" />
);
