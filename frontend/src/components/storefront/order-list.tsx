"use client";

import { Check, MessageCircle, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  addLine,
  MAX_QUANTITY,
  orderCount,
  orderText,
  orderTotal,
  parseLines,
  resolveLines,
  setLineQuantity,
  type OrderLine,
  type ResolvedLine,
} from "@/lib/order";
import { coverOf, formatPrice, whatsappLink, type StorefrontProduct, type StorefrontShop } from "@/lib/storefront";
import { Photo } from "./parts";

// Kept in the browser so a list survives a refresh. Private modes can refuse
// storage, and then it lasts for the visit.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function readSaved(key: string) {
  try {
    return localStorage.getItem(key) ?? "[]";
  } catch {
    return memory.get(key) ?? "[]";
  }
}

function writeSaved(key: string, lines: OrderLine[]) {
  const value = JSON.stringify(lines);
  try {
    localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
  listeners.forEach((listener) => listener());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

type OrderState = {
  /** False when the shop has no WhatsApp, so a list couldn't be sent anywhere. */
  enabled: boolean;
  lines: ResolvedLine[];
  add: (line: OrderLine) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
};

const OrderContext = createContext<OrderState>({
  enabled: false,
  lines: [],
  add: () => {},
  setQuantity: () => {},
  clear: () => {},
  sheetOpen: false,
  setSheetOpen: () => {},
});

export const useOrder = () => useContext(OrderContext);

type ProviderProps = { shop: StorefrontShop; products: StorefrontProduct[]; children: ReactNode };

export function OrderProvider({ shop, products, children }: ProviderProps) {
  const key = `voicecart-order-${shop.slug ?? shop.name}`;
  const saved = useSyncExternalStore(subscribe, () => readSaved(key), () => "[]");
  const [sheetOpen, setSheetOpen] = useState(false);

  const add = useCallback(
    (line: OrderLine) => writeSaved(key, addLine(parseLines(readSaved(key)), line)),
    [key],
  );
  const setQuantity = useCallback(
    (lineKey: string, quantity: number) =>
      writeSaved(key, setLineQuantity(parseLines(readSaved(key)), lineKey, quantity)),
    [key],
  );
  const clear = useCallback(() => writeSaved(key, []), [key]);

  const value = useMemo(
    () => ({
      enabled: Boolean(shop.whatsapp),
      lines: resolveLines(parseLines(saved), products),
      add,
      setQuantity,
      clear,
      sheetOpen,
      setSheetOpen,
    }),
    [add, clear, products, saved, setQuantity, sheetOpen, shop.whatsapp],
  );

  return <OrderContext value={value}>{children}</OrderContext>;
}

type StepperProps = { value: number; onChange: (value: number) => void; name: string; min?: number };

export function QuantityStepper({ value, onChange, name, min = 1 }: StepperProps) {
  const t = useTranslations("storefront");
  const step = "flex size-9 items-center justify-center disabled:opacity-30";

  return (
    <div className="flex shrink-0 items-center border border-black/15">
      <button type="button" aria-label={t("less", { item: name })} disabled={value <= min} onClick={() => onChange(value - 1)} className={step}>
        <Minus aria-hidden size={15} strokeWidth={1.75} />
      </button>
      <span aria-live="polite" className="w-7 text-center text-sm tabular-nums">{value}</span>
      <button type="button" aria-label={t("more", { item: name })} disabled={value >= MAX_QUANTITY} onClick={() => onChange(value + 1)} className={step}>
        <Plus aria-hidden size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}

function OrderSheet({ shop, onClose }: { shop: StorefrontShop; onClose: () => void }) {
  const t = useTranslations("storefront");
  const { lines, setQuantity, clear } = useOrder();

  const total = orderTotal(lines);
  const hasUnpriced = lines.some((line) => line.totalPaise === null);
  const totalText =
    total === 0 && hasUnpriced
      ? t("orderTotalUnknown")
      : hasUnpriced
        ? t("orderTotalPartial", { price: formatPrice(total) })
        : t("orderTotal", { price: formatPrice(total) });

  const message = orderText(lines, {
    intro: t("orderIntro", { shop: shop.name }),
    total: totalText,
    toConfirm: t("priceToConfirm"),
  });

  return (
    <div className="flex max-h-[88dvh] flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-black/10 px-6 py-4">
        <h2 className="font-display text-2xl tracking-tight">{t("yourOrder")}</h2>
        <button type="button" onClick={onClose} aria-label={t("close")} className="p-1.5 opacity-60 hover:opacity-100">
          <X aria-hidden size={18} strokeWidth={1.5} />
        </button>
      </div>

      <ul className="flex-1 divide-y divide-black/10 overflow-y-auto overscroll-contain px-6">
        {lines.map((line) => {
          const cover = coverOf(line.product);
          const detail = [line.option, ...line.picks].filter(Boolean).join(", ");
          return (
            <li key={line.key} className="flex items-center gap-3 py-3">
              {cover && <Photo src={cover} alt="" width={112} height={112} className="size-14 shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{line.name}</p>
                {detail && <p className="text-sm break-words opacity-65">{detail}</p>}
                <p className="text-sm tabular-nums">
                  {line.totalPaise === null ? t("priceToConfirm") : formatPrice(line.totalPaise)}
                </p>
              </div>
              <QuantityStepper value={line.quantity} min={0} name={line.name} onChange={(quantity) => setQuantity(line.key, quantity)} />
            </li>
          );
        })}
      </ul>

      <div className="space-y-3 border-t border-black/10 p-4 px-6">
        <p className="text-lg font-medium tabular-nums">{totalText}</p>
        <p className="text-sm opacity-65">{t("orderNote")}</p>
        {shop.whatsapp && (
          <a
            href={whatsappLink(shop.whatsapp, message)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 bg-(--shop) px-5 py-3 font-medium text-white"
          >
            <MessageCircle aria-hidden size={18} strokeWidth={1.75} />
            {t("sendOrder")}
          </a>
        )}
        <button type="button" onClick={clear} className="w-full py-1 text-sm underline underline-offset-4 opacity-65 hover:opacity-100">
          {t("clearOrder")}
        </button>
      </div>
    </div>
  );
}

/** The basket in the shop header. */
export function OrderButton() {
  const t = useTranslations("storefront");
  const { enabled, lines, setSheetOpen } = useOrder();
  if (!enabled) return null;

  const count = orderCount(lines);
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={t("orderItems", { count })}
      disabled={count === 0}
      onClick={() => setSheetOpen(true)}
      className="relative flex size-10 items-center justify-center rounded-(--t-radius) border border-(--t-line) disabled:opacity-50"
    >
      <ShoppingBag aria-hidden size={18} strokeWidth={1.75} />
      {count > 0 && (
        <span key={count} className="pop absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--t-accent) px-1 text-xs font-medium text-(--t-on-accent)">
          {count}
        </span>
      )}
    </button>
  );
}

/** One tap for simple products. Those with sizes or flavours open their details instead. */
export function QuickAdd({ product }: { product: StorefrontProduct }) {
  const t = useTranslations("storefront");
  const { enabled, lines, add } = useOrder();
  if (!enabled || !product.is_available) return null;

  const needsChoice = product.options.length > 0 || product.choices.length > 0;
  const base = "shrink-0 rounded-(--t-radius) px-3 py-1.5 text-sm font-medium";
  // Sits under the card's open button on purpose, so a tap opens the choices.
  if (needsChoice) return <span className={`${base} border border-(--t-line)`}>{t("choose")}</span>;

  const count = lines
    .filter((line) => line.name === product.name)
    .reduce((total, line) => total + line.quantity, 0);

  return (
    <button
      type="button"
      aria-label={t("addItem", { item: product.name })}
      onClick={() => add({ name: product.name, option: null, picks: [], quantity: 1 })}
      className={`${base} relative z-[2] inline-flex cursor-pointer items-center gap-1 bg-(--t-accent) text-(--t-on-accent) transition-opacity hover:opacity-90`}
    >
      {count > 0 ? (
        <span key={count} className="pop inline-flex items-center gap-1">
          <Check aria-hidden size={14} strokeWidth={2.25} />
          {count}
        </span>
      ) : (
        <>
          <Plus aria-hidden size={14} strokeWidth={2.25} />
          {t("add")}
        </>
      )}
    </button>
  );
}

/** Appears once something is on the list, and opens the list to review and send. */
export function OrderBar({ shop, hasHeaderButton = false }: { shop: StorefrontShop; hasHeaderButton?: boolean }) {
  const t = useTranslations("storefront");
  const { enabled, lines, sheetOpen: open, setSheetOpen: setOpen } = useOrder();
  const dialog = useRef<HTMLDialogElement>(null);
  const isEmpty = lines.length === 0;

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  useEffect(() => {
    if (isEmpty) dialog.current?.close();
  }, [isEmpty]);

  if (!enabled || isEmpty) return null;

  return (
    <>
      <div className={`pointer-events-none flex justify-center p-3 ${hasHeaderButton ? "md:hidden" : ""}`}>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 bg-(--shop) px-5 py-3 font-medium text-white shadow-lg"
        >
          <span className="flex items-center gap-2">
            <ShoppingBag aria-hidden size={18} strokeWidth={1.75} />
            {t("orderItems", { count: orderCount(lines) })}
          </span>
          <span>{t("viewOrder")}</span>
        </button>
      </div>
      {open && (
        <dialog
          ref={dialog}
          onClose={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
          className="m-auto w-full max-w-lg overflow-hidden bg-white font-sans text-[#1f1e1b] backdrop:bg-black/55 max-md:mb-0 max-md:max-w-none"
        >
          <OrderSheet shop={shop} onClose={() => dialog.current?.close()} />
        </dialog>
      )}
    </>
  );
}
