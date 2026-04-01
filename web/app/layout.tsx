import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "./providers";

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

export const metadata: Metadata = {
  title: "pendleX Markets - Split. Trade. Earn.",
  description:
    "Two tokens. Two markets. One vault. Split tokenized ETFs into income and price exposure tokens. Earn predictable yield or trade with clean leverage.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
      },
      {
        rel: "icon",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
      },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "pendleX Markets - Split. Trade. Earn.",
    description:
      "Two tokens. Two markets. One vault. DeFi dividend stripping and leveraged day trading.",
    type: "website",
    images: [{ url: "/logo-transparent.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "pendleX Markets",
    description:
      "Split tokenized ETFs into income and price tokens. Earn yield or trade with leverage.",
    images: ["/logo-transparent.png"],
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
