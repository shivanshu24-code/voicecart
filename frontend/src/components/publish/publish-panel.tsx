"use client";

import { Check, Monitor, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { checkSlug, publishShop, saveTemplate, unpublishShop } from "@/app/publish-actions";
import { parseTemplate, shopKinds, templatesFor, type ShopKind, type Template } from "@/lib/storefront";
import { Branding } from "./branding";

type Props = {
  shopId: string;
  origin: string;
  lockedSlug: string | null;
  initialSlug: string;
  initialTemplate: Template;
  shopKind: ShopKind;
  initiallyPublished: boolean;
  initialLogo: string | null;
  initialBanner: string | null;
  blockers: string[];
  hasProducts: boolean;
};

type SlugState = "ok" | "taken" | "invalid" | null;

const button = "rounded-md px-4 py-2.5 font-medium transition-colors disabled:opacity-40";
const primary = `${button} bg-brand text-paper hover:bg-brand-dark`;
const secondary = `${button} border border-line bg-card hover:border-muted`;

/** A live page shrunk to a quarter of its size, so owners judge the real design. */
/** Layouts share a name across shop kinds; originals each have their own. */
const designKey = (template: Template) => parseTemplate(template).layout ?? template;

function TemplateCard({ shopId, revision, template, selected, onSelect }: {
  shopId: string;
  revision: number;
  template: Template;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("publish");

  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className="group w-80 max-w-full text-left">
      <span
        className={`relative block h-[210px] w-80 max-w-full overflow-hidden rounded-md border bg-white transition-colors ${
          selected ? "border-ink ring-1 ring-ink" : "border-line group-hover:border-muted"
        }`}
      >
        <iframe
          title={t(`templates.${designKey(template)}.name`)}
          src={`/preview/${shopId}?template=${template}&v=${revision}`}
          tabIndex={-1}
          aria-hidden
          loading="lazy"
          scrolling="no"
          className="pointer-events-none h-[840px] w-[1280px] origin-top-left scale-25 border-0"
        />
        {selected && (
          <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-ink text-paper">
            <Check aria-hidden size={14} />
          </span>
        )}
      </span>
      <span className="mt-3 block font-medium">{t(`templates.${designKey(template)}.name`)}</span>
      <span className="block text-sm text-muted">{t(`templates.${designKey(template)}.body`)}</span>
    </button>
  );
}

export function PublishPanel(props: Props) {
  const { shopId, origin, lockedSlug, blockers, hasProducts } = props;
  const t = useTranslations("publish");

  const [slug, setSlug] = useState(props.initialSlug);
  const [slugState, setSlugState] = useState<SlugState>(null);
  const [template, setTemplate] = useState(props.initialTemplate);
  const [kind, setKind] = useState(props.shopKind);
  const category = useTranslations("categories");
  const [device, setDevice] = useState<"mobile" | "desktop">("desktop");
  const [published, setPublished] = useState(props.initiallyPublished);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  // Changing this reloads the previews after a new logo or banner.
  const [revision, setRevision] = useState(0);

  const url = `${origin}/shop/${slug}`;

  useEffect(() => {
    if (lockedSlug) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkSlug(shopId, slug);
      if (cancelled || !result.ok) return;
      if (!result.data.valid) setSlugState("invalid");
      else setSlugState(result.data.available ? "ok" : "taken");
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lockedSlug, shopId, slug]);

  useEffect(() => {
    if (!published) return;
    let cancelled = false;
    QRCode.toDataURL(url, { width: 640, margin: 2, color: { dark: "#1f1e1b", light: "#ffffff" } }).then(
      (image) => {
        if (!cancelled) setQr(image);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [published, url]);

  function choose(option: Template) {
    setTemplate(option);
    // A live shop changes only on "Save changes"; a draft keeps the choice straight away.
    if (!published) saveTemplate(shopId, option);
  }

  async function publish() {
    setBusy(true);
    setError(null);
    const result = await publishShop(shopId, slug, template);
    setBusy(false);
    if (result.ok) setPublished(true);
    else setError(result.code === "slug_taken" ? "taken" : "failed");
  }

  async function unpublish() {
    setBusy(true);
    setError(null);
    const result = await unpublishShop(shopId);
    setBusy(false);
    if (result.ok) setPublished(false);
    else setError("failed");
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canPublish = blockers.length === 0 && (lockedSlug !== null || slugState === "ok");

  return (
    <div className="mt-8 space-y-14 border-t border-line pt-8">
      <Branding
        shopId={shopId}
        initialLogo={props.initialLogo}
        initialBanner={props.initialBanner}
        onSaved={() => setRevision((current) => current + 1)}
      />

      <section>
        <h2 className="font-display text-2xl">{t("galleryTitle")}</h2>
        <p className="mt-1 text-muted">{hasProducts ? t("galleryBody") : t("gallerySample")}</p>
        <div role="group" aria-label={t("galleryKinds")} className="mt-5 flex flex-wrap gap-2">
          {shopKinds.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={kind === option}
              onClick={() => setKind(option)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                kind === option ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-muted"
              }`}
            >
              {category(option === "generic" ? "other" : option)}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-8">
          {templatesFor(kind).map((option) => (
            <TemplateCard
              key={option}
              shopId={shopId}
              revision={revision}
              template={option}
              selected={template === option}
              onSelect={() => choose(option)}
            />
          ))}
        </div>
      </section>

      <section aria-label={t("previewTitle")}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{t("previewTitle")}</h2>
          <div role="group" aria-label={t("previewSize")} className="flex gap-1">
            {(["desktop", "mobile"] as const).map((option) => {
              const Icon = option === "mobile" ? Smartphone : Monitor;
              return (
                <button
                  key={option}
                  type="button"
                  aria-label={t(option)}
                  aria-pressed={device === option}
                  onClick={() => setDevice(option)}
                  className={`rounded-md p-2 ${device === option ? "bg-panel" : "text-muted hover:text-ink"}`}
                >
                  <Icon aria-hidden size={17} strokeWidth={1.5} />
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex justify-center rounded-md bg-panel p-3">
          <iframe
            title={t("previewTitle")}
            src={`/preview/${shopId}?template=${template}&v=${revision}`}
            className={`h-[680px] rounded-sm border border-line bg-white ${
              device === "mobile" ? "w-[375px] max-w-full" : "w-full"
            }`}
          />
        </div>
      </section>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          {blockers.length > 0 && (
            <section>
              <h2 className="font-display text-2xl">{t("needsTitle")}</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-accent">
                {blockers.map((blocker) => (
                  <li key={blocker}>{t(`blockers.${blocker}`)}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`/dashboard/shops/${shopId}/setup`} className={primary}>
                  {t("finishByVoice")}
                </Link>
                <Link href={`/dashboard/shops/${shopId}/details`} className={secondary}>
                  {t("finishByTyping")}
                </Link>
              </div>
            </section>
          )}

          <section>
            <label className="block font-medium" htmlFor="slug">
              {t("addressTitle")}
            </label>
            <div className="mt-2 flex items-center rounded-md border border-line bg-card px-3 focus-within:border-muted">
              <span className="shrink-0 text-sm text-muted">/shop/</span>
              <input
                id="slug"
                value={slug}
                readOnly={lockedSlug !== null}
                maxLength={60}
                onChange={(event) => {
                  setSlugState(null);
                  setSlug(event.target.value.toLowerCase());
                }}
                className="w-full min-w-0 bg-transparent py-2 outline-none"
              />
            </div>
            <p aria-live="polite" className="mt-1.5 text-sm text-muted">
              {lockedSlug
                ? t("addressLocked")
                : slugState === "ok"
                  ? t("addressOk")
                  : slugState === "taken"
                    ? t("addressTaken")
                    : slugState === "invalid"
                      ? t("addressInvalid")
                      : t("addressChecking")}
            </p>
          </section>

          {error && (
            <p role="alert" className="text-sm text-accent">
              {t(`errors.${error}`)}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={publish} disabled={busy || !canPublish} className={primary}>
              {published ? t("saveChanges") : t("publish")}
            </button>
            {published && (
              <button type="button" onClick={unpublish} disabled={busy} className={secondary}>
                {t("unpublish")}
              </button>
            )}
          </div>
        </div>

        {published && (
          <section>
            <h2 className="font-display text-2xl">{t("liveTitle")}</h2>
            <a href={url} target="_blank" rel="noreferrer" className="mt-2 block text-sm break-all underline underline-offset-4">
              {url}
            </a>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <button type="button" onClick={copy} className={secondary}>
                <span className="inline-flex items-center gap-1.5">
                  {copied && <Check aria-hidden size={15} />}
                  {copied ? t("copied") : t("copy")}
                </span>
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" className={secondary}>
                {t("shareWhatsapp")}
              </a>
            </div>
            {qr && (
              <div className="mt-5">
                {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
                <img src={qr} alt={t("qrAlt")} className="size-44 rounded-md border border-line" />
                <a href={qr} download={`${slug}-qr.png`} className="mt-2 inline-block text-sm underline underline-offset-4">
                  {t("downloadQr")}
                </a>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
