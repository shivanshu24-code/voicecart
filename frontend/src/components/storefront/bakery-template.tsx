import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { coverOf, groupByCategory, groupId, type StorefrontData } from "@/lib/storefront";
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
  ProductThumb,
} from "./parts";
import { OpenStatusLabel } from "./open-status";
import { ProductOpen } from "./product-detail";
import { SearchGroup, SearchItem } from "./search";

/** "Patisserie": cream and terracotta, with an arched window and a two-column printed menu. */
export function BakeryTemplate({ shop, products, hours }: StorefrontData) {
  const t = useTranslations("storefront");
  const highlights = products.slice(0, 3);
  const groups = groupByCategory(products);
  const heroPhoto = shop.banner_url ?? products.map(coverOf).find(Boolean);

  return (
    <div id="top" className="bg-[#faf3e7] text-[#38261b]">
      <SiteNav shop={shop} className="bg-[#faf3e7]/95 backdrop-blur-sm" cta="rounded-full bg-(--shop) text-[#faf3e7]" />

      <header className="mx-auto grid max-w-6xl items-end gap-12 px-5 pt-10 pb-16 md:grid-cols-[1.2fr_1fr] md:px-8 md:pt-14 md:pb-24">
        <div className="rise md:pb-10">
          <Eyebrow shop={shop} className="text-(--shop)" />
          <h1 className="mt-4 font-display text-6xl leading-[1.02] tracking-tight italic md:text-8xl">{shop.name}</h1>
          <p className="mt-6 max-w-md font-display text-xl leading-relaxed opacity-80">
            <Tagline shop={shop} fallback={t("taglines.bakery")} />
          </p>
<OpenStatusLabel hours={hours} timeZone={shop.timezone} className="mt-4" />
          <div className="mt-8 flex flex-wrap gap-3 max-md:hidden">
            <ContactLink shop={shop} className={`${buttonBase} rounded-full bg-(--shop) text-[#faf3e7]`} />
            <CallLink shop={shop} className={`${buttonBase} rounded-full border border-[#38261b]/25`} />
          </div>
        </div>

        {heroPhoto ? (
          <div className="rise mx-auto w-full max-w-sm overflow-hidden rounded-t-[999px]" style={{ "--i": 1 } as CSSProperties}>
            <Photo src={heroPhoto} alt={shop.name} width={800} height={1000} eager className="aspect-[4/5] w-full" />
          </div>
        ) : (
          <div
            className="rise mx-auto flex aspect-[4/5] w-full max-w-sm flex-col justify-end rounded-t-[999px] bg-(--shop) p-8 text-[#faf3e7] md:p-10"
            style={{ "--i": 1 } as CSSProperties}
          >
            <p className="text-sm opacity-75">{t("fromTheMenu")}</p>
            <ul className="mt-3 space-y-2">
              {highlights.map((product) => (
                <li key={product.name} className="font-display text-2xl leading-snug italic md:text-[1.7rem]">
                  {product.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <main>
        <section id="products" className="scroll-mt-20 border-t border-[#38261b]/15">
          <div className="mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-24">
            <h2 className="text-center font-display text-5xl italic md:text-6xl">{t("menu")}</h2>
            <div className="flex flex-col items-center">
              <GroupLinks groups={groups} className="text-(--shop)" />
            </div>
            <div className="mt-14 space-y-14">
              {groups.map(({ category, items }, index) => (
                <SearchGroup key={category} id={groupId(index)} className="scroll-mt-24" names={items.map((product) => product.name)}>
                  {(category || groups.length > 1) && (
                    <h3 className="mb-6 text-center text-sm tracking-[0.2em] text-(--shop) uppercase">
                      {category || t("otherItems")}
                    </h3>
                  )}
                  <ul className="grid gap-x-16 gap-y-6 md:grid-cols-2">
                    {items.map((product) => (
                      <SearchItem key={product.name} name={product.name} className="relative flex items-center gap-4">
                        <ProductOpen product={product} shop={shop} />
                        <ProductThumb product={product} className="h-24 w-20 rounded-t-full" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2 font-display text-xl">
                            <span className="break-words">{product.name}</span>
                            <span aria-hidden className="min-w-6 flex-1 border-b border-dotted border-current opacity-35" />
                            <Price product={product} />
                          </div>
                          {product.description && <p className="mt-1 font-display italic opacity-70">{product.description}</p>}
                          <Variety product={product} className="mt-1 text-sm opacity-65" />
                        </div>
                      </SearchItem>
                    ))}
                  </ul>
                </SearchGroup>
              ))}
            </div>
          </div>
        </section>

        <section id="visit" className="scroll-mt-20 bg-[#38261b] text-[#faf3e7]">
          <div className="mx-auto grid max-w-5xl gap-12 px-5 py-16 md:grid-cols-2 md:px-8 md:py-20">
            <div>
              <h2 className="font-display text-4xl italic md:text-5xl">{t("visit")}</h2>
              {shop.address && <p className="mt-5 text-lg leading-relaxed opacity-85">{shop.address}</p>}
              {shop.address && <div className="mt-3"><Directions address={shop.address} /></div>}
            </div>
            {hours.length > 0 && (
              <div className="md:pt-3">
                <h3 className="mb-4 text-sm tracking-[0.2em] uppercase opacity-70">{t("hours")}</h3>
                <HoursList hours={hours} />
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter shop={shop} className="bg-[#2c1d14] text-[#faf3e7]" />
    </div>
  );
}
