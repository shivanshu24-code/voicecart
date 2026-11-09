"use client";

import { ImagePlus, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useContext, useState, type ChangeEvent } from "react";
import { getUploadSignature } from "@/app/product-actions";
import { imageUrl } from "@/lib/images";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 2400;
const SHRINK_ABOVE = 1.5 * 1024 * 1024;

/** Phone photos are large, so they're made smaller here to upload faster on mobile data. */
export async function shrink(file: File): Promise<Blob> {
  // PNGs are left alone because logos often need their transparent background.
  if (file.size < SHRINK_ABOVE || file.type === "image/png") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    // Some formats can't be read in every browser; Cloudinary still can.
    return file;
  }
}

/** Sends a photo straight to Cloudinary. Returns its address, or throws an error key. */
async function uploadPhoto(shopId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("photoType");

  const image = await shrink(file);
  if (image.size > MAX_BYTES) throw new Error("photoSize");

  const signature = await getUploadSignature(shopId);
  if (!signature.ok) throw new Error("photoFailed");

  const { cloud_name: cloud, ...fields } = signature.data;
  const form = new FormData();
  form.append("file", image, file.name);
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) throw new Error("photoFailed");
  return ((await response.json()) as { secure_url: string }).secure_url;
}

/** Lets a form wait for its uploads, so saving early can't lose a photo. */
export const UploadTracker = createContext<(change: number) => void>(() => {});

function useUpload(shopId: string, onUploaded: (url: string) => void) {
  const track = useContext(UploadTracker);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    setBusy(true);
    setError(null);
    track(1);
    for (const file of files) {
      try {
        onUploaded(await uploadPhoto(shopId, file));
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "photoFailed");
      }
    }
    track(-1);
    setBusy(false);
  }

  return { busy, error, onFiles };
}

const tile = "relative flex items-center justify-center overflow-hidden rounded-md border border-line bg-panel";
const remove = "absolute top-0.5 right-0.5 rounded-full bg-white/90 p-0.5 text-ink hover:bg-white";

function PhotoError({ code }: { code: string | null }) {
  const t = useTranslations("products.errors");
  if (!code) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-accent">
      {t(code as "photoFailed")}
    </p>
  );
}

type ListProps = {
  shopId: string;
  value: string[];
  /** Takes an update, because uploads finish after the form may have changed. */
  onChange: (update: (current: string[]) => string[]) => void;
  max: number;
};

/** A product's photos. The first is the cover shown on the website. */
export function PhotoList({ shopId, value, onChange, max }: ListProps) {
  const t = useTranslations("products");
  const { busy, error, onFiles } = useUpload(shopId, (url) =>
    onChange((current) => [...current, url].slice(0, max)),
  );

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {value.map((url, index) => (
          <li key={url} className={`${tile} size-20`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary resizes these */}
            <img src={imageUrl(url, { width: 160, height: 160 })} alt="" className="size-full object-cover" />
            <button type="button" aria-label={t("removePhoto")} onClick={() => onChange((current) => current.filter((other) => other !== url))} className={remove}>
              <X aria-hidden size={13} />
            </button>
            {index > 0 && (
              <button
                type="button"
                aria-label={t("makeCover")}
                title={t("makeCover")}
                onClick={() => onChange((current) => [url, ...current.filter((other) => other !== url)])}
                className="absolute bottom-0.5 left-0.5 rounded-full bg-white/90 p-0.5 text-ink hover:bg-white"
              >
                <Star aria-hidden size={13} />
              </button>
            )}
          </li>
        ))}
        {value.length < max && (
          <li>
            <label className={`${tile} size-20 cursor-pointer border-dashed text-muted hover:text-ink`}>
              <input type="file" accept="image/*" multiple aria-label={t("addPhoto")} disabled={busy} onChange={onFiles} className="sr-only" />
              {busy ? <span className="text-xs">{t("uploading")}</span> : <ImagePlus aria-hidden size={20} strokeWidth={1.5} />}
            </label>
          </li>
        )}
      </ul>
      <PhotoError code={error} />
    </div>
  );
}

type SlotProps = {
  shopId: string;
  value: string | null;
  onChange: (next: string | null) => void;
  label: string;
  className?: string;
  width?: number;
  height?: number;
  fit?: "fill" | "limit";
};

/** One photo, such as for a colour, a logo or a banner. */
export function PhotoSlot({ shopId, value, onChange, label, className = "size-11", width = 88, height = 88, fit = "fill" }: SlotProps) {
  const t = useTranslations("products");
  const { busy, error, onFiles } = useUpload(shopId, onChange);

  return (
    <div>
      {value ? (
        <div className={`${tile} ${className}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary resizes these */}
          <img src={imageUrl(value, { width, height, fit })} alt={label} className={`size-full ${fit === "fill" ? "object-cover" : "object-contain"}`} />
          <button type="button" aria-label={t("removePhotoOf", { name: label })} onClick={() => onChange(null)} className={remove}>
            <X aria-hidden size={12} />
          </button>
        </div>
      ) : (
        <label className={`${tile} ${className} cursor-pointer border-dashed text-muted hover:text-ink`}>
          <input type="file" accept="image/*" aria-label={t("addPhotoOf", { name: label })} disabled={busy} onChange={onFiles} className="sr-only" />
          {busy ? <span className="text-[0.65rem]">…</span> : <ImagePlus aria-hidden size={16} strokeWidth={1.5} />}
        </label>
      )}
      <PhotoError code={error} />
    </div>
  );
}
