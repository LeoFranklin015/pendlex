import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Documentation — ${APP_NAME}`,
  description: `How ${APP_NAME} splits xStocks into dividend (dx) and principal (px) tokens, vault, exchange, and oracles on Base.`,
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
