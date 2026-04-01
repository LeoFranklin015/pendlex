"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ReactLenis } from "lenis/react";

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
      <ReactLenis root options={{ lerp: 0.1, duration: 1.2, smoothWheel: true }}>
        {children}
      </ReactLenis>
    </PrivyProvider>
  );
}
