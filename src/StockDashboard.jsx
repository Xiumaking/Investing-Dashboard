import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";

/*
 * Stock Dashboard — Yahoo Finance style
 * 2-row ticker banner, mini sparklines, company logos, daily candles
 */

/* ── 티커 배너 1행: ~Crude Oil까지 ── */
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
/* ── 티커 배너 2행 ── */
const TICKER_ROW2 = [
  { symbol: "YM=F",      label: "Dow Futures" },
  { symbol: "ES=F",      label: "S&P Futures" },
  { symbol: "NQ=F",      label: "Nasdaq Futures" },
  { symbol: "^KS11",     label: "KOSPI" },
  { symbol: "^KQ11",     label: "KOSDAQ" },
  { symbol: "KRW=X",     label: "KRW/USD" },
  { symbol: "399001.SZ", label: "Shenzhen" },
  { symbol: "^HSI",      label: "Hang Seng" },
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

/* Logo domain mapping for Ticker Logos CDN */
const LOGO_DOMAINS = {
  "NVDA": "nvidia.com", "AAPL": "apple.com", "GOOGL": "abc.xyz",
  "MSFT": "microsoft.com", "AMZN": "amazon.com", "META": "meta.com",
  "TSLA": "tesla.com", "TSM": "tsmc.com", "BRK-B": "berkshirehathaway.com",
  "AVGO": "broadcom.com", "LLY": "lilly.com", "WMT": "walmart.com",
  "JPM": "jpmorganchase.com", "V": "visa.com", "MA": "mastercard.com",
  "UNH": "unitedhealthgroup.com", "XOM": "exxonmobil.com", "COST": "costco.com",
  "JNJ": "jnj.com", "ASML": "asml.com",
};

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

/* ── Mini Sparkline ── */
function MiniSparkline({ data, width = 44, height = 18 }) {
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

/* ── Daily Candle ── */
function DailyCandle({ open, close, high, low }) {
  if (open == null || close == null || high == null || low == null) return null;
  const up = close >= open;
  const color = up ? "#16a34a" : "#dc2626";
  const W = 14, H = 26;
  const range = high - low || 1;
  const bodyTop = H - ((Math.max(open, close) - low) / range) * (H - 4) - 2;
  const bodyBot = H - ((Math.min(open, close) - low) / range) * (H - 4) - 2;
  const wickTop = H - ((high - low) / range) * (H - 4) - 2;
  const wickBot = H - 2;
  const bodyH = Math.max(bodyBot - bodyTop, 1.5);
  return (
    <svg width={W} height={H} style={{ display: "block", flexShrink: 0 }}>
      <line x1={W / 2} y1={wickTop} x2={W / 2} y2={wickBot} stroke={color} strokeWidth="1" />
      <rect x={3} y={bodyTop} width={W - 6} height={bodyH} fill={color} rx="1" />
    </svg>
  );
}

/* ── Company Logo ── */
function CompanyLogo({ symbol, name }) {
  const [src, setSrc] = useState(0); // 0=tickerlogos, 1=eodhd, 2=fallback
  const domain = LOGO_DOMAINS[symbol];
  const urls = [
    domain ? `https://cdn.tickerlogos.com/${domain}` : null,
    `https://eodhd.com/img/logos/US/${symbol}.png`,
  ].filter(Boolean);

  if (src >= urls.length) {
    return (
      <div style={{
        width: 30, height: 30, borderRadius: 7, background: "#f0f1f5",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, color: "#888", flexShrink: 0,
      }}>
        {symbol.slice(0, 3)}
      </div>
    );
  }

  return (
    <img
      src={urls[src]}
      alt={name}
      width={30} height={30}
      style={{ borderRadius: 7, flexShrink: 0, background: "#fff", objectFit: "contain" }}
      onError={() => setSrc(prev => prev + 1)}
    />
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
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 12px",
      flex: "1 1 0%",
      minWidth: 0,
      borderRight: "1px solid #2d2d44",
      cursor: "default",
      transition: "background .15s",
      overflow: "hidden",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "#252542"}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#8888aa", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#eee", marginBottom: 1 }}>
          {price != null ? fmt.idx(price) : "\u2014"}
        </div>
        <div style={{ fontSize: 9, fontWeight: 600, color, display: "flex", alignItems: "center", gap: 2, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 6 }}>{change != null ? arrow : ""}</span>
          <span>{fmt.change(change)}</span>
          <span>({fmt.pct(changePct)})</span>
        </div>
      </div>
      <MiniSparkline data={sparkData} />
    </div>
  );
}

/* ── Ticker Banner ── */
function TickerBanner({ tickerData, sparklines }) {
  const renderRow = (items) => (
    <div style={{ display: "flex", width: "100%" }}>
      {items.map((item, i) => (
        <React.Fragment key={item.symbol}>
          <TickerCard
            item={item}
            quote={tickerData[item.symbol]}
            sparkData={sparklines[item.symbol]}
          />
          {i === items.length - 1 && <div style={{ borderRight: "none" }} />}
        </React.Fragment>
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
      <div style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <style>{`.tb-scroll::-webkit-scrollbar{display:none}`}</style>
        <div className="tb-scroll" style={{ minWidth: 900 }}>
          {renderRow(TICKER_ROW1)}
          <div style={{ borderTop: "1px solid #2d2d44" }} />
          {renderRow(TICKER_ROW2)}
        </div>
      </div>
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

/* ── DailyCell ── */
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
      const allSymbols = [...ALL_TICKERS.map(i => i.symbol), ...TOP_STOCKS.map(s => s.symbol)].join(",");

      let quotes = [];
      try {
        const res = await fetch("/api/stocks?type=quote&symbols=" + encodeURIComponent(allSymbols));
        const json = await res.json();
        quotes = json?.quoteResponse?.result || [];
      } catch { /* fallback */ }

      if (quotes.length === 0) {
        try {
          const res = await fetch("/api/stocks?type=chart&symbols=" + encodeURIComponent(allSymbols) + "&range=1mo&interval=1d");
          const chartData = await res.json();
          const tMap = {};
          const sparkMap = {};
          ALL_TICKERS.forEach(item => {
            const c = chartData[item.symbol]; if (!c) return;
            const closes = c.indicators?.quote?.[0]?.close?.filter(v => v != null) || [];
            sparkMap[item.symbol] = closes;
            const prev = closes.length >= 2 ? closes[closes.length - 2] : null;
            const last = closes.length >= 1 ? closes[closes.length - 1] : null;
            if (last) tMap[item.symbol] = { regularMarketPrice: last, regularMarketChange: prev ? last - prev : null, regularMarketChangePercent: prev ? ((last - prev) / prev) * 100 : null };
          });
          setTickerData(tMap); setSparklines(sparkMap);
          const rows = TOP_STOCKS.map(meta => {
            const c = chartData[meta.symbol];
            if (!c) return { symbol: meta.symbol, name: meta.name, price: null, marketCap: null, changePct: null, change7d: null, change30d: null, open: null, high: null, low: null };
            const q = c.indicators?.quote?.[0] || {};
            const closes = (q.close || []).filter(v => v != null);
            const opens = (q.open || []).filter(v => v != null);
            const highs = (q.high || []).filter(v => v != null);
            const lows = (q.low || []).filter(v => v != null);
            const last = closes[closes.length - 1] || null;
            const prev = closes.length >= 2 ? closes[closes.length - 2] : null;
            const p7d = closes.length >= 6 ? closes[closes.length - 6] : null;
            const p30d = closes[0] || null;
            return { symbol: meta.symbol, name: meta.name, price: last, marketCap: null,
              changePct: prev ? ((last - prev) / prev) * 100 : null,
              change7d: p7d ? ((last - p7d) / p7d) * 100 : null,
              change30d: p30d ? ((last - p30d) / p30d) * 100 : null,
              open: opens[opens.length - 1] || null, high: highs[highs.length - 1] || null, low: lows[lows.length - 1] || null };
          });
          setStockRows(rows); setUpdated(new Date()); setLoading(false); return;
        } catch (e) { setErr("Failed to fetch data: " + e.message); setLoading(false); return; }
      }

      // Process v7 quotes
      const tMap = {};
      const tickerSymbols = new Set(ALL_TICKERS.map(i => i.symbol));
      quotes.forEach(q => { if (tickerSymbols.has(q.symbol)) tMap[q.symbol] = q; });
      setTickerData(tMap);

      const stockSet = new Set(TOP_STOCKS.map(s => s.symbol));
      const rows = [];
      quotes.forEach(q => {
        if (!stockSet.has(q.symbol)) return;
        const meta = TOP_STOCKS.find(s => s.symbol === q.symbol);
        rows.push({ symbol: q.symbol, name: meta?.name || q.shortName || q.symbol,
          price: q.regularMarketPrice, marketCap: q.marketCap, changePct: q.regularMarketChangePercent,
          change7d: null, change30d: null,
          open: q.regularMarketOpen, high: q.regularMarketDayHigh, low: q.regularMarketDayLow });
      });
      rows.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      setStockRows(rows); setUpdated(new Date()); setLoading(false);
      fetchChartData(rows);
    } catch (e) { setErr("Error: " + e.message); setLoading(false); }
  }, []);

  const fetchChartData = useCallback(async (rows) => {
    try {
      const allSym = [...ALL_TICKERS.map(i => i.symbol), ...rows.map(r => r.symbol)].join(",");
      const res = await fetch("/api/stocks?type=chart&symbols=" + encodeURIComponent(allSym) + "&range=1mo&interval=1d");
      const chartData = await res.json();
      const sparkMap = {};
      ALL_TICKERS.forEach(item => {
        const c = chartData[item.symbol]; if (!c) return;
        sparkMap[item.symbol] = c.indicators?.quote?.[0]?.close?.filter(v => v != null) || [];
      });
      setSparklines(sparkMap);
      setStockRows(prev => {
        const updated = [...prev];
        for (const r of updated) {
          const c = chartData[r.symbol]; if (!c) continue;
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

  const thBase = { padding: "12px 10px", textAlign: "right", fontSize: 11, color: "#8b8fa3", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid #ebedf2", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#fff", zIndex: 1 };
  const thLeft = { ...thBase, textAlign: "left" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f8", color: "#111", fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "20px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#1a1a2e", letterSpacing: -0.5 }}>Stock Dashboard</h1>
            <div style={{ fontSize: 12, color: "#8b8fa3", marginTop: 4 }}>Global Top 20 by Market Cap &middot; Real-time via Yahoo Finance</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: "#8b8fa3" }}>
            {updated && <span>{updated.toLocaleTimeString("en-US")}</span>}
            <button onClick={fetchAll} style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Refresh</button>
            <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12 }}>
              <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} style={{ accentColor: "#1a1a2e" }} /> Auto 2min
            </label>
          </div>
        </div>

        <TickerBanner tickerData={tickerData} sparklines={sparklines} />

        {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{err}</div>}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#8b8fa3" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 36, marginBottom: 8 }}>{"\uD83D\uDCE1"}</div><p style={{ fontSize: 14 }}>Loading market data...</p></div>
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
                    <tr key={r.symbol} style={{ borderBottom: "1px solid #f3f4f6", transition: "background .12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"}
                      onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
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
          <a href="https://www.allinvestview.com/tools/ticker-logos/" target="_blank" rel="noopener" style={{ color: "#b0b4c0", textDecoration: "none" }}>Logos by AllInvestView</a>
          {" "}&middot; Yahoo Finance &middot; Auto-refresh 2min
        </div>
      </div>
    </div>
  );
}
