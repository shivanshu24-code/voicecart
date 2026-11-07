import { Camera, Clock, Eye, LayoutTemplate, Mic, PencilLine, QrCode, Search, Send } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { CSSProperties } from "react";
import { SiteFooterBar, SiteHeader } from "@/components/landing/site-chrome";
import { DesignMarquee, HeroVisual, OrderMessage, VarietyPills, Waveform } from "@/components/landing/visuals";
import { RevealOnScroll } from "@/components/storefront/reveal-on-scroll";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    openGraph: { title: t("meta.title"), description: t("meta.description"), type: "website" },
  };
}

const order = (i: number) => ({ "--i": i }) as CSSProperties;

const primary =
  "inline-flex items-center justify-center rounded-full bg-brand px-7 py-3.5 font-medium text-paper transition-colors hover:bg-brand-dark";
const secondary =
  "inline-flex items-center justify-center rounded-full border border-line bg-card px-7 py-3.5 font-medium transition-colors hover:border-muted";
const card = "lift reveal rounded-2xl border border-line bg-card p-6 md:p-7";

const steps = [
  { key: "speak", icon: Mic },
  { key: "review", icon: PencilLine },
  { key: "publish", icon: Send },
] as const;

const smallFeatures = [
  { key: "photos", icon: Camera },
  { key: "search", icon: Search },
  { key: "share", icon: QrCode },
  { key: "editor", icon: PencilLine },
] as const;

const questions = ["skills", "languages", "invent", "voice", "orders", "edit"] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <div id="top" className="landing overflow-x-clip">
      <SiteHeader />

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-12 pb-16 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-24">
          <div>
            <p className="rise inline-flex items-center gap-2.5 rounded-full border border-line bg-card px-3.5 py-1.5 text-sm text-muted">
              <Waveform />
              {t("hero.eyebrow")}
            </p>
            <h1 className="rise mt-6 font-display text-5xl leading-[1.05] tracking-tight md:text-7xl" style={order(1)}>
              {t("hero.title")}
            </h1>
            <p className="rise mt-6 max-w-lg text-lg leading-relaxed text-muted" style={order(2)}>
              {t("hero.body")}
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={order(3)}>
              <Link href="/login" className={primary}>{t("hero.cta")}</Link>
              <a href="#how" className={secondary}>{t("hero.secondary")}</a>
            </div>
            <p className="rise mt-5 text-sm text-muted" style={order(4)}>{t("hero.note")}</p>
          </div>
          <div className="rise" style={order(2)}>
            <HeroVisual />
          </div>
        </section>

        <section id="how" className="scroll-mt-20 border-y border-line bg-panel/60">
          <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
            <h2 className="reveal max-w-xl font-display text-4xl tracking-tight md:text-5xl">{t("how.title")}</h2>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map(({ key, icon: Icon }, index) => (
                <li key={key} className={card} style={order(index)}>
                  <span className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <Icon aria-hidden size={19} strokeWidth={1.5} />
                    </span>
                    <span className="font-display text-3xl text-line">{index + 1}</span>
                  </span>
                  <h3 className="mt-5 font-display text-2xl">{t(`how.${key}.title`)}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{t(`how.${key}.body`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 md:px-8 md:py-24">
          <h2 className="reveal max-w-2xl font-display text-4xl tracking-tight md:text-5xl">{t("features.title")}</h2>
          <p className="reveal mt-4 max-w-xl text-lg text-muted">{t("features.body")}</p>

          <div className="mt-12 grid gap-5 md:grid-cols-6">
            <article className={`${card} md:col-span-3`} style={order(0)}>
              <Mic aria-hidden size={20} strokeWidth={1.5} className="text-brand" />
              <h3 className="mt-4 font-display text-2xl">{t("features.voice.title")}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t("features.voice.body")}</p>
              <div className="mt-5 flex items-center gap-3 rounded-xl bg-panel px-4 py-3">
                <Waveform />
                <span className="text-sm text-muted">“{t("features.voice.sample")}”</span>
              </div>
            </article>

            <article className={`${card} md:col-span-3`} style={order(1)}>
              <h3 className="font-display text-2xl">{t("features.order.title")}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t("features.order.body")}</p>
              <div className="mt-5"><OrderMessage /></div>
            </article>

            <article className={`${card} md:col-span-2`} style={order(0)}>
              <h3 className="font-display text-2xl">{t("features.variety.title")}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t("features.variety.body")}</p>
              <div className="mt-5"><VarietyPills /></div>
            </article>

            <article className={`${card} md:col-span-2`} style={order(1)}>
              <Clock aria-hidden size={20} strokeWidth={1.5} className="text-brand" />
              <h3 className="mt-4 font-display text-2xl">{t("features.open.title")}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t("features.open.body")}</p>
              <p className="mt-5 flex items-center gap-2 text-sm font-medium">
                <span className="pulse-dot size-2 rounded-full bg-[#2f8f5f]" />
                {t("features.open.sample")}
              </p>
            </article>

            <article className={`${card} md:col-span-2`} style={order(2)}>
              <Eye aria-hidden size={20} strokeWidth={1.5} className="text-brand" />
              <h3 className="mt-4 font-display text-2xl">{t("features.review.title")}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t("features.review.body")}</p>
            </article>
          </div>

          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {smallFeatures.map(({ key, icon: Icon }, index) => (
              <li key={key} className={card} style={order(index)}>
                <Icon aria-hidden size={20} strokeWidth={1.5} className="text-brand" />
                <h3 className="mt-3 font-medium">{t(`features.${key}.title`)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t(`features.${key}.body`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="designs" className="scroll-mt-20 border-y border-line bg-panel/60 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <LayoutTemplate aria-hidden size={22} strokeWidth={1.5} className="reveal text-brand" />
            <h2 className="reveal mt-3 max-w-2xl font-display text-4xl tracking-tight md:text-5xl">{t("designs.title")}</h2>
            <p className="reveal mt-4 max-w-xl text-lg text-muted">{t("designs.body")}</p>
          </div>
          <div className="mt-10"><DesignMarquee /></div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-16 md:px-8 md:py-24">
          <h2 className="reveal font-display text-4xl tracking-tight md:text-5xl">{t("faq.title")}</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {questions.map((key) => (
              <details key={key} className="faq reveal group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-medium">
                  {t(`faq.${key}.q`)}
                  <span aria-hidden className="text-xl text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-muted">{t(`faq.${key}.a`)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="px-5 pb-16 md:px-8 md:pb-24">
          <div className="reveal mx-auto max-w-6xl rounded-3xl bg-brand px-6 py-14 text-center text-paper md:py-20">
            <h2 className="mx-auto max-w-2xl font-display text-4xl tracking-tight md:text-6xl">{t("final.title")}</h2>
            <p className="mx-auto mt-4 max-w-lg text-lg opacity-80">{t("final.body")}</p>
            <Link href="/login" className="mt-8 inline-flex rounded-full bg-paper px-7 py-3.5 font-medium text-brand transition-opacity hover:opacity-90">
              {t("hero.cta")}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooterBar />
      <RevealOnScroll />
    </div>
  );
}
