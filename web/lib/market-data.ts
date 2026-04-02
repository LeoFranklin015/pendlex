// xStocks asset definitions with Pyth price feed IDs

export interface Asset {
  ticker: string;
  name: string;
  symbol: string; // underlying symbol e.g. NVDA
  type: "Stock" | "ETF";
  color: string;
  logo: string;
  pythFeedId: string;
  // Live data (populated at runtime)
  price: number;
  prevPrice: number;
  change: number;
  changePercent: number;
  confidence: number;
  apy: number;
}

// Pyth regular market hours feed IDs (Equity.US.XXX/USD)
export const PYTH_FEED_IDS = {
  NVDA: "b1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593",
  GOOGL: "5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6",
  AAPL: "49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
  SPY: "19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5",
} as const;

export const xStockAssets: Asset[] = [
  {
    ticker: "NVDAxt",
    name: "NVIDIA xStock",
    symbol: "NVDA",
    type: "Stock",
    color: "#76b900",
    logo: "https://cdn.coinranking.com/kP6uW3Jh_/NVDAx.png",
    pythFeedId: PYTH_FEED_IDS.NVDA,
    price: 0,
    prevPrice: 0,
    change: 0,
    changePercent: 0,
    confidence: 0,
    apy: 0,
  },
  {
    ticker: "GOOGLxt",
    name: "Alphabet xStock",
    symbol: "GOOGL",
    type: "Stock",
    color: "#4285f4",
    logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/37013.png",
    pythFeedId: PYTH_FEED_IDS.GOOGL,
    price: 0,
    prevPrice: 0,
    change: 0,
    changePercent: 0,
    confidence: 0,
    apy: 0,
  },
  {
    ticker: "AAPLxt",
    name: "Apple xStock",
    symbol: "AAPL",
    type: "Stock",
    color: "#555555",
    logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/36994.png",
    pythFeedId: PYTH_FEED_IDS.AAPL,
    price: 0,
    prevPrice: 0,
    change: 0,
    changePercent: 0,
    confidence: 0,
    apy: 0,
  },
  {
    ticker: "SPYxt",
    name: "SP500 xStock",
    symbol: "SPY",
    type: "ETF",
    color: "#e4002b",
    logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/37006.png",
    pythFeedId: PYTH_FEED_IDS.SPY,
    price: 0,
    prevPrice: 0,
    change: 0,
    changePercent: 0,
    confidence: 0,
    apy: 0,
  },
];

// Generate mock candlestick data for a given asset
export function generateCandles(
  basePrice: number,
  positive: boolean,
  count = 80
): import("@/components/candlestick-chart").Candle[] {
  const candles = [];
  let price = basePrice * 0.95;

  for (let i = 0; i < count; i++) {
    const volatility = price * 0.015;
    const drift =
      (positive ? 0.001 : -0.001) + (Math.random() - 0.48) * 0.003;
    const open = price;
    const change = price * drift + (Math.random() - 0.5) * volatility;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(1000000 * (0.5 + Math.random()));

    const hour = 9 + Math.floor((i * 5) / 60);
    const min = (i * 5) % 60;
    const time = `${hour}:${String(min).padStart(2, "0")}`;

    candles.push({
      time,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });

    price = close;
  }

  return candles;
}
