"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { saveBranding } from "@/app/publish-actions";
import { PhotoSlot } from "@/components/products/photo-upload";

type Props = {
  shopId: string;
  initialLogo: string | null;
  initialBanner: string | null;
  onSaved: () => void;
};

/** Logo and banner save straight away, like choosing a photo on a phone. */
export function Branding({ shopId, initialLogo, initialBanner, onSaved }: Props) {
  const t = useTranslations("publish");
  const [logo, setLogo] = useState(initialLogo);
  const [banner, setBanner] = useState(initialBanner);
  const [failed, setFailed] = useState(false);

  async function save(field: "logo_url" | "banner_url", url: string | null) {
    const result = await saveBranding(shopId, { [field]: url });
    setFailed(!result.ok);
    if (!result.ok) return;
    if (field === "logo_url") setLogo(url);
    else setBanner(url);
    onSaved();
  }

  return (
    <section>
      <h2 className="font-display text-2xl">{t("brandTitle")}</h2>
      <p className="mt-1 text-muted">{t("brandBody")}</p>
      <div className="mt-5 flex flex-wrap gap-8">
        <div>
          <p className="mb-2 text-sm text-muted">{t("logo")}</p>
          <PhotoSlot
            shopId={shopId}
            value={logo}
            onChange={(url) => save("logo_url", url)}
            label={t("logo")}
            className="size-28"
            width={224}
            height={224}
            fit="limit"
          />
        </div>
        <div className="min-w-0 flex-1 basis-72">
          <p className="mb-2 text-sm text-muted">{t("banner")}</p>
          <PhotoSlot
            shopId={shopId}
            value={banner}
            onChange={(url) => save("banner_url", url)}
            label={t("banner")}
            className="h-28 w-full max-w-md"
            width={900}
            height={224}
          />
        </div>
      </div>
      {failed && (
        <p role="alert" className="mt-3 text-sm text-accent">
          {t("errors.failed")}
        </p>
      )}
    </section>
  );
}
