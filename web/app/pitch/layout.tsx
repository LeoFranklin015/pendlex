import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Investor pitch — ${APP_NAME}`,
  description: `${APP_NAME} protocol: split xStocks into dividend (dx) and principal (px) tokens on Base.`,
};

export default function PitchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
