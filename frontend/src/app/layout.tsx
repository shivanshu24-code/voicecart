import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import {
  Instrument_Sans,
  Newsreader,
  Noto_Sans_Devanagari,
  Noto_Serif_Devanagari,
} from "next/font/google";
import "./globals.css";

const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"] });
// Hindi fonts are big and only needed when Hindi text is on the page. Not
// preloading them lets the browser fetch them only when it meets Devanagari,
// so English pages on slow phones skip the download entirely.
const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  preload: false,
});
const notoSerifDevanagari = Noto_Serif_Devanagari({
  variable: "--font-noto-serif-devanagari",
  subsets: ["devanagari"],
  preload: false,
});

export const metadata: Metadata = {
  // Lets link previews use full addresses once the site has its public one.
  metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
  title: "VoiceCart",
  description: "Create your shop's website just by speaking.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const fonts = [instrument, newsreader, notoDevanagari, notoSerifDevanagari]
    .map((font) => font.variable)
    .join(" ");

  return (
    <html lang={locale} className={`${fonts} h-full antialiased`}>
      <body className="min-h-full">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
