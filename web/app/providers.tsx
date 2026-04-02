"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { sepolia, inkSepolia } from "viem/chains";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: "light",
          accentColor: "#4d7a00",
          logo: "/android-chrome-192x192.png",
        },
        loginMethods: ["wallet", "google", "email"],
        defaultChain: inkSepolia,
        supportedChains: [inkSepolia, sepolia],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
