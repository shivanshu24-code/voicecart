import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { coverOf, formatPrice, groupByCategory, groupId, specs, type StorefrontData } from "@/lib/storefront";
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
  Photo,
} from "./parts";
import { OpenStatusLabel } from "./open-status";
import { ProductOpen } from "./product-detail";
import { SearchGroup, SearchItem } from "./search";

/** "Showroom": dark, precise and product-led, with a spotlight panel and spec cards. */
export function ElectronicsTemplate({ shop, products, hours }: StorefrontData) {
  const t = useTranslations("storefront");
  const spotlight =
    products.find(coverOf) ??
    products.find((product) => specs(product).length > 0 || product.options.length > 0) ??
    products[0];
  const spotlightPhoto = spotlight && coverOf(spotlight);
  const spotlightRows = spotlight
    ? [
        ...spotlight.options.map(({ label, price_paise }) => [label, formatPrice(price_paise)] as const),
        ...specs(spotlight),
      ]
    : [];
  const groups = groupByCategory(products);

  return (
    <div id="top" className="bg-[#eef1f4] text-[#101820]">
      <SiteNav shop={shop} className="bg-[#0d141c] text-white" cta="rounded-md bg-[#3d8bd4] text-white" />

      <header className="relative overflow-hidden bg-[#0d141c] text-white">
        <Backdrop shop={shop} tint="bg-[#0d141c]/85" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-12 pb-16 md:grid-cols-[1.2fr_1fr] md:px-8 md:pt-16 md:pb-24">
          <div className="rise">
            <Eyebrow shop={shop} className="text-[#7db6ea]" />
            <h1 className="mt-4 text-5xl leading-[1.04] font-semibold tracking-tight md:text-7xl">{shop.name}</h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed opacity-70">
              <Tagline shop={shop} fallback={t("taglines.electronics")} />
            </p>
<OpenStatusLabel hours={hours} timeZone={shop.timezone} className="mt-4" />
            <div className="mt-8 flex flex-wrap gap-3 max-md:hidden">
              <ContactLink shop={shop} className={`${buttonBase} rounded-md bg-[#3d8bd4] text-white`} />
              <CallLink shop={shop} className={`${buttonBase} rounded-md border border-white/20`} />
            </div>
          </div>

          {spotlight && (
            <div className="rise rounded-lg border border-white/10 bg-[#151f2a] p-6 md:p-8" style={{ "--i": 1 } as CSSProperties}>
              {spotlightPhoto && (
                <Photo src={spotlightPhoto} alt={spotlight.name} width={900} height={600} eager className="mb-5 aspect-[3/2] w-full rounded-md" />
              )}
              <p className="text-sm text-[#7db6ea]">{t("spotlight")}</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{spotlight.name}</p>
              <p className="mt-2 text-xl"><Price product={spotlight} /></p>
              {spotlightRows.length > 0 && (
                <dl className="mt-5 divide-y divide-white/10 border-t border-white/10 text-sm">
                  {spotlightRows.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 py-2.5">
                      <dt className="opacity-60">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </div>
      </header>

      <main>
        <section id="products" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 md:px-8 md:py-24">
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">{t("products")}</h2>
          <GroupLinks groups={groups} className="text-[#1f6fb5]" />
          <div className="mt-10 space-y-12">
            {groups.map(({ category, items }, index) => (
              <SearchGroup key={category} id={groupId(index)} className="scroll-mt-24" names={items.map((product) => product.name)}>
                {(category || groups.length > 1) && (
                  <h3 className="mb-4 text-lg font-medium">{category || t("otherItems")}</h3>
                )}
                <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((product) => (
                    <SearchItem key={product.name} name={product.name} className="relative flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white p-5">
                      <ProductOpen product={product} shop={shop} />
                      {coverOf(product) && (
                        <Photo src={coverOf(product)!} alt="" width={720} height={480} className="-mx-5 -mt-5 mb-4 aspect-[3/2] w-[calc(100%+2.5rem)] max-w-none" />
                      )}
                      <h4 className="text-lg font-medium break-words">{product.name}</h4>
                      {product.description && <p className="mt-1 text-sm opacity-65">{product.description}</p>}
                      <Variety product={product} className="mt-1 text-sm opacity-65" />
                      {specs(product).length > 0 && (
                        <dl className="mt-3 space-y-1.5 text-sm">
                          {specs(product).map(([label, value]) => (
                            <div key={label} className="flex justify-between gap-4">
                              <dt className="opacity-55">{label}</dt>
                              <dd className="text-right">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-4 pt-5">
                        <span className="text-lg font-semibold"><Price product={product} /></span>
                        <span className="text-sm text-[#1f6fb5]">{t("viewDetails")}</span>
                      </div>
                    </SearchItem>
                  ))}
                </ul>
              </SearchGroup>
            ))}
          </div>
        </section>

        <section id="visit" className="scroll-mt-20 border-t border-black/10 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:px-8">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">{t("visitStore")}</h2>
              {shop.address && <p className="mt-4 leading-relaxed">{shop.address}</p>}
              {shop.address && <div className="mt-3"><Directions address={shop.address} /></div>}
            </div>
            {hours.length > 0 && (
              <div>
                <h3 className="mb-4 font-medium">{t("hours")}</h3>
                <HoursList hours={hours} />
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter shop={shop} className="bg-[#0d141c] text-white" />
    </div>
  );
}
