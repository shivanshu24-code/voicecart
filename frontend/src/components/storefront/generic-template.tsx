import { useTranslations } from "next-intl";
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
  Tagline,
  Variety,
  Backdrop,
  Logo,
  ProductThumb,
} from "./parts";
import { OpenStatusLabel } from "./open-status";
import { ProductOpen } from "./product-detail";
import { SearchGroup, SearchItem } from "./search";

/** "Classic": a fixed brand panel beside a scrolling catalogue, for any kind of shop. */
export function GenericTemplate({ shop, products, hours }: StorefrontData) {
  const t = useTranslations("storefront");
  const groups = groupByCategory(products);

  return (
    <div id="top" className="bg-[#f6f3ec] text-[#20261f]">
      <div className="md:grid md:grid-cols-[minmax(22rem,38%)_1fr]">
        <aside className="relative overflow-hidden bg-[#26332d] text-[#f6f3ec] md:sticky md:top-0 md:h-screen">
          <Backdrop shop={shop} tint="bg-[#26332d]/75" />
          <div className="relative flex h-full flex-col justify-between gap-12 px-6 py-10 md:px-12 md:py-14">
            <div className="flex items-center gap-3">
              <Logo shop={shop} className="h-10" />
              <Eyebrow shop={shop} className="opacity-65" />
            </div>
            <div className="rise">
              <h1 className="font-display text-5xl leading-[1.05] tracking-tight break-words md:text-6xl">{shop.name}</h1>
              <p className="mt-5 max-w-sm text-lg leading-relaxed opacity-75">
                <Tagline shop={shop} fallback={t("taglines.other")} />
              </p>
<OpenStatusLabel hours={hours} timeZone={shop.timezone} className="mt-4" />
            </div>
            <div className="flex flex-wrap gap-3 max-md:hidden">
              <ContactLink shop={shop} className={`${buttonBase} bg-[#f6f3ec] text-[#20261f]`} />
              <CallLink shop={shop} className={`${buttonBase} border border-white/25`} />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <main className="px-6 py-14 md:px-16 md:py-20">
            <section id="products">
              <h2 className="font-display text-4xl tracking-tight md:text-5xl">{t("whatWeOffer")}</h2>
              <GroupLinks groups={groups} className="text-(--shop)" />
              <div className="mt-8 space-y-10">
                {groups.map(({ category, items }, index) => (
                  <SearchGroup key={category} id={groupId(index)} className="scroll-mt-6" names={items.map((product) => product.name)}>
                    {(category || groups.length > 1) && (
                      <h3 className="mb-3 text-sm tracking-wide text-(--shop)">{category || t("otherItems")}</h3>
                    )}
                    <ul className="border-t border-black/15">
                      {items.map((product) => (
                        <SearchItem key={product.name} name={product.name} className="relative flex items-center justify-between gap-6 border-b border-black/15 py-5">
                          <ProductOpen product={product} shop={shop} />
                          <div className="flex min-w-0 items-center gap-5">
                            <ProductThumb product={product} className="size-20" />
                            <div className="min-w-0">
                              <p className="font-display text-2xl break-words">{product.name}</p>
                              {product.description && <p className="mt-1 opacity-65">{product.description}</p>}
                              <Variety product={product} className="mt-1 text-sm opacity-65" />
                            </div>
                          </div>
                          <span className="shrink-0 text-lg"><Price product={product} /></span>
                        </SearchItem>
                      ))}
                    </ul>
                  </SearchGroup>
                ))}
              </div>
            </section>

            <section id="visit" className="mt-16 grid gap-10 lg:grid-cols-2">
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
            </section>
          </main>
          <SiteFooter shop={shop} className="border-t border-black/15" />
        </div>
      </div>
    </div>
  );
}
