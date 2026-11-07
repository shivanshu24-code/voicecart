"use client";

import { MessageCircle, Phone, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { imageUrl } from "@/lib/images";
import { fixedPaise } from "@/lib/order";
import {
  coverOf,
  formatPrice,
  photosOf,
  specs,
  whatsappLink,
  type StorefrontProduct,
  type StorefrontShop,
} from "@/lib/storefront";
import { QuantityStepper, useOrder } from "./order-list";
import { Price } from "./parts";

type Props = { product: StorefrontProduct; shop: StorefrontShop };

const pill =
  "block cursor-pointer rounded-md border border-black/15 px-3 py-2 text-sm transition-colors peer-checked:border-(--shop) peer-checked:bg-(--shop) peer-checked:text-white peer-focus-visible:outline-2 peer-disabled:cursor-not-allowed peer-disabled:line-through peer-disabled:opacity-40";
const action = "flex flex-1 items-center justify-center gap-2 px-3 py-3 font-medium whitespace-nowrap";

function Details({ product, shop, onClose }: Props & { onClose: () => void }) {
  const t = useTranslations("storefront");
  const firstOption = product.options.findIndex((option) => option.is_available);
  const [optionIndex, setOptionIndex] = useState(firstOption);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const order = useOrder();

  const option = product.options[optionIndex];
  const photos = photosOf(product);
  const [photo, setPhoto] = useState(option?.image_url ?? photos[0] ?? null);

  function pickOption(index: number) {
    setOptionIndex(index);
    const image = product.options[index]?.image_url;
    if (image) setPhoto(image);
  }

  function pickChoice(name: string, value: string, image: string | undefined) {
    setPicked({ ...picked, [name]: value });
    if (image) setPhoto(image);
  }

  const details = specs(product);
  const unit = product.unit ? ` / ${product.unit}` : "";
  const fixed = fixedPaise(product);
  const unitPaise = option ? option.price_paise : fixed;
  // For several, the message states the whole amount so it can't be misread.
  const exactPrice =
    unitPaise === null
      ? null
      : quantity > 1
        ? formatPrice(unitPaise * quantity)
        : `${formatPrice(unitPaise)}${option ? "" : unit}`;

  const canOrder = product.is_available && exactPrice !== null;
  const picks = product.choices.flatMap((choice) => picked[choice.name] ?? []);
  const canAdd = order.enabled && product.is_available && (product.options.length === 0 || Boolean(option));
  const item = [product.name, option?.label, ...picks].filter(Boolean).join(", ") +
    (quantity > 1 ? ` × ${quantity}` : "");

  function addToOrder() {
    order.add({ name: product.name, option: option?.label ?? null, picks, quantity });
    onClose();
  }

  const message = canOrder
    ? t("orderMessage", { shop: shop.name, item, price: exactPrice })
    : t("askMessage", { shop: shop.name, item });

  return (
    <div className={`relative max-h-[88dvh] overflow-y-auto overscroll-contain ${photo ? "md:grid md:grid-cols-2" : ""}`}>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute top-3 right-3 z-10 rounded-full bg-white/90 p-2 text-[#1f1e1b] hover:bg-white"
      >
        <X aria-hidden size={18} strokeWidth={1.5} />
      </button>

      {photo && (
        <div className="md:sticky md:top-0 md:self-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary sizes and compresses these */}
          <img src={imageUrl(photo, { width: 1000, height: 1000 })} alt={product.name} className="aspect-[4/3] w-full object-cover md:aspect-square" />
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-6 pt-3 md:px-3 md:pb-3">
          {photos.map((url, index) => (
            <button
              key={url}
              type="button"
              aria-label={t("viewPhoto", { number: index + 1 })}
              aria-pressed={url === photo}
              onClick={() => setPhoto(url)}
              className={`size-14 shrink-0 cursor-pointer overflow-hidden border-2 ${url === photo ? "border-(--shop)" : "border-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary sizes and compresses these */}
              <img src={imageUrl(url, { width: 112, height: 112 })} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
        </div>
      )}

      <div className="flex min-w-0 flex-col">
      <div className="flex-1 space-y-5 p-6 md:p-8">
        <div className="pr-8">
          {product.category && <p className="text-sm text-(--shop)">{product.category}</p>}
          <h2 className="mt-1 font-display text-3xl leading-tight tracking-tight break-words">{product.name}</h2>
          {product.description && <p className="mt-2 leading-relaxed opacity-70">{product.description}</p>}
        </div>

        {product.options.length > 0 && (
          <fieldset>
            <legend className="text-sm opacity-60">{t("chooseOption")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.options.map((choice, index) => (
                <label key={choice.label}>
                  <input
                    type="radio"
                    name="option"
                    className="peer sr-only"
                    checked={optionIndex === index}
                    disabled={!choice.is_available || !product.is_available}
                    onChange={() => pickOption(index)}
                  />
                  <span className={pill}>
                    {choice.label}
                    <span className="ml-2 tabular-nums opacity-75">{formatPrice(choice.price_paise)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {product.choices.map((choice) => (
          <fieldset key={choice.name}>
            <legend className="text-sm opacity-60">{choice.name}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {choice.values.map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={choice.name}
                    className="peer sr-only"
                    checked={picked[choice.name] === value}
                    onChange={() => pickChoice(choice.name, value, choice.images?.[value])}
                  />
                  <span className={pill}>{value}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {details.length > 0 && (
          <dl className="divide-y divide-black/10 border-y border-black/10 text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2">
                <dt className="opacity-60">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
        )}

      </div>

      {/* Stays in view, so ordering never needs a scroll past the photo. */}
      <div className="sticky bottom-0 space-y-3 border-t border-black/10 bg-white p-4 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-2xl tabular-nums">
            {product.is_available && option ? formatPrice(option.price_paise) : <Price product={product} />}
          </p>
          {canAdd && <QuantityStepper value={quantity} onChange={setQuantity} name={product.name} />}
        </div>

        <div className="flex flex-wrap gap-3">
          {canAdd && (
            <button type="button" onClick={addToOrder} className={`${action} basis-full bg-(--shop) text-white`}>
              <Plus aria-hidden size={18} strokeWidth={1.75} />
              {t("addToOrder")}
            </button>
          )}
          {shop.whatsapp && (
            <a
              href={whatsappLink(shop.whatsapp, message)}
              target="_blank"
              rel="noreferrer"
              className={`${action} ${canAdd ? "border border-black/15" : "bg-(--shop) text-white"}`}
            >
              <MessageCircle aria-hidden size={18} strokeWidth={1.75} />
              {canOrder ? t("orderOnWhatsapp") : t("askOnWhatsapp")}
            </a>
          )}
          {shop.phone && (
            <a
              href={`tel:${shop.phone}`}
              className={`${action} ${shop.whatsapp ? "border border-black/15" : "bg-(--shop) text-white"}`}
            >
              <Phone aria-hidden size={18} strokeWidth={1.75} />
              {t("call")}
            </a>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/**
 * Covers its parent (which must be relative) so the whole card opens the
 * product. The dialog mounts only when opened, so long catalogues stay light.
 */
export function ProductOpen({ product, shop }: Props) {
  const t = useTranslations("storefront");
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={t("viewProduct", { product: product.name })}
        onClick={() => setOpen(true)}
        className="absolute inset-0 z-[1] cursor-pointer transition-colors hover:bg-current/5"
      />
      {open && (
        <dialog
          ref={dialog}
          onClose={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
          className={`m-auto w-full overflow-hidden bg-white font-sans text-[#1f1e1b] backdrop:bg-black/55 max-md:mb-0 max-md:max-w-none ${coverOf(product) ? "max-w-3xl" : "max-w-lg"}`}
        >
          <Details product={product} shop={shop} onClose={() => dialog.current?.close()} />
        </dialog>
      )}
    </>
  );
}
