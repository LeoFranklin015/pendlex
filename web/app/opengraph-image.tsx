import { ImageResponse } from "next/og";
import { APP_NAME } from "@/lib/constants";

export const runtime = "edge";

export const alt = `${APP_NAME} splits tokenized equities into dividend and principal tokens`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #0a0a0a 0%, #121208 45%, #0a0a0a 100%)",
          padding: 56,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(200, 255, 0, 0.12), transparent 55%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16, zIndex: 1 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(200, 255, 0, 0.15)",
              border: "1px solid rgba(200, 255, 0, 0.35)",
            }}
          />
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: -1,
              color: "#f0f0f0",
            }}
          >
            x<span style={{ color: "#c8ff00" }}>Stream</span>
          </span>
        </div>
        <div style={{ zIndex: 1, maxWidth: 880 }}>
          <p
            style={{
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#f0f0f0",
              margin: 0,
              letterSpacing: -1.5,
            }}
          >
            Split xStocks into yield and price
          </p>
          <p
            style={{
              marginTop: 20,
              fontSize: 24,
              color: "rgba(240, 240, 240, 0.65)",
              lineHeight: 1.4,
            }}
          >
            dx for dividends 24/7. px for NYSE-hours exposure. Recombine anytime. Built on Base with
            Pyth.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            zIndex: 1,
            fontSize: 15,
            color: "rgba(200, 255, 0, 0.85)",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          <span style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(200,255,0,0.25)" }}>
            dx + px
          </span>
          <span style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", color: "#888" }}>
            AAPL / ABT / SPY
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
