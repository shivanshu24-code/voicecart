import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { coverOf, groupByCategory, groupId, type Layout } from "@/lib/storefront";
import { QuickAdd } from "./order-list";
import { Backdrop, ContactLink, Photo, Price, Tagline, Variety } from "./parts";
import { ProductOpen } from "./product-detail";
import { SearchGroup, SearchItem, SearchResults } from "./search";
import { ShelfRow } from "./shelf-row";
import {
  BrandMark,
  CategoryChips,
  headingFont,
  ProductCard,
  ProductImage,
  ShopFacts,
  ShopFooter,
  ShopHeader,
  VisitBlock,
  type LayoutProps,
} from "./shop-kit";

const taglineKey = (category: string) =>
  (["grocery", "bakery", "clothing", "electronics"].includes(category) ? category : "other") as "other";

const namesOf = (items: { name: string }[]) => items.map((item) => item.name);

/** "Storefront": a promo hero, category chips and a grid of product cards. */
function StorefrontLayout(props: LayoutProps) {
  const { shop, products, hours, theme } = props;
  const t = useTranslations("storefront");
  const groups = groupByCategory(products);
  const heroPhoto = shop.banner_url ?? products.map(coverOf).find(Boolean);

  return (
    <div id="top" className="bg-(--t-page) text-(--t-ink)">
      <ShopHeader {...props} />

      <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6 md:pt-6">
        <section className="grid overflow-hidden rounded-(--t-radius) bg-(--t-accent) text-(--t-on-accent) md:grid-cols-2">
          <div className="rise flex flex-col justify-center gap-4 p-6 md:p-12">
            <h1 className={`text-4xl leading-tight break-words md:text-5xl ${headingFont(theme)}`}>{shop.name}</h1>
            <p className="max-w-md leading-relaxed opacity-85">
              <Tagline shop={shop} fallback={t(`taglines.${taglineKey(shop.category)}`)} />
            </p>
            <ShopFacts shop={shop} hours={hours} />
            <a href="#products" className="mt-1 w-fit rounded-(--t-radius) bg-(--t-on-accent) px-6 py-3 font-medium text-(--t-accent) transition-opacity hover:opacity-90">
              {t("shopNow")}
            </a>
          </div>
          {heroPhoto && (
            <Photo src={heroPhoto} alt="" width={1000} height={700} eager className="h-56 w-full md:h-full md:min-h-80" />
          )}
        </section>
      </div>

      <main id="products" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-8 md:px-6">
        <CategoryChips groups={groups} />
        <SearchResults />
        <div className="mt-6 space-y-10">
          {groups.map(({ category, items }, index) => (
            <SearchGroup key={category} id={groupId(index)} className="scroll-mt-24" names={namesOf(items)}>
              {(category || groups.length > 1) && (
                <h2 className={`mb-4 text-2xl ${headingFont(theme)}`}>{category || t("otherItems")}</h2>
              )}
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
                {items.map((product) => (
                  <ProductCard key={product.name} product={product} shop={shop} theme={theme} />
                ))}
              </ul>
            </SearchGroup>
          ))}
        </div>
      </main>

      <VisitBlock {...props} />
      <ShopFooter shop={shop} />
    </div>
  );
}

/** "Shelves": each category is a sideways row, like walking down an aisle. */
function ShelvesLayout(props: LayoutProps) {
  const { shop, products, hours, theme } = props;
  const t = useTranslations("storefront");
  const groups = groupByCategory(products);

  return (
    <div id="top" className="bg-(--t-page) text-(--t-ink)">
      <ShopHeader {...props} />

      <section className="relative overflow-hidden bg-(--t-tint)">
        <Backdrop shop={shop} tint="bg-(--t-page)/80" />
        <div className="rise relative mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
          <h1 className={`text-4xl leading-tight break-words md:text-6xl ${headingFont(theme)}`}>{shop.name}</h1>
          <p className="mt-3 max-w-xl text-lg leading-relaxed opacity-80">
            <Tagline shop={shop} fallback={t(`taglines.${taglineKey(shop.category)}`)} />
          </p>
          <ShopFacts shop={shop} hours={hours} className="mt-4" />
        </div>
      </section>

      <main id="products" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-8 md:px-6">
        <CategoryChips groups={groups} />
        <SearchResults />
        <div className="mt-6 space-y-10">
          {groups.map(({ category, items }, index) => (
            <SearchGroup key={category} id={groupId(index)} className="scroll-mt-24" names={namesOf(items)}>
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h2 className={`text-2xl ${headingFont(theme)}`}>{category || t("allProducts")}</h2>
                <span className="text-sm opacity-60">{t("itemCount", { count: items.length })}</span>
              </div>
              <ShelfRow count={items.length}>
                {items.map((product) => (
                  <ProductCard key={product.name} product={product} shop={shop} theme={theme} className="w-44 shrink-0 snap-start md:w-56" />
                ))}
              </ShelfRow>
            </SearchGroup>
          ))}
        </div>
      </main>

      <VisitBlock {...props} />
      <ShopFooter shop={shop} />
    </div>
  );
}

/** "Menu Card": one printed-style card, with a photo beside each item, for quick ordering. */
function MenuCardLayout(props: LayoutProps) {
  const { shop, products, hours, theme } = props;
  const t = useTranslations("storefront");
  const groups = groupByCategory(products);

  return (
    <div id="top" className="bg-(--t-page) text-(--t-ink)">
      <ShopHeader {...props} />

      <main className="mx-auto max-w-3xl px-3 py-6 md:py-10">
        <div className="rounded-(--t-radius) border border-(--t-line) bg-(--t-surface) px-4 py-8 shadow-sm md:px-10 md:py-12">
          <div className="rise flex flex-col items-center text-center">
            <BrandMark shop={shop} theme={theme} large />
            <h1 className={`mt-4 text-4xl break-words md:text-5xl ${headingFont(theme)}`}>{shop.name}</h1>
            <p className="mt-3 max-w-md leading-relaxed opacity-75">
              <Tagline shop={shop} fallback={t(`taglines.${taglineKey(shop.category)}`)} />
            </p>
            <ShopFacts shop={shop} hours={hours} className="mt-3 justify-center" />
          </div>

          <div id="products" className="mt-8 flex scroll-mt-24 flex-col items-center">
            <CategoryChips groups={groups} />
            <SearchResults />
          </div>

          <div className="mt-6 space-y-10">
            {groups.map(({ category, items }, index) => (
              <SearchGroup key={category} id={groupId(index)} className="scroll-mt-24" names={namesOf(items)}>
                {(category || groups.length > 1) && (
                  <h2 className={`border-b-2 border-(--t-accent) pb-2 text-2xl ${headingFont(theme)}`}>{category || t("otherItems")}</h2>
                )}
                <ul className="divide-y divide-(--t-line)">
                  {items.map((product) => (
                    <SearchItem key={product.name} name={product.name} className="reveal group relative flex items-start gap-4 py-5">
                      <ProductOpen product={product} shop={shop} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-lg leading-snug break-words ${theme.serif ? "font-display" : "font-medium"}`}>{product.name}</p>
                        <p className="mt-1 text-sm font-semibold"><Price product={product} /></p>
                        {product.description && <p className="mt-1 text-sm opacity-65">{product.description}</p>}
                        <Variety product={product} className="mt-1 text-xs opacity-60" />
                      </div>
                      <div className="flex w-24 shrink-0 flex-col items-center gap-2 md:w-28">
                        {coverOf(product) && (
                          <ProductImage product={product} theme={theme} width={240} height={240} className="aspect-square w-full rounded-(--t-radius)" />
                        )}
                        <QuickAdd product={product} />
                      </div>
                    </SearchItem>
                  ))}
                </ul>
              </SearchGroup>
            ))}
          </div>
        </div>
      </main>

      <VisitBlock {...props} />
      <ShopFooter shop={shop} />
    </div>
  );
}

// Uneven heights give the gallery its rhythm.
const ratios = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]", "aspect-[5/6]"];

/** "Lookbook": a full-screen opening and a large photo wall. */
function LookbookLayout(props: LayoutProps) {
  const { shop, products, hours, theme } = props;
  const t = useTranslations("storefront");
  const groups = groupByCategory(products);

  return (
    <div id="top" className="bg-(--t-page) text-(--t-ink)">
      <ShopHeader {...props} />

      <section className="relative flex min-h-[60vh] items-end overflow-hidden bg-(--t-tint) md:min-h-[72vh]">
        <Backdrop shop={shop} tint="bg-black/45" />
        <div className={`rise relative mx-auto w-full max-w-6xl px-4 pb-10 md:px-6 md:pb-14 ${shop.banner_url ? "text-white" : ""}`}>
          <h1 className={`text-5xl leading-[1.02] break-words md:text-8xl ${headingFont(theme)}`} style={{ "--i": 0 } as CSSProperties}>
            {shop.name}
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed opacity-85">
            <Tagline shop={shop} fallback={t(`taglines.${taglineKey(shop.category)}`)} />
          </p>
          <ShopFacts shop={shop} hours={hours} className="mt-4" />
          <div className="mt-5 flex flex-wrap gap-3 max-md:hidden">
            <ContactLink shop={shop} className="inline-flex items-center gap-2 rounded-(--t-radius) bg-(--t-accent) px-6 py-3 font-medium text-(--t-on-accent)" />
          </div>
        </div>
      </section>

      <main id="products" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10 md:px-6 md:py-14">
        <CategoryChips groups={groups} />
        <SearchResults />
        <div className="mt-8 space-y-14">
          {groups.map(({ category, items }, index) => (
            <SearchGroup key={category} id={groupId(index)} className="scroll-mt-24" names={namesOf(items)}>
              {(category || groups.length > 1) && (
                <h2 className={`mb-5 text-3xl md:text-4xl ${headingFont(theme)}`}>{category || t("otherItems")}</h2>
              )}
              <ul className="columns-2 gap-4 md:columns-3">
                {items.map((product, position) => (
                  <SearchItem key={product.name} name={product.name} className="reveal group relative mb-6 break-inside-avoid">
                    <ProductOpen product={product} shop={shop} />
                    <ProductImage
                      product={product}
                      theme={theme}
                      width={700}
                      height={875}
                      className={`w-full rounded-(--t-radius) ${ratios[position % ratios.length]}`}
                    />
                    <div className="mt-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`leading-snug break-words ${theme.serif ? "font-display text-lg" : "font-medium"}`}>{product.name}</p>
                        <p className="text-sm opacity-75"><Price product={product} /></p>
                      </div>
                      <QuickAdd product={product} />
                    </div>
                  </SearchItem>
                ))}
              </ul>
            </SearchGroup>
          ))}
        </div>
      </main>

      <VisitBlock {...props} />
      <ShopFooter shop={shop} />
    </div>
  );
}

export const modernLayouts: Record<Layout, (props: LayoutProps) => React.ReactNode> = {
  storefront: StorefrontLayout,
  shelves: ShelvesLayout,
  menucard: MenuCardLayout,
  lookbook: LookbookLayout,
};
