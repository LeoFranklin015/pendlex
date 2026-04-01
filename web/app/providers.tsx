"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ReactLenis } from "lenis/react";
import { usePathname } from "next/navigation";

function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppRoute = pathname.startsWith("/app");

  // Lenis root mode hijacks scroll on <html>, which breaks nested
  // overflow-y-auto containers like the app layout's <main>.
  // Only enable it for the marketing/landing pages.
  if (isAppRoute) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.2, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#c8ff00",
          logo: "/logo-transparent.png",
        },
        loginMethods: ["wallet", "email"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <SmoothScroll>{children}</SmoothScroll>
    </PrivyProvider>
  );
}
