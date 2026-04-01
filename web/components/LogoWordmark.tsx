import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

type LogoWordmarkProps = {
  href?: string;
  className?: string;
  /** Pixel size for logo image (width and height) */
  iconSize?: number;
  /** Tailwind text size class for the wordmark */
  textClassName?: string;
  /** Extra content after the wordmark (same link target) */
  suffix?: ReactNode;
  /** Classes for the logo image (e.g. opacity) */
  imageClassName?: string;
};

/**
 * Brand lockup: icon + Safira wordmark with "Stream" in accent lime.
 * Use everywhere the product name appears next to the logo.
 */
export function LogoWordmark({
  href = "/",
  className,
  iconSize = 32,
  textClassName = "text-lg",
  suffix,
  imageClassName,
}: LogoWordmarkProps) {
  const dim =
    iconSize <= 24 ? "h-6 w-6" : iconSize <= 28 ? "h-7 w-7" : "h-8 w-8";

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2",
        suffix && "gap-3",
        className
      )}
    >
      <Image
        src="/logo-transparent.png"
        alt={`${APP_NAME} logo`}
        width={iconSize}
        height={iconSize}
        className={cn(dim, imageClassName)}
      />
      <span
        className={cn(
          "font-[family-name:var(--font-safira)] tracking-tight text-foreground",
          textClassName
        )}
      >
        {APP_NAME.slice(0, 1)}
        <span className="text-[#c8ff00]">{APP_NAME.slice(1)}</span>
      </span>
      {suffix}
    </Link>
  );
}
