import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "./providers";
import { APP_NAME, APP_NAME_FULL } from "@/lib/constants";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const safiraMarch = localFont({
  src: "./fonts/safira-march/Safira March Personal Use Only.ttf",
  variable: "--font-safira",
  display: "swap",
});

function metadataBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL);
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: {
    default: `${APP_NAME} | Split xStocks into dx and px`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    `${APP_NAME} is a DeFi protocol on Base that splits tokenized equities (xStocks) into a dividend token (dx) and a principal token (px): yield around the clock, price exposure in NYSE hours, Pyth-powered pricing, and recombination to the underlying.`,
  applicationName: APP_NAME_FULL,
  manifest: "/site.webmanifest",
  openGraph: {
    title: `${APP_NAME} | Split xStocks into dx and px`,
    description:
      "Yield on dx 24/7. Price on px when the tape is open. One vault, two markets, recombine anytime.",
    type: "website",
    siteName: APP_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} | Split xStocks into dx and px`,
    description:
      "Split tokenized equities into dividend and principal tokens on Base. dx for yield, px for session-bound price exposure.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${safiraMarch.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col grain">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
