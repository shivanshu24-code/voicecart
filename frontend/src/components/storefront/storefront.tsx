import type { CSSProperties } from "react";
import { isTemplate, parseTemplate, type ShopKind, type StorefrontData, type Template } from "@/lib/storefront";
import { themes } from "@/lib/themes";
import { BakeryTemplate } from "./bakery-template";
import { ClothingTemplate } from "./clothing-template";
import { ElectronicsTemplate } from "./electronics-template";
import { GenericTemplate } from "./generic-template";
import { GroceryTemplate } from "./grocery-template";
import { OrderBar, OrderProvider } from "./order-list";
import { modernLayouts } from "./modern-layouts";
import { ContactBar } from "./parts";
import { RevealOnScroll } from "./reveal-on-scroll";
import { SearchProvider } from "./search";

const layouts = {
  grocery: { Layout: GroceryTemplate, accent: "#2f6b4f" },
  bakery: { Layout: BakeryTemplate, accent: "#8c4a2f" },
  clothing: { Layout: ClothingTemplate, accent: "#161513" },
  electronics: { Layout: ElectronicsTemplate, accent: "#1f5a8a" },
  generic: { Layout: GenericTemplate, accent: "#2f4a3f" },
} satisfies Record<ShopKind, { Layout: unknown; accent: string }>;

export function Storefront({ data, template }: { data: StorefrontData; template?: Template }) {
  const chosen = template ?? (isTemplate(data.shop.template) ? data.shop.template : "generic");
  const { layout, kind } = parseTemplate(chosen);
  const theme = layout && themes[kind][layout];
  const Modern = layout && modernLayouts[layout];
  const { Layout, accent } = layouts[kind];
  const themeStyle = theme && {
    "--t-page": theme.page,
    "--t-ink": theme.ink,
    "--t-surface": theme.surface,
    "--t-accent": theme.accent,
    "--t-on-accent": theme.onAccent,
    "--t-tint": theme.tint,
    "--t-line": theme.line,
    "--t-radius": theme.radius,
  };

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ "--shop": data.shop.primary_color ?? theme?.solid ?? theme?.accent ?? accent, ...themeStyle } as CSSProperties}
    >
      <SearchProvider products={data.products}>
        <OrderProvider shop={data.shop} products={data.products}>
          <div className="flex-1">
            {Modern && theme ? <Modern {...data} theme={theme} /> : <Layout {...data} />}
            {Modern && <RevealOnScroll />}
          </div>
          <div className="pointer-events-none sticky bottom-0 z-20 [&>*]:pointer-events-auto">
            <OrderBar shop={data.shop} hasHeaderButton={Boolean(Modern)} />
            <ContactBar shop={data.shop} />
          </div>
        </OrderProvider>
      </SearchProvider>
    </div>
  );
}
