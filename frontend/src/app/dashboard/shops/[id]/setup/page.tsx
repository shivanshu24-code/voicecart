import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VoiceSetup } from "@/components/voice/voice-setup";
import { api, type Shop } from "@/lib/api";
import { isPreview } from "@/lib/env";

export default async function SetupPage({ params }: PageProps<"/dashboard/shops/[id]/setup">) {
  if (isPreview) redirect("/dashboard");

  const { id } = await params;
  const t = await getTranslations("setup");
  const shop = await api<Shop>(`/api/shops/${id}`).catch(() => notFound());

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft aria-hidden size={15} strokeWidth={1.5} />
        {t("back")}
      </Link>
      <h1 className="mt-4 font-display text-3xl tracking-tight md:text-4xl">{shop.name}</h1>
      <VoiceSetup shopId={shop.id} />
    </div>
  );
}
