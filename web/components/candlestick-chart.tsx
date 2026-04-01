"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  LineStyle,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type Time,
} from "lightweight-charts";

// ---- Types ----

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  data: Candle[];
  stopLoss: number | null;
  onStopLossChange: (price: number | null) => void;
  className?: string;
}

function toChartData(data: Candle[]) {
  return data.map((c) => ({
    time: Number(c.time) as Time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

function toVolumeData(data: Candle[]) {
  return data.map((c) => ({
    time: Number(c.time) as Time,
    value: c.volume,
    color:
      c.close >= c.open
        ? "rgba(200, 255, 0, 0.12)"
        : "rgba(255, 68, 68, 0.12)",
  }));
}

export default function CandlestickChart({
  data,
  stopLoss,
  onStopLossChange,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  // Create chart once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a0a" },
        textColor: "#888888",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(200, 255, 0, 0.2)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1a1a1a",
        },
        horzLine: {
          color: "rgba(200, 255, 0, 0.2)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1a1a1a",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        scaleMargins: { top: 0.05, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#c8ff00",
      downColor: "#ff4444",
      borderUpColor: "#c8ff00",
      borderDownColor: "#ff4444",
      wickUpColor: "#c8ff00",
      wickDownColor: "#ff4444",
    });

    // Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Resize handler
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      priceLineRef.current = null;
    };
  }, []);

  // Update data -- use setData only on full reload, update() for live ticks
  const prevLenRef = useRef(0);
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || data.length === 0) return;

    const isFullReload = Math.abs(data.length - prevLenRef.current) > 1 || prevLenRef.current === 0;
    prevLenRef.current = data.length;

    if (isFullReload) {
      candleSeriesRef.current.setData(toChartData(data));
      volumeSeriesRef.current.setData(toVolumeData(data));
      chartRef.current?.timeScale().fitContent();
    } else {
      // Just update the last candle
      const last = data[data.length - 1];
      const chartBar = { time: Number(last.time) as Time, open: last.open, high: last.high, low: last.low, close: last.close };
      const volBar = { time: Number(last.time) as Time, value: last.volume, color: last.close >= last.open ? "rgba(200,255,0,0.12)" : "rgba(255,68,68,0.12)" };
      candleSeriesRef.current.update(chartBar);
      volumeSeriesRef.current.update(volBar);
    }
  }, [data]);

  // Update stop-loss price line
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    // Remove old line
    if (priceLineRef.current) {
      series.removePriceLine(priceLineRef.current);
      priceLineRef.current = null;
    }

    // Add new line if stop loss is set
    if (stopLoss !== null) {
      const line = series.createPriceLine({
        price: stopLoss,
        color: "#ff4444",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "Stop Loss",
      });
      priceLineRef.current = line;
    }
  }, [stopLoss]);

  // Drag initiation via native mousedown on the container
  // We use a native listener so we can check proximity before calling preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMouseDown = (e: MouseEvent) => {
      if (stopLoss === null || !candleSeriesRef.current) return;

      const series = candleSeriesRef.current;
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const slCoord = series.priceToCoordinate(stopLoss);
      if (slCoord === null) return;

      if (Math.abs(y - slCoord) < 10) {
        draggingRef.current = true;
        setIsDragging(true);
      }
    };

    container.addEventListener("mousedown", onMouseDown);
    return () => container.removeEventListener("mousedown", onMouseDown);
  }, [stopLoss]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingRef.current || !candleSeriesRef.current) return;

      const series = candleSeriesRef.current;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const y = e.clientY - rect.top;
      const price = series.coordinateToPrice(y);
      if (price !== null) {
        const rounded = Math.round(Number(price) * 100) / 100;
        onStopLossChange(rounded);
      }
    },
    [onStopLossChange]
  );

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false;
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      style={{ cursor: isDragging ? "ns-resize" : undefined }}
    >
      {/* Invisible overlay for stop-loss dragging only -- doesn't block chart interaction */}
      {stopLoss !== null && (
        <div
          className="absolute inset-0 z-10"
          style={{ pointerEvents: isDragging ? "auto" : "none" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      )}
    </div>
  );
}
