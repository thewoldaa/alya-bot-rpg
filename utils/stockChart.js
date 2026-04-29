const sharp = require("sharp");
const { stockCatalog, stockHistoryLimit } = require("../config");
const { money } = require("./format");

const CACHE_MS = 5 * 60 * 1000;
const WIDTH = 1280;
const HEIGHT = 820;

const LINE_COLORS = [
  { symbol: "IRON", color: "#38bdf8" },
  { symbol: "GOLD", color: "#fbbf24" },
  { symbol: "DIAMOND", color: "#a78bfa" },
  { symbol: "OLD COIN", color: "#fb7185" },
  { symbol: "NARS COIN", color: "#34d399" },
  { symbol: "GOD COIN", color: "#f97316" }
];

const chartCache = {
  bucket: null,
  buffer: null,
  summary: null
};

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatPercent(value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${Number(value || 0).toFixed(2)}%`;
}

function normalizeHistory(stock) {
  const limit = Math.max(2, Number(stockHistoryLimit || 20));
  const basePrice = Math.max(1, Number(stock?.price || 1));
  const history = Array.isArray(stock?.history)
    ? stock.history.map((entry) => Math.max(1, Number(entry || basePrice))).filter((entry) => Number.isFinite(entry) && entry > 0)
    : [];

  if (!history.length) {
    return Array.from({ length: limit }, () => basePrice);
  }

  const trimmed = history.slice(-limit);
  while (trimmed.length < limit) {
    trimmed.unshift(trimmed[0]);
  }

  return trimmed;
}

function buildMarketHistory(stocks) {
  const limit = Math.max(2, Number(stockHistoryLimit || 20));
  const source = stocks.length ? stocks : stockCatalog.map((item) => ({
    symbol: item.symbol,
    price: item.price,
    history: [item.price]
  }));

  const histories = source.map((stock) => normalizeHistory(stock));
  const combined = [];

  for (let i = 0; i < limit; i += 1) {
    const total = histories.reduce((sum, history) => sum + Number(history[i] || history[history.length - 1] || 1), 0);
    combined.push(total / histories.length);
  }

  return combined;
}

function buildSeries(stocks, symbol) {
  const stock = stocks.find((item) => String(item.symbol).toUpperCase() === String(symbol).toUpperCase());
  if (!stock) return null;
  return {
    symbol: stock.symbol,
    name: stock.name,
    color: LINE_COLORS.find((item) => item.symbol === stock.symbol)?.color || "#ffffff",
    history: normalizeHistory(stock),
    current: Number(stock.price || 0),
    previous: Number(stock.previousPrice || stock.price || 0),
    change: Number(stock.lastChange || 0)
  };
}

function seriesPath(points) {
  if (!Array.isArray(points) || points.length < 2) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

function mapHistoryToPoints(history, area) {
  const { x, y, width, height, min, max } = area;
  const span = Math.max(1, max - min);
  const step = history.length > 1 ? width / (history.length - 1) : width;

  return history.map((value, index) => {
    const ratio = (Number(value) - min) / span;
    return {
      x: x + (step * index),
      y: y + height - (ratio * height)
    };
  });
}

function buildCandleGroups(history, count = 10) {
  const safeHistory = Array.isArray(history) && history.length ? history : [1, 1];
  const groupSize = Math.max(1, Math.floor(safeHistory.length / count));
  const candles = [];

  for (let i = 0; i < safeHistory.length; i += groupSize) {
    const slice = safeHistory.slice(i, i + groupSize);
    if (!slice.length) continue;
    candles.push({
      open: slice[0],
      close: slice[slice.length - 1],
      high: Math.max(...slice),
      low: Math.min(...slice)
    });
  }

  return candles.slice(-count);
}

function buildSvg({ series, marketHistory, summary }) {
  const chartLeft = 78;
  const chartTop = 176;
  const chartWidth = 1124;
  const chartHeight = 250;
  const stripTop = 454;
  const stripHeight = 96;

  const allValues = [
    ...series.flatMap((item) => item.history),
    ...marketHistory
  ];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const paddedMin = minValue * 0.94;
  const paddedMax = maxValue * 1.06;

  const linePoints = series.map((item) => {
    const points = mapHistoryToPoints(item.history, {
      x: chartLeft,
      y: chartTop,
      width: chartWidth,
      height: chartHeight,
      min: paddedMin,
      max: paddedMax
    });
    return { ...item, points };
  });

  const marketCandleMax = Math.max(...marketHistory);
  const marketCandleMin = Math.min(...marketHistory);
  const candleGroups = buildCandleGroups(marketHistory, 10);
  const candleWidth = chartWidth / Math.max(1, candleGroups.length);

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const y = chartTop + (chartHeight / 4) * index;
    const value = paddedMax - ((paddedMax - paddedMin) / 4) * index;
    return { y, value };
  });

  const legend = series.map((item, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 80 + (column * 364);
    const y = 100 + (row * 38);
    const value = `${item.symbol} ${money(item.current)} ${formatPercent(item.change)}`;
    return `
      <g transform="translate(${x}, ${y})">
        <rect x="0" y="0" rx="12" ry="12" width="330" height="32" fill="${item.color}" opacity="0.12" stroke="${item.color}" stroke-opacity="0.35"/>
        <circle cx="18" cy="16" r="6" fill="${item.color}" />
        <text x="34" y="21" font-size="13" fill="#e5e7eb" font-family="Inter, Segoe UI, sans-serif">${escapeXml(value)}</text>
      </g>`;
  }).join("");

  const candleSvg = candleGroups.map((candle, index) => {
    const centerX = chartLeft + (index * candleWidth) + (candleWidth / 2);
    const highY = stripTop + stripHeight - (((candle.high - marketCandleMin) / Math.max(1, marketCandleMax - marketCandleMin)) * stripHeight);
    const lowY = stripTop + stripHeight - (((candle.low - marketCandleMin) / Math.max(1, marketCandleMax - marketCandleMin)) * stripHeight);
    const openY = stripTop + stripHeight - (((candle.open - marketCandleMin) / Math.max(1, marketCandleMax - marketCandleMin)) * stripHeight);
    const closeY = stripTop + stripHeight - (((candle.close - marketCandleMin) / Math.max(1, marketCandleMax - marketCandleMin)) * stripHeight);
    const up = candle.close >= candle.open;
    const bodyY = Math.min(openY, closeY);
    const bodyH = Math.max(4, Math.abs(closeY - openY));
    const bodyColor = up ? "#22c55e" : "#ef4444";

    return `
      <line x1="${centerX.toFixed(2)}" y1="${highY.toFixed(2)}" x2="${centerX.toFixed(2)}" y2="${lowY.toFixed(2)}" stroke="${bodyColor}" stroke-width="2" opacity="0.7"/>
      <rect x="${(centerX - 10).toFixed(2)}" y="${bodyY.toFixed(2)}" width="20" height="${bodyH.toFixed(2)}" rx="4" fill="${bodyColor}" opacity="0.9"/>`;
  }).join("");

  const lineSvg = linePoints.map((item) => {
    const path = seriesPath(item.points);
    return `
      <path d="${path}" fill="none" stroke="${item.color}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <path d="${path}" fill="none" stroke="${item.color}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.08"/>
      <circle cx="${item.points[item.points.length - 1].x.toFixed(2)}" cy="${item.points[item.points.length - 1].y.toFixed(2)}" r="5" fill="${item.color}" />
    `;
  }).join("");

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b1020"/>
        <stop offset="55%" stop-color="#111827"/>
        <stop offset="100%" stop-color="#030712"/>
      </linearGradient>
      <linearGradient id="grid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#334155" stop-opacity="0.42"/>
        <stop offset="100%" stop-color="#334155" stop-opacity="0.1"/>
      </linearGradient>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" rx="28" fill="url(#bg)"/>
    <circle cx="1120" cy="90" r="260" fill="#2563eb" opacity="0.08"/>
    <circle cx="140" cy="680" r="220" fill="#8b5cf6" opacity="0.08"/>

    <text x="78" y="58" font-size="34" font-weight="700" fill="#f8fafc" font-family="Inter, Segoe UI, sans-serif">Mahiru Market Index</text>

    <g filter="url(#shadow)">
      <rect x="64" y="110" width="1152" height="470" rx="26" fill="#0f172a" fill-opacity="0.82" stroke="#1f2937" stroke-width="1.4"/>
    </g>

    ${gridLines.map((line) => `
      <line x1="${chartLeft}" y1="${line.y.toFixed(2)}" x2="${chartLeft + chartWidth}" y2="${line.y.toFixed(2)}" stroke="url(#grid)" stroke-width="1"/>
      <text x="28" y="${(line.y + 5).toFixed(2)}" font-size="12" fill="#64748b" font-family="Inter, Segoe UI, sans-serif">${money(line.value)}</text>
    `).join("")}

    ${legend}
    ${lineSvg}

    <g>
      <text x="78" y="584" font-size="16" fill="#cbd5e1" font-family="Inter, Segoe UI, sans-serif">Candlestick Index Gabungan</text>
      <rect x="64" y="${stripTop - 18}" width="1152" height="128" rx="22" fill="#0b1220" fill-opacity="0.88" stroke="#1f2937" stroke-width="1.2"/>
      ${candleSvg}
    </g>

    <g>
      <rect x="884" y="34" width="332" height="54" rx="16" fill="#111827" stroke="#334155" stroke-width="1.2" opacity="0.92"/>
      <text x="906" y="58" font-size="14" fill="#cbd5e1" font-family="Inter, Segoe UI, sans-serif">Index gabungan sekarang</text>
      <text x="906" y="78" font-size="20" font-weight="700" fill="#f8fafc" font-family="Inter, Segoe UI, sans-serif">${escapeXml(money(summary.indexNow))}</text>
      <text x="1096" y="78" font-size="16" fill="${summary.indexChange >= 0 ? "#22c55e" : "#ef4444"}" font-family="Inter, Segoe UI, sans-serif">${escapeXml(formatPercent(summary.indexChange))}</text>
    </g>
  </svg>`;
}

function buildSummary(stocks) {
  const lastPrices = stocks.map((stock) => Number(stock.price || 1));
  const prevPrices = stocks.map((stock) => Number(stock.previousPrice || stock.price || 1));
  const indexNow = lastPrices.reduce((sum, price) => sum + price, 0) / Math.max(1, lastPrices.length);
  const indexPrev = prevPrices.reduce((sum, price) => sum + price, 0) / Math.max(1, prevPrices.length);
  const indexChange = ((indexNow - indexPrev) / Math.max(1, indexPrev)) * 100;

  return {
    indexNow,
    indexPrev,
    indexChange
  };
}

async function buildMarketChart(db) {
  const bucket = Math.floor(Date.now() / CACHE_MS);
  if (chartCache.bucket === bucket && chartCache.buffer) {
    return chartCache;
  }

  const stocks = db.getStocks();
  const selected = LINE_COLORS
    .map((item) => buildSeries(stocks, item.symbol))
    .filter(Boolean);

  const marketHistory = buildMarketHistory(stocks);
  const summary = buildSummary(stocks);
  const svg = buildSvg({ series: selected, marketHistory, summary });
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();

  chartCache.bucket = bucket;
  chartCache.buffer = buffer;
  chartCache.summary = summary;

  return chartCache;
}

module.exports = {
  buildMarketChart
};
