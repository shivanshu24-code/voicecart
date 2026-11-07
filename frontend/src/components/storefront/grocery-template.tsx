import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { groupByCategory, groupId, type StorefrontData } from "@/lib/storefront";
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
  Backdrop,
  ProductThumb,
} from "./parts";
import { OpenStatusLabel } from "./open-status";
import { ProductOpen } from "./product-detail";
import { SearchGroup, SearchItem } from "./search";

/** "Market": a deep green shopfront with a live rate board as its centrepiece. */
export function GroceryTemplate({ shop, products, hours }: StorefrontData) {
  const t = useTranslations("storefront");
  const groups = groupByCategory(products);
  const board = products
    .filter((product) => product.is_available && product.price_paise !== null)
    .slice(0, 5);

  return (
    <div id="top" className="bg-[#f4f0e6] text-[#1b2a21]">
      <SiteNav shop={shop} className="bg-[#1d3a2c] text-[#f4f0e6]" cta="rounded-full bg-[#e7c873] text-[#1b2a21]" />

      <header className="relative overflow-hidden bg-[#1d3a2c] text-[#f4f0e6]">
        <Backdrop shop={shop} tint="bg-[#1d3a2c]/85" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-12 pb-16 md:grid-cols-[1.15fr_1fr] md:px-8 md:pt-16 md:pb-24">
          <div className="rise">
            <Eyebrow shop={shop} className="text-[#e7c873]" />
            <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">{shop.name}</h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed opacity-80">
              <Tagline shop={shop} fallback={t("taglines.grocery")} />
            </p>
<OpenStatusLabel hours={hours} timeZone={shop.timezone} className="mt-4" />
            <div className="mt-8 flex flex-wrap gap-3 max-md:hidden">
              <ContactLink shop={shop} className={`${buttonBase} rounded-full bg-[#e7c873] text-[#1b2a21]`} />
              <CallLink shop={shop} className={`${buttonBase} rounded-full border border-white/25`} />
            </div>
          </div>

          <div className="rise border border-white/15 bg-[#234435]/95 p-6 md:p-8" style={{ "--i": 1 } as CSSProperties}>
            <p className="font-display text-2xl">{t("rateBoard")}</p>
            <ul className="mt-5 divide-y divide-white/10">
              {board.map((product) => (
                <li key={product.name} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="min-w-0 break-words">{product.name}</span>
                  <span className="shrink-0 text-[#e7c873]">
                    <Price product={product} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <main>
        <section id="products" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 md:px-8 md:py-24">
          <h2 className="font-display text-4xl tracking-tight md:text-5xl">{t("whatWeSell")}</h2>
          <GroupLinks groups={groups} className="text-[#2f6b4f]" />
          <div className="mt-10 space-y-12">
            {groups.map(({ category, items }, index) => (
              <SearchGroup key={category} id={groupId(index)} className="scroll-mt-24" names={items.map((product) => product.name)}>
                {(category || groups.length > 1) && (
                  <h3 className="mb-4 text-sm tracking-wide text-[#2f6b4f]">{category || t("otherItems")}</h3>
                )}
                <ul className="grid gap-x-12 border-t border-black/10 md:grid-cols-2">
                  {items.map((product) => (
                    <SearchItem key={product.name} name={product.name} className="relative flex items-center justify-between gap-4 border-b border-black/10 py-4">
                      <ProductOpen product={product} shop={shop} />
                      <div className="flex min-w-0 items-center gap-4">
                        <ProductThumb product={product} className="size-16 rounded-sm" />
                        <div className="min-w-0">
                          <p className="text-lg break-words">{product.name}</p>
                          {product.description && <p className="mt-0.5 text-sm opacity-65">{product.description}</p>}
                          <Variety product={product} className="mt-0.5 text-sm opacity-65" />
                        </div>
                      </div>
                      <span className="shrink-0 font-medium">
                        <Price product={product} />
                      </span>
                    </SearchItem>
                  ))}
                </ul>
              </SearchGroup>
            ))}
          </div>
        </section>

        <section id="visit" className="scroll-mt-20 bg-[#e9e3d3]">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-3 md:px-8">
            <div>
              <h2 className="font-display text-3xl">{t("visit")}</h2>
              {shop.address && <p className="mt-4 leading-relaxed">{shop.address}</p>}
              {shop.address && <div className="mt-3"><Directions address={shop.address} /></div>}
            </div>
            {hours.length > 0 && (
              <div>
                <h2 className="font-display text-3xl">{t("hours")}</h2>
                <div className="mt-4"><HoursList hours={hours} /></div>
              </div>
            )}
            <div>
              <h2 className="font-display text-3xl">{t("contactTitle")}</h2>
              <p className="mt-4 leading-relaxed opacity-75">{t("contactBody")}</p>
              <div className="mt-5">
                <ContactLink shop={shop} className={`${buttonBase} rounded-full bg-[#1d3a2c] text-[#f4f0e6]`} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter shop={shop} className="bg-[#1d3a2c] text-[#f4f0e6]" />
    </div>
  );
}
