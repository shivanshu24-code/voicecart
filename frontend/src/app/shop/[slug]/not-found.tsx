import { getTranslations } from "next-intl/server";

export default async function ShopNotFound() {
  const t = await getTranslations("storefront");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="font-display text-3xl">{t("notFoundTitle")}</h1>
      <p className="mt-3 max-w-sm text-muted">{t("notFoundBody")}</p>
    </main>
  );
}
