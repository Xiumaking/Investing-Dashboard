import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";

/*
 * ══════════════════════════════════════════════════════════════
 *  Stock Dashboard — Yahoo Finance style ticker banner
 *  Vercel Serverless Proxy → Yahoo Finance
 *  No API key needed
 * ══════════════════════════════════════════════════════════════
 */

/* ── 상단 티커 배너 (Yahoo Finance 스타일) ── */
const TICKER_ITEMS = [
  { symbol: "^DJI",      label: "Dow 30" },
  { symbol: "^GSPC",     label: "S&P 500" },
  { symbol: "^IXIC",     label: "Nasdaq" },
  { symbol: "^RUT",      label: "Russell 2000" },
  { symbol: "^VIX",      label: "VIX" },
  { symbol: "GC=F",      label: "Gold" },
  { symbol: "SI=F",      label: "Silver" },
  { symbol: "CL=F",      label: "Crude Oil" },
  { symbol: "ES=F",      label: "S&P Futures" },
  { symbol: "NQ=F",      label: "Nasdaq Futures" },
  { symbol: "^HSI",      label: "Hang Seng" },
  { symbol: "^KS11",     label: "KOSPI" },
  { symbol: "^KQ11",     label: "KOSDAQ" },
  { symbol: "399001.SZ", label: "Shenzhen" },
];

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

/* ══════════════════════════════════════════════
   Yahoo Finance-style Horizontal Ticker Banner
   ══════════════════════════════════════════════ */
function TickerBanner({ tickerData }) {
  const scrollRef = useRef(null);

  return (
    <div style={{
      background: "#1a1a2e",
      borderBottom: "1px solid #2d2d44",
      marginBottom: 24,
      borderRadius: 10,
      overflow: "hidden",
    }}>
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          padding: "0 4px",
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {TICKER_ITEMS.map((item) => {
          const q = tickerData[item.symbol];
          const price = q?.regularMarketPrice ?? null;
          const change = q?.regularMarketChange ?? null;
          const changePct = q?.regularMarketChangePercent ?? null;
          const pos = (change ?? 0) >= 0;
          const color = pos ? "#22c55e" : "#ef4444";
          const arrow = pos ? "\u25B2" : "\u25BC";

          return (
            <div key={item.symbol} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "12px 18px",
              minWidth: 140,
              borderRight: "1px solid #2d2d44",
              flexShrink: 0,
              cursor: "default",
              transition: "background .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#252542"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "#a0a0c0", marginBottom: 4, whiteSpace: "nowrap" }}>
                {item.label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#eee", marginBottom: 2 }}>
                {price != null ? fmt.idx(price) : "\u2014"}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 8 }}>{change != null ? arrow : ""}</span>
                <span>{fmt.change(change)}</span>
                <span>({fmt.pct(changePct)})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── PctCell ── */
function PctCell({ value }) {
  if (value == null) return <td style={{ ...tdR, color: "#666" }}>{"\u2014"}</td>;
  const pos = value >= 0;
  return (
    <td style={tdR}>
      <span style={{
        color: pos ? "#16a34a" : "#dc2626",
        background: pos ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
        padding: "4px 10px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 600,
        display: "inline-block",
        minWidth: 70,
        textAlign: "center",
      }}>
        {fmt.pct(value)}
      </span>
    </td>
  );
}

const tdR = { padding: "14px 10px", textAlign: "right", fontSize: 13, color: "#374151" };

/* ══════════════════════════════════════════════
   Main Dashboard
   ══════════════════════════════════════════════ */
export default function StockDashboard() {
  const [tickerData, setTickerData] = useState({});
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
        ...TICKER_ITEMS.map(i => i.symbol),
        ...TOP_STOCKS.map(s => s.symbol),
      ].join(",");

      // Try v7 quote first
      let quotes = [];
      try {
        const res = await fetch("/api/stocks?type=quote&symbols=" + encodeURIComponent(allSymbols));
        const json = await res.json();
        quotes = json?.quoteResponse?.result || [];
      } catch { /* fallback below */ }

      // Fallback to v8 chart
      if (quotes.length === 0) {
        try {
          const res = await fetch("/api/stocks?type=chart&symbols=" + encodeURIComponent(allSymbols) + "&range=1mo&interval=1d");
          const chartData = await res.json();

          // Ticker data from chart
          const tMap = {};
          TICKER_ITEMS.forEach(item => {
            const c = chartData[item.symbol];
            if (!c) return;
            const closes = c.indicators?.quote?.[0]?.close?.filter(v => v != null) || [];
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

          // Stock rows from chart
          const rows = TOP_STOCKS.map(meta => {
            const c = chartData[meta.symbol];
            if (!c) return { symbol: meta.symbol, name: meta.name, price: null, marketCap: null, changePct: null, change7d: null, change30d: null };
            const closes = c.indicators?.quote?.[0]?.close?.filter(v => v != null) || [];
            const last = closes[closes.length - 1] || null;
            const prev = closes.length >= 2 ? closes[closes.length - 2] : null;
            const p7d = closes.length >= 6 ? closes[closes.length - 6] : null;
            const p30d = closes[0] || null;
            return {
              symbol: meta.symbol, name: meta.name, price: last, marketCap: null,
              changePct: prev ? ((last - prev) / prev) * 100 : null,
              change7d: p7d ? ((last - p7d) / p7d) * 100 : null,
              change30d: p30d ? ((last - p30d) / p30d) * 100 : null,
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

      // Process v7 quote
      const tMap = {};
      const tickerSymbols = new Set(TICKER_ITEMS.map(i => i.symbol));
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
        });
      });
      rows.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      setStockRows(rows);
      setUpdated(new Date());
      setLoading(false);

      fetchHistorical(rows);
    } catch (e) {
      setErr("Error: " + e.message);
      setLoading(false);
    }
  }, []);

  const fetchHistorical = useCallback(async (rows) => {
    try {
      const symbols = rows.map(r => r.symbol).join(",");
      const res = await fetch("/api/stocks?type=chart&symbols=" + encodeURIComponent(symbols) + "&range=1mo&interval=1d");
      const chartData = await res.json();

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
              Global Top 20 by Market Cap &middot; Real-time data via Yahoo Finance
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
              <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)}
                style={{ accentColor: "#1a1a2e" }} />
              Auto 2min
            </label>
          </div>
        </div>

        {/* Ticker Banner */}
        <TickerBanner tickerData={tickerData} />

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
              <div style={{ fontSize: 36, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }}>{"\uD83D\uDCE1"}</div>
              <p style={{ fontSize: 14 }}>Loading market data...</p>
            </div>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #ebedf2", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 750 }}>
                <thead>
                  <tr>
                    <th style={{ ...thLeft, width: 40, textAlign: "center" }}>#</th>
                    <th style={{ ...thLeft, minWidth: 200 }}>Company</th>
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
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: `hsl(${(idx * 37) % 360}, 55%, 92%)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 700, color: `hsl(${(idx * 37) % 360}, 55%, 40%)`,
                            flexShrink: 0,
                          }}>
                            {r.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e" }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: "#8b8fa3", fontWeight: 500 }}>{r.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdR, color: "#555", fontSize: 13 }}>{fmt.mcap(r.marketCap)}</td>
                      <td style={{ ...tdR, fontWeight: 700, color: "#1a1a2e", fontSize: 14 }}>{fmt.price(r.price)}</td>
                      <PctCell value={r.changePct} />
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
