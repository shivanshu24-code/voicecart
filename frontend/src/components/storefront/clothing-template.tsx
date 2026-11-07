import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { coverOf, groupByCategory, groupId, type StorefrontData, type StorefrontProduct } from "@/lib/storefront";
import {
  buttonBase,
  CallLink,
  ContactLink,
  Directions,
  Eyebrow,
  GroupLinks,
  HoursList,
  Price,
  SiteFooter,
  SiteNav,
  Tagline,
  Variety,
  Photo,
} from "./parts";
import { OpenStatusLabel } from "./open-status";
import { ProductOpen } from "./product-detail";
import { SearchGroup, SearchItem } from "./search";

// Muted fabric tones, so a shop without photos reads as a swatch book.
const swatches = [
  "bg-[#c9b8a3] text-[#2a231b]",
  "bg-[#3e4a3f] text-[#efe9dd]",
  "bg-[#a4553c] text-[#f6ece1]",
  "bg-[#e5dccd] text-[#2a231b]",
  "bg-[#27304a] text-[#ebe6da]",
  "bg-[#b89b5e] text-[#241d10]",
];

function Tile({ product, index, large }: { product: StorefrontProduct; index: number; large: boolean }) {
  const cover = coverOf(product);

  return (
    <div className={`relative overflow-hidden ${large ? "aspect-square md:aspect-auto md:h-full" : "aspect-[4/5]"} ${swatches[index % swatches.length]}`}>
      {cover ? (
        <Photo src={cover} alt={product.name} width={large ? 1000 : 600} height={large ? 1000 : 750} className="absolute inset-0 size-full" />
      ) : (
        <div className="flex h-full flex-col justify-between p-4 md:p-5">
          <span className="text-xs tabular-nums opacity-70">{String(index + 1).padStart(2, "0")}</span>
          <span className={`font-display leading-tight break-words ${large ? "text-3xl md:text-5xl" : "text-xl md:text-2xl"}`}>
            {product.name}
          </span>
        </div>
      )}
    </div>
  );
}

/** "Atelier": near-black editorial hero and an asymmetric swatch-book collection. */
export function ClothingTemplate({ shop, products, hours }: StorefrontData) {
  const t = useTranslations("storefront");
  const longName = [...shop.name].length > 16;
  const groups = groupByCategory(products);
  // Swatch colours and numbers run on across groups rather than restarting.
  const startOf = (group: number) =>
    groups.slice(0, group).reduce((count, { items }) => count + items.length, 0);

  return (
    <div id="top" className="bg-[#f4f0e8] text-[#171512]">
      <SiteNav shop={shop} className="bg-[#171512] text-[#f4f0e8]" cta="bg-[#f4f0e8] text-[#171512]" />

      <header className="bg-[#171512] text-[#f4f0e8]">
        <div className="mx-auto max-w-6xl px-5 pt-14 pb-14 md:px-8 md:pt-24 md:pb-20">
          <Eyebrow shop={shop} className="rise opacity-60" />
          <h1 className={`rise mt-6 font-display leading-[0.95] tracking-tight break-words ${longName ? "text-6xl md:text-8xl" : "text-7xl md:text-[9.5rem]"}`}>
            {shop.name}
          </h1>
          <div className="rise mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-white/20 pt-6" style={{ "--i": 1 } as CSSProperties}>
            <div>
            <p className="max-w-md text-lg leading-relaxed opacity-75">
              <Tagline shop={shop} fallback={t("taglines.clothing")} />
            </p>
<OpenStatusLabel hours={hours} timeZone={shop.timezone} className="mt-3" />
            </div>
            <div className="flex flex-wrap gap-3 max-md:hidden">
              <ContactLink shop={shop} className={`${buttonBase} bg-[#f4f0e8] text-[#171512]`} />
              <CallLink shop={shop} className={`${buttonBase} border border-white/30`} />
            </div>
          </div>
        </div>
        {shop.banner_url && (
          <Photo src={shop.banner_url} alt={shop.name} width={1920} height={800} eager className="aspect-[3/2] w-full md:aspect-[12/5]" />
        )}
      </header>

      <main>
        <section id="products" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 md:px-8 md:py-24">
          <div className="flex items-baseline justify-between gap-6">
            <h2 className="font-display text-4xl tracking-tight md:text-6xl">{t("collection")}</h2>
            <p className="text-sm opacity-60">{t("pieces", { count: products.length })}</p>
          </div>
          <GroupLinks groups={groups} />
          <div className="mt-10 space-y-14">
            {groups.map(({ category, items }, group) => (
              <SearchGroup key={category} id={groupId(group)} className="scroll-mt-24" names={items.map((product) => product.name)}>
                {(category || groups.length > 1) && (
                  <h3 className="mb-5 font-display text-2xl">{category || t("otherItems")}</h3>
                )}
                <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-5">
                  {items.map((product, position) => {
                    const index = startOf(group) + position;
                    const large = index === 0;
                    return (
                      <SearchItem key={product.name} name={product.name} className={`relative ${large ? "col-span-2 md:row-span-2 md:flex md:flex-col" : ""}`}>
                        <ProductOpen product={product} shop={shop} />
                        <div className={large ? "md:flex-1" : ""}>
                          <Tile product={product} index={index} large={large} />
                        </div>
                        <div className="mt-3 flex items-baseline justify-between gap-3">
                          <div className="min-w-0 text-sm opacity-70">
                            {coverOf(product) && <p className="break-words">{product.name}</p>}
                            <Variety product={product} className="break-words" />
                            {!product.options.length && !product.choices.length && product.description && (
                              <p className="break-words">{product.description}</p>
                            )}
                          </div>
                          <p className="shrink-0"><Price product={product} /></p>
                        </div>
                      </SearchItem>
                    );
                  })}
                </ul>
              </SearchGroup>
            ))}
          </div>
        </section>

        <section id="visit" className="scroll-mt-20 border-t border-black/15">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
            <h2 className="font-display text-4xl tracking-tight md:text-5xl">{t("visitStore")}</h2>
            {shop.address && (
              <div>
                <p className="leading-relaxed">{shop.address}</p>
                <div className="mt-3"><Directions address={shop.address} /></div>
              </div>
            )}
            {hours.length > 0 && <HoursList hours={hours} />}
          </div>
        </section>
      </main>

      <SiteFooter shop={shop} className="bg-[#171512] text-[#f4f0e8]" />
    </div>
  );
}
