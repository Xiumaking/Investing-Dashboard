import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";

/*
 * ══════════════════════════════════════════════════════════════
 *  Stock Dashboard — Yahoo Finance style
 *  2-row ticker banner with mini sparklines
 *  Company CI logos, daily candle indicators
 * ══════════════════════════════════════════════════════════════
 */

/* ── 티커 배너: 1행 (8개까지), 나머지 2행 ── */
const TICKER_ROW1 = [
  { symbol: "^DJI",   label: "Dow 30" },
  { symbol: "^GSPC",  label: "S&P 500" },
  { symbol: "^IXIC",  label: "Nasdaq" },
  { symbol: "^RUT",   label: "Russell 2000" },
  { symbol: "^VIX",   label: "VIX" },
  { symbol: "GC=F",   label: "Gold" },
  { symbol: "SI=F",   label: "Silver" },
  { symbol: "CL=F",   label: "Crude Oil" },
];
const TICKER_ROW2 = [
  { symbol: "ES=F",      label: "S&P Futures" },
  { symbol: "NQ=F",      label: "Nasdaq Futures" },
  { symbol: "YM=F",      label: "Dow Futures" },
  { symbol: "^HSI",      label: "Hang Seng" },
  { symbol: "^KS11",     label: "KOSPI" },
  { symbol: "^KQ11",     label: "KOSDAQ" },
  { symbol: "399001.SZ", label: "Shenzhen" },
];
const ALL_TICKERS = [...TICKER_ROW1, ...TICKER_ROW2];

/* ── 글로벌 시총 Top 20 ── */
const TOP_STOCKS = [
  { symbol: "NVDA",  name: "NVIDIA" },
  { symbol: "AAPL",  name: "Apple" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "MSFT",  name: "Microsoft" },
  { symbol: "AMZN",  name: "Amazon" },
  { symbol: "META",  name: "Meta Platforms" },
  { symbol: "TSLA",  name: "Tesla" },
  { symbol: "TSM",   name: "TSMC" },
  { symbol: "BRK-B", name: "Berkshire Hathaway" },
  { symbol: "AVGO",  name: "Broadcom" },
  { symbol: "LLY",   name: "Eli Lilly" },
  { symbol: "WMT",   name: "Walmart" },
  { symbol: "JPM",   name: "JPMorgan Chase" },
  { symbol: "V",     name: "Visa" },
  { symbol: "MA",    name: "Mastercard" },
  { symbol: "UNH",   name: "UnitedHealth" },
  { symbol: "XOM",   name: "Exxon Mobil" },
  { symbol: "COST",  name: "Costco" },
  { symbol: "JNJ",   name: "Johnson & Johnson" },
  { symbol: "ASML",  name: "ASML" },
];

/* ── Formatters ── */
const fmt = {
  price(p) {
    if (p == null || p === 0) return "\u2014";
    if (Math.abs(p) >= 1000) return "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (Math.abs(p) >= 1) return "$" + p.toFixed(2);
    return "$" + p.toFixed(4);
  },
  idx(p) {
    if (p == null) return "\u2014";
    return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  mcap(m) {
    if (m == null) return "\u2014";
    if (m >= 1e12) return "$" + (m / 1e12).toFixed(2) + "T";
    if (m >= 1e9) return "$" + (m / 1e9).toFixed(2) + "B";
    if (m >= 1e6) return "$" + (m / 1e6).toFixed(1) + "M";
    return "$" + m.toLocaleString();
  },
  pct(v) {
    if (v == null) return "\u2014";
    return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
  },
  change(v) {
    if (v == null) return "";
    return (v >= 0 ? "+" : "") + v.toFixed(2);
  },
};

/* ── Mini Sparkline (30-day) for ticker cards ── */
function MiniSparkline({ data, width = 50, height = 20 }) {
  if (!data || data.length < 3) return <div style={{ width, height }} />;
  const clean = data.filter(v => v != null);
  if (clean.length < 3) return <div style={{ width, height }} />;
  const mn = Math.min(...clean), mx = Math.max(...clean), range = mx - mn || 1;
  const up = clean[clean.length - 1] >= clean[0];
  const color = up ? "#22c55e" : "#ef4444";
  const pts = clean.map((v, i) =>
    ((i / (clean.length - 1)) * width).toFixed(1) + "," +
    (height - ((v - mn) / range) * (height - 2) - 1).toFixed(1)
  ).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block", flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Daily Candle indicator ── */
function DailyCandle({ open, close, high, low }) {
  if (open == null || close == null || high == null || low == null) return null;
  const up = close >= open;
  const color = up ? "#16a34a" : "#dc2626";
  const W = 12, H = 24;
  const range = high - low || 1;
  const bodyTop = H - ((Math.max(open, close) - low) / range) * (H - 4) - 2;
  const bodyBot = H - ((Math.min(open, close) - low) / range) * (H - 4) - 2;
  const wickTop = H - ((high - low) / range) * (H - 4) - 2;
  const wickBot = H - 2;
  const bodyH = Math.max(bodyBot - bodyTop, 1);

  return (
    <svg width={W} height={H} style={{ display: "block", flexShrink: 0 }}>
      {/* Wick */}
      <line x1={W / 2} y1={wickTop} x2={W / 2} y2={wickBot} stroke={color} strokeWidth="1" />
      {/* Body */}
      <rect x={2} y={bodyTop} width={W - 4} height={bodyH} fill={up ? color : color} rx="1" />
    </svg>
  );
}

/* ── Ticker Card ── */
function TickerCard({ item, quote, sparkData }) {
  const price = quote?.regularMarketPrice ?? null;
  const change = quote?.regularMarketChange ?? null;
  const changePct = quote?.regularMarketChangePercent ?? null;
  const pos = (change ?? 0) >= 0;
  const color = pos ? "#22c55e" : "#ef4444";
  const arrow = pos ? "\u25B2" : "\u25BC";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 16px",
      minWidth: 170,
      borderRight: "1px solid #2d2d44",
      flexShrink: 0,
      cursor: "default",
      transition: "background .15s",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "#252542"}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Left: text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#8888aa", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#eee", marginBottom: 2 }}>
          {price != null ? fmt.idx(price) : "\u2014"}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color, display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 7 }}>{change != null ? arrow : ""}</span>
          <span>{fmt.change(change)}</span>
          <span>({fmt.pct(changePct)})</span>
        </div>
      </div>
      {/* Right: mini sparkline */}
      <MiniSparkline data={sparkData} />
    </div>
  );
}

/* ── Ticker Banner (2 rows) ── */
function TickerBanner({ tickerData, sparklines }) {
  const renderRow = (items) => (
    <div style={{
      display: "flex",
      overflowX: "auto",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    }}>
      <style>{`.ticker-scroll::-webkit-scrollbar { display: none; }`}</style>
      {items.map(item => (
        <TickerCard
          key={item.symbol}
          item={item}
          quote={tickerData[item.symbol]}
          sparkData={sparklines[item.symbol]}
        />
      ))}
    </div>
  );

  return (
    <div style={{
      background: "#1a1a2e",
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 24,
    }}>
      {renderRow(TICKER_ROW1)}
      <div style={{ borderTop: "1px solid #2d2d44" }} />
      {renderRow(TICKER_ROW2)}
    </div>
  );
}

/* ── PctCell ── */
function PctCell({ value }) {
  if (value == null) return <td style={{ ...tdR, color: "#999" }}>{"\u2014"}</td>;
  const pos = value >= 0;
  return (
    <td style={tdR}>
      <span style={{
        color: pos ? "#16a34a" : "#dc2626",
        background: pos ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
        padding: "4px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600,
        display: "inline-block", minWidth: 72, textAlign: "center",
      }}>
        {fmt.pct(value)}
      </span>
    </td>
  );
}

/* ── DailyCell: candle + percentage ── */
function DailyCell({ row }) {
  const value = row.changePct;
  if (value == null) return <td style={{ ...tdR, color: "#999" }}>{"\u2014"}</td>;
  const pos = value >= 0;
  return (
    <td style={tdR}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
        <DailyCandle open={row.open} close={row.price} high={row.high} low={row.low} />
        <span style={{
          color: pos ? "#16a34a" : "#dc2626",
          background: pos ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
          padding: "4px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600,
          display: "inline-block", minWidth: 72, textAlign: "center",
        }}>
          {fmt.pct(value)}
        </span>
      </div>
    </td>
  );
}

const tdR = { padding: "14px 10px", textAlign: "right", fontSize: 13, color: "#374151" };

/* ══════════════════════════════════════════════
   Main Dashboard
   ══════════════════════════════════════════════ */
export default function StockDashboard() {
  const [tickerData, setTickerData] = useState({});
  const [sparklines, setSparklines] = useState({});
  const [stockRows, setStockRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [auto, setAuto] = useState(true);
  const timer = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      setErr(null);

      const allSymbols = [
        ...ALL_TICKERS.map(i => i.symbol),
        ...TOP_STOCKS.map(s => s.symbol),
      ].join(",");

      // 1) Try v7 quote
      let quotes = [];
      try {
        const res = await fetch("/api/stocks?type=quote&symbols=" + encodeURIComponent(allSymbols));
        const json = await res.json();
        quotes = json?.quoteResponse?.result || [];
      } catch { /* fallback */ }

      // 2) Fallback to v8 chart
      if (quotes.length === 0) {
        try {
          const res = await fetch("/api/stocks?type=chart&symbols=" + encodeURIComponent(allSymbols) + "&range=1mo&interval=1d");
          const chartData = await res.json();

          const tMap = {};
          const sparkMap = {};
          ALL_TICKERS.forEach(item => {
            const c = chartData[item.symbol];
            if (!c) return;
            const closes = c.indicators?.quote?.[0]?.close?.filter(v => v != null) || [];
            sparkMap[item.symbol] = closes;
            const prev = closes.length >= 2 ? closes[closes.length - 2] : null;
            const last = closes.length >= 1 ? closes[closes.length - 1] : null;
            if (last) {
              tMap[item.symbol] = {
                regularMarketPrice: last,
                regularMarketChange: prev ? last - prev : null,
                regularMarketChangePercent: prev ? ((last - prev) / prev) * 100 : null,
              };
            }
          });
          setTickerData(tMap);
          setSparklines(sparkMap);

          const rows = TOP_STOCKS.map(meta => {
            const c = chartData[meta.symbol];
            if (!c) return { symbol: meta.symbol, name: meta.name, price: null, marketCap: null, changePct: null, change7d: null, change30d: null, open: null, high: null, low: null, image: null };
            const q = c.indicators?.quote?.[0] || {};
            const closes = (q.close || []).filter(v => v != null);
            const opens = (q.open || []).filter(v => v != null);
            const highs = (q.high || []).filter(v => v != null);
            const lows = (q.low || []).filter(v => v != null);
            const last = closes[closes.length - 1] || null;
            const prev = closes.length >= 2 ? closes[closes.length - 2] : null;
            const p7d = closes.length >= 6 ? closes[closes.length - 6] : null;
            const p30d = closes[0] || null;
            return {
              symbol: meta.symbol, name: meta.name, price: last, marketCap: null,
              changePct: prev ? ((last - prev) / prev) * 100 : null,
              change7d: p7d ? ((last - p7d) / p7d) * 100 : null,
              change30d: p30d ? ((last - p30d) / p30d) * 100 : null,
              open: opens[opens.length - 1] || null,
              high: highs[highs.length - 1] || null,
              low: lows[lows.length - 1] || null,
              image: null,
            };
          });
          setStockRows(rows);
          setUpdated(new Date());
          setLoading(false);
          return;
        } catch (e) {
          setErr("Failed to fetch data: " + e.message);
          setLoading(false);
          return;
        }
      }

      // 3) Process v7 quote results
      const tMap = {};
      const tickerSymbols = new Set(ALL_TICKERS.map(i => i.symbol));
      quotes.forEach(q => { if (tickerSymbols.has(q.symbol)) tMap[q.symbol] = q; });
      setTickerData(tMap);

      const stockSet = new Set(TOP_STOCKS.map(s => s.symbol));
      const rows = [];
      quotes.forEach(q => {
        if (!stockSet.has(q.symbol)) return;
        const meta = TOP_STOCKS.find(s => s.symbol === q.symbol);
        rows.push({
          symbol: q.symbol,
          name: meta?.name || q.shortName || q.symbol,
          price: q.regularMarketPrice,
          marketCap: q.marketCap,
          changePct: q.regularMarketChangePercent,
          change7d: null,
          change30d: null,
          open: q.regularMarketOpen,
          high: q.regularMarketDayHigh,
          low: q.regularMarketDayLow,
          image: null,
        });
      });
      rows.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      setStockRows(rows);
      setUpdated(new Date());
      setLoading(false);

      // Fetch sparklines + historical
      fetchChartData(rows);
    } catch (e) {
      setErr("Error: " + e.message);
      setLoading(false);
    }
  }, []);

  /* Fetch chart data for sparklines + 7D/30D */
  const fetchChartData = useCallback(async (rows) => {
    try {
      const allSym = [
        ...ALL_TICKERS.map(i => i.symbol),
        ...rows.map(r => r.symbol),
      ].join(",");

      const res = await fetch("/api/stocks?type=chart&symbols=" + encodeURIComponent(allSym) + "&range=1mo&interval=1d");
      const chartData = await res.json();

      // Sparklines for tickers
      const sparkMap = {};
      ALL_TICKERS.forEach(item => {
        const c = chartData[item.symbol];
        if (!c) return;
        sparkMap[item.symbol] = c.indicators?.quote?.[0]?.close?.filter(v => v != null) || [];
      });
      setSparklines(sparkMap);

      // 7D/30D for stocks
      setStockRows(prev => {
        const updated = [...prev];
        for (const r of updated) {
          const c = chartData[r.symbol];
          if (!c) continue;
          const closes = c.indicators?.quote?.[0]?.close?.filter(v => v != null) || [];
          if (closes.length < 2 || !r.price) continue;
          const p7d = closes.length >= 6 ? closes[closes.length - 6] : null;
          const p30d = closes[0] || null;
          if (p7d) r.change7d = ((r.price - p7d) / p7d) * 100;
          if (p30d) r.change30d = ((r.price - p30d) / p30d) * 100;
        }
        return updated;
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if (auto) timer.current = setInterval(fetchAll, 120000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [auto, fetchAll]);

  /* Company logo URL from Yahoo Finance */
  const logoUrl = (symbol) => {
    const clean = symbol.replace("-", ".").replace(".", "");
    return `https://logo.clearbit.com/${clean.toLowerCase()}.com`;
  };

  /* CI-style logo with fallback */
  function CompanyLogo({ symbol, name }) {
    const [failed, setFailed] = useState(false);
    // Map known symbols to proper domains for Clearbit
    const domainMap = {
      "NVDA": "nvidia.com", "AAPL": "apple.com", "GOOGL": "google.com",
      "MSFT": "microsoft.com", "AMZN": "amazon.com", "META": "meta.com",
      "TSLA": "tesla.com", "TSM": "tsmc.com", "BRK-B": "berkshirehathaway.com",
      "AVGO": "broadcom.com", "LLY": "lilly.com", "WMT": "walmart.com",
      "JPM": "jpmorganchase.com", "V": "visa.com", "MA": "mastercard.com",
      "UNH": "unitedhealthgroup.com", "XOM": "exxonmobil.com", "COST": "costco.com",
      "JNJ": "jnj.com", "ASML": "asml.com",
    };
    const domain = domainMap[symbol];
    const url = domain ? `https://logo.clearbit.com/${domain}` : null;

    if (!url || failed) {
      return (
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: "#f0f1f5",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: "#666", flexShrink: 0,
        }}>
          {symbol.slice(0, 3)}
        </div>
      );
    }

    return (
      <img
        src={url}
        alt={name}
        width={32}
        height={32}
        style={{ borderRadius: 8, flexShrink: 0, background: "#fff", objectFit: "contain" }}
        onError={() => setFailed(true)}
      />
    );
  }

  const thBase = {
    padding: "12px 10px", textAlign: "right", fontSize: 11, color: "#8b8fa3",
    fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
    borderBottom: "2px solid #ebedf2", whiteSpace: "nowrap",
    position: "sticky", top: 0, background: "#fff", zIndex: 1,
  };
  const thLeft = { ...thBase, textAlign: "left" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f8", color: "#111", fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "20px 16px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#1a1a2e", letterSpacing: -0.5 }}>
              Stock Dashboard
            </h1>
            <div style={{ fontSize: 12, color: "#8b8fa3", marginTop: 4 }}>
              Global Top 20 by Market Cap &middot; Real-time via Yahoo Finance
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: "#8b8fa3" }}>
            {updated && <span>{updated.toLocaleTimeString("en-US")}</span>}
            <button onClick={fetchAll} style={{
              background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 6,
              padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              Refresh
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12 }}>
              <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} style={{ accentColor: "#1a1a2e" }} />
              Auto 2min
            </label>
          </div>
        </div>

        {/* Ticker Banner */}
        <TickerBanner tickerData={tickerData} sparklines={sparklines} />

        {/* Error */}
        {err && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {err}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#8b8fa3" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{"\uD83D\uDCE1"}</div>
              <p style={{ fontSize: 14 }}>Loading market data...</p>
            </div>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #ebedf2", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={{ ...thLeft, width: 40, textAlign: "center" }}>#</th>
                    <th style={{ ...thLeft, minWidth: 220 }}>Company</th>
                    <th style={thBase}>Market Cap</th>
                    <th style={thBase}>Price</th>
                    <th style={thBase}>Daily</th>
                    <th style={thBase}>7D</th>
                    <th style={thBase}>30D</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.map((r, idx) => (
                    <tr key={r.symbol}
                      style={{ borderBottom: "1px solid #f3f4f6", transition: "background .12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                    >
                      <td style={{ padding: "14px 10px", textAlign: "center", fontSize: 12, color: "#b0b4c0", fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: "14px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <CompanyLogo symbol={r.symbol} name={r.name} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: "#8b8fa3", fontWeight: 500 }}>{r.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdR, color: "#555", fontSize: 13 }}>{fmt.mcap(r.marketCap)}</td>
                      <td style={{ ...tdR, fontWeight: 700, color: "#1a1a2e", fontSize: 14 }}>{fmt.price(r.price)}</td>
                      <DailyCell row={r} />
                      <PctCell value={r.change7d} />
                      <PctCell value={r.change30d} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: "#b0b4c0" }}>
          Yahoo Finance &middot; Auto-refresh 2min &middot; No API key required
        </div>
      </div>
    </div>
  );
}
