import { Check, MessageCircle, Plus, QrCode, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import type { Layout } from "@/lib/storefront";
import { themes, type Theme } from "@/lib/themes";

const delay = (i: number) => ({ "--i": i }) as CSSProperties;
const waveHeights = [40, 70, 100, 55, 85, 45, 95, 60, 75, 40];

export function Waveform({ className = "bg-brand" }: { className?: string }) {
  return (
    <span aria-hidden className="flex h-6 items-center gap-[3px]">
      {waveHeights.map((height, i) => (
        <span key={i} className={`voice-bar w-[2px] rounded-full ${className}`} style={{ ...delay(i), height: `${height}%` }} />
      ))}
    </span>
  );
}

const palette = (theme: Theme) =>
  ({ background: theme.page, color: theme.ink, "--a": theme.accent, "--on": theme.onAccent, "--tint": theme.tint, "--s": theme.surface, "--l": theme.line }) as CSSProperties;

function ScreenCard({ name, price }: { name: string; price: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-(--l) bg-(--s)">
      <div className="flex aspect-[5/4] items-center justify-center bg-(--tint) font-display text-2xl text-(--a) opacity-70">
        {[...name][0]}
      </div>
      <div className="p-2">
        <p className="truncate text-[0.7rem] font-medium">{name}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[0.7rem] font-semibold">{price}</span>
          <span className="flex size-5 items-center justify-center rounded-md bg-(--a) text-(--on)">
            <Plus size={11} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}

type ScreenProps = { theme: Theme; shop: string; items: [string, string][]; index: number; open: string };

function PhoneScreen({ theme, shop, items, index, open }: ScreenProps) {
  return (
    <div className="screen-cycle absolute inset-0 flex flex-col overflow-hidden" style={{ ...palette(theme), ...delay(index) }}>
      <div className="flex items-center justify-between border-b border-(--l) bg-(--s) px-3 pt-8 pb-2.5">
        <span className="truncate font-display text-sm">{shop}</span>
        <ShoppingBag aria-hidden size={14} strokeWidth={1.75} />
      </div>
      <div className="m-2.5 rounded-lg bg-(--a) p-3 text-(--on)">
        <p className="font-display text-lg leading-tight">{shop}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.65rem] opacity-90">
          <span className="size-1.5 rounded-full bg-[#7fe0a8]" />
          {open}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 px-2.5">
        {items.map(([name, price]) => (
          <ScreenCard key={name} name={name} price={price} />
        ))}
      </div>
    </div>
  );
}

/** A phone cycling through three shops, ringed by the features floating around it. */
export function HeroVisual() {
  const t = useTranslations("landing.hero.visual");

  const screens: { theme: Theme; shop: string; items: [string, string][] }[] = [
    {
      theme: themes.bakery.storefront,
      shop: t("bakery"),
      items: [[t("items.cake"), "₹450"], [t("items.pastry"), "₹60"], [t("items.bread"), "₹55"], [t("items.cookies"), "₹180"]],
    },
    {
      theme: themes.grocery.storefront,
      shop: t("grocery"),
      items: [[t("items.atta"), "₹42"], [t("items.rice"), "₹95"], [t("items.oil"), "₹180"], [t("items.dal"), "₹135"]],
    },
    {
      theme: themes.clothing.shelves,
      shop: t("clothing"),
      items: [[t("items.kurta"), "₹899"], [t("items.saree"), "₹2,499"], [t("items.dupatta"), "₹799"], [t("items.stole"), "₹1,499"]],
    },
  ];

  const chip = "absolute rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm shadow-[0_14px_34px_-18px_rgb(31_30_27/0.35)]";

  return (
    <div aria-hidden className="relative mx-auto h-[33rem] w-full max-w-lg">
      <div className="float absolute top-2 left-1/2 h-[31rem] w-60 -translate-x-1/2 overflow-hidden rounded-[2.2rem] border-[6px] border-[#1f1e1b] bg-white shadow-[0_30px_60px_-28px_rgb(31_30_27/0.55)]" style={delay(0)}>
        {screens.map((screen, index) => (
          <PhoneScreen key={screen.shop} {...screen} index={index} open={t("openShort")} />
        ))}
        <span className="absolute top-1.5 left-1/2 h-4 w-16 -translate-x-1/2 rounded-full bg-[#1f1e1b]" />
      </div>

      <div className={`float ${chip} top-40 left-0 max-w-44`} style={delay(1)}>
        <Waveform />
        <p className="mt-1.5 text-xs leading-snug text-muted">“{t("spoken")}”</p>
      </div>

      <div className={`float ${chip} top-16 right-2 flex items-center gap-2`} style={delay(2)}>
        <span className="pulse-dot size-2 rounded-full bg-[#2f8f5f]" />
        <span className="text-xs font-medium">{t("open")}</span>
      </div>

      <div className={`float ${chip} bottom-10 left-2 max-w-48`} style={delay(3)}>
        <p className="flex items-center gap-1.5 text-xs font-medium text-brand">
          <MessageCircle size={13} strokeWidth={1.75} />
          {t("orderTitle")}
        </p>
        <p className="mt-1 text-xs leading-snug text-muted">{t("order")}</p>
      </div>

      <div className={`float ${chip} right-0 bottom-32 flex items-center gap-2`} style={delay(4)}>
        <QrCode size={22} strokeWidth={1.5} />
        <span className="text-xs font-medium">{t("share")}</span>
      </div>
    </div>
  );
}


type Variant = Layout;

function MiniLayout({ variant, theme }: { variant: Variant; theme: Theme }) {
  const tile = "rounded-[3px] bg-(--tint)";

  if (variant === "menucard") {
    return (
      <div className="mx-auto mt-3 w-4/5 space-y-2 rounded-sm bg-(--s) p-3">
        <div className="mx-auto size-6 rounded-full bg-(--a)" />
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center justify-between gap-2 border-b border-(--l) pb-1.5">
            <span className="h-1.5 w-1/2 rounded-full bg-current opacity-30" />
            <span className={`size-5 ${tile}`} />
          </div>
        ))}
      </div>
    );
  }
  if (variant === "lookbook") {
    return (
      <div className="mt-2 px-2">
        <div className={`flex h-16 items-end p-2 ${tile}`}>
          <span className="h-2 w-2/3 rounded-full bg-current opacity-50" />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <span className={`h-20 ${tile}`} />
          <span className={`mt-3 h-16 ${tile}`} />
          <span className={`h-20 ${tile}`} />
        </div>
      </div>
    );
  }
  if (variant === "shelves") {
    return (
      <div className="mt-2 space-y-2.5 overflow-hidden pl-2">
        {[0, 1].map((row) => (
          <div key={row}>
            <span className="block h-1.5 w-1/3 rounded-full bg-current opacity-40" />
            <div className="mt-1.5 flex gap-1.5">
              {[0, 1, 2, 3].map((card) => (
                <span key={card} className={`h-14 w-14 shrink-0 ${tile}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-2 px-2">
      <div className="h-12 rounded-[3px] bg-(--a)" style={{ color: theme.onAccent }} />
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((card) => (
          <span key={card} className={`h-12 ${tile}`} />
        ))}
      </div>
    </div>
  );
}

/** Drawn from the real design colours, so this row can't drift from the product. */
const showcase: { kind: keyof typeof themes; variant: Variant }[] = [
  { kind: "bakery", variant: "storefront" },
  { kind: "electronics", variant: "shelves" },
  { kind: "grocery", variant: "menucard" },
  { kind: "clothing", variant: "lookbook" },
  { kind: "bakery", variant: "shelves" },
  { kind: "grocery", variant: "storefront" },
  { kind: "bakery", variant: "lookbook" },
  { kind: "clothing", variant: "menucard" },
];

export function DesignMarquee() {
  const t = useTranslations("publish.templates");
  const category = useTranslations("categories");
  const row = [...showcase, ...showcase];

  return (
    <div aria-hidden className="overflow-hidden py-4">
      <div className="marquee flex w-max gap-5">
        {row.map(({ kind, variant }, index) => {
          const theme = themes[kind][variant];
          return (
            <div key={index} className="w-52 shrink-0">
              <div className="h-56 overflow-hidden rounded-xl border border-line pt-2 shadow-sm" style={palette(theme)}>
                <div className="flex items-center gap-1.5 px-2">
                  <span className="size-3 rounded-sm bg-(--a)" />
                  <span className="h-1.5 w-12 rounded-full bg-current opacity-40" />
                  <span className="ml-auto h-3 w-3 rounded-sm border border-current opacity-40" />
                </div>
                <MiniLayout variant={variant} theme={theme} />
              </div>
              <p className="mt-2.5 text-sm font-medium">{t(`${variant}.name`)}</p>
              <p className="text-xs text-muted">{category(kind as "bakery")}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrderMessage() {
  const t = useTranslations("landing.features.order");
  const lines = [t("line1"), t("line2"), t("line3")];

  return (
    <div aria-hidden className="ml-auto max-w-xs rounded-xl rounded-tr-sm bg-[#dcf3e3] p-3.5 text-sm text-[#1f2d24]">
      <p className="order-line" style={delay(0)}>{t("intro")}</p>
      {lines.map((line, index) => (
        <p key={line} className="order-line mt-1" style={delay(index + 1)}>{line}</p>
      ))}
      <p className="order-line mt-2 flex items-center justify-between font-medium" style={delay(4)}>
        {t("total")}
        <Check size={14} className="text-[#2f8f5f]" />
      </p>
    </div>
  );
}

export function VarietyPills() {
  const t = useTranslations("landing.features.variety");

  return (
    <div aria-hidden className="flex flex-wrap gap-2 text-sm">
      {[`${t("half")} ₹450`, `${t("one")} ₹850`, `${t("two")} ₹1,600`].map((label, index) => (
        <span key={label} className="pill-cycle rounded-md border border-line px-3 py-1.5" style={delay(index)}>
          {label}
        </span>
      ))}
    </div>
  );
}
