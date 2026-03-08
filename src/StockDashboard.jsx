import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";

/*
 * ══════════════════════════════════════════════════════════════
 *  Stock Dashboard — Yahoo Finance via Vercel Serverless Proxy
 *  API Key 불필요, CORS 문제 없음, 무료
 *  /api/stocks?type=quote&symbols=... → batch quote
 *  /api/stocks?type=history&symbol=...&range=1mo → OHLCV
 * ══════════════════════════════════════════════════════════════
 */

/* ── 상단 배너 지수 목록 (Yahoo Finance 심볼) ── */
const INDICES = [
  // US Spot
  { symbol: "^DJI",   name: "Dow Jones",      flag: "\u{1F1FA}\u{1F1F8}", group: "US Spot" },
  { symbol: "^GSPC",  name: "S&P 500",        flag: "\u{1F1FA}\u{1F1F8}", group: "US Spot" },
  { symbol: "^IXIC",  name: "Nasdaq",         flag: "\u{1F1FA}\u{1F1F8}", group: "US Spot" },
  // US Futures
  { symbol: "YM=F",   name: "Dow Futures",    flag: "\u{1F1FA}\u{1F1F8}", group: "US Futures" },
  { symbol: "ES=F",   name: "S&P Futures",    flag: "\u{1F1FA}\u{1F1F8}", group: "US Futures" },
  { symbol: "NQ=F",   name: "Nasdaq Futures", flag: "\u{1F1FA}\u{1F1F8}", group: "US Futures" },
  // China
  { symbol: "399001.SZ", name: "Shenzhen Comp", flag: "\u{1F1E8}\u{1F1F3}", group: "China" },
  { symbol: "^HSI",      name: "Hang Seng",     flag: "\u{1F1ED}\u{1F1F0}", group: "China" },
  // Korea
  { symbol: "^KS11",  name: "KOSPI",          flag: "\u{1F1F0}\u{1F1F7}", group: "Korea" },
  { symbol: "^KQ11",  name: "KOSDAQ",         flag: "\u{1F1F0}\u{1F1F7}", group: "Korea" },
];

/* ── 글로벌 시총 Top 20 종목 (2026-02 기준) ── */
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

/* ── Format helpers ── */
function fmtPrice(p) {
  if (p == null || p === 0) return "\u2014";
  if (Math.abs(p) >= 1000) return "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(p) >= 1) return "$" + p.toFixed(2);
  return "$" + p.toFixed(4);
}
function fmtIdx(p) {
  if (p == null) return "\u2014";
  return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMcap(m) {
  if (m == null) return "\u2014";
  if (m >= 1e12) return "$" + (m / 1e12).toFixed(2) + "T";
  if (m >= 1e9) return "$" + (m / 1e9).toFixed(2) + "B";
  if (m >= 1e6) return "$" + (m / 1e6).toFixed(1) + "M";
  return "$" + m.toLocaleString();
}
function fmtPct(v) {
  if (v == null) return "\u2014";
  const s = v >= 0 ? "+" : "";
  return s + v.toFixed(2) + "%";
}

/* ── Index Card ── */
function IndexCard({ data }) {
  const price = data?.regularMarketPrice ?? null;
  const change = data?.regularMarketChange ?? null;
  const changePct = data?.regularMarketChangePercent ?? null;
  const pos = (change ?? 0) >= 0;
  const color = pos ? "#16a34a" : "#dc2626";
  const bgColor = pos ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)";

  return (
    <div style={{
      background: bgColor, border: "1px solid " + (pos ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)"),
      borderRadius: 10, padding: "10px 14px", minWidth: 150, flex: "1 1 150px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>{data?.flag}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{data?.label || data?.shortName || data?.symbol}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>
        {price != null ? fmtIdx(price) : "\u2014"}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color, marginTop: 2 }}>
        {change != null ? (pos ? "+" : "") + change.toFixed(2) : ""}{" "}
        {changePct != null ? "(" + fmtPct(changePct) + ")" : ""}
      </div>
    </div>
  );
}

/* ── Index Banner ── */
function IndexBanner({ indexQuotes }) {
  const groups = {};
  INDICES.forEach(idx => {
    const data = indexQuotes[idx.symbol];
    if (!groups[idx.group]) groups[idx.group] = [];
    groups[idx.group].push({ ...idx, ...(data || {}), label: idx.name, flag: idx.flag });
  });

  return (
    <div style={{ marginBottom: 24 }}>
      {Object.entries(groups).map(([groupName, items]) => (
        <div key={groupName} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            {groupName}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {items.map(item => (
              <IndexCard key={item.symbol} data={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Percent Cell ── */
function PctCell({ value }) {
  if (value == null) return <td style={{ ...tdR, color: "#aaa" }}>{"\u2014"}</td>;
  const pos = value >= 0;
  return (
    <td style={tdR}>
      <span style={{
        color: pos ? "#16a34a" : "#dc2626",
        background: pos ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
        padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600,
      }}>
        {fmtPct(value)}
      </span>
    </td>
  );
}

const tdR = { padding: "12px 8px", textAlign: "right", fontSize: 13, color: "#374151" };

/* ── Main Stock Dashboard ── */
export default function StockDashboard() {
  const [indexQuotes, setIndexQuotes] = useState({});
  const [stockRows, setStockRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [auto, setAuto] = useState(true);
  const timer = useRef(null);

  /* ── Fetch everything in 1 batch call ── */
  const fetchAll = useCallback(async () => {
    try {
      setErr(null);

      // Combine all symbols into ONE request
      const allSymbols = [
        ...INDICES.map(i => i.symbol),
        ...TOP_STOCKS.map(s => s.symbol),
      ].join(",");

      const res = await fetch("/api/stocks?type=quote&symbols=" + encodeURIComponent(allSymbols));
      const json = await res.json();

      const quotes = json?.quoteResponse?.result || [];
      if (quotes.length === 0) {
        setErr("No data returned. The API may be temporarily unavailable.");
        setLoading(false);
        return;
      }

      // Build index map
      const idxMap = {};
      const indexSymbols = new Set(INDICES.map(i => i.symbol));
      quotes.forEach(q => {
        if (indexSymbols.has(q.symbol)) idxMap[q.symbol] = q;
      });
      setIndexQuotes(idxMap);

      // Build stock rows
      const stockSymbols = new Set(TOP_STOCKS.map(s => s.symbol));
      const rows = [];
      quotes.forEach(q => {
        if (!stockSymbols.has(q.symbol)) return;
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

      // Sort by market cap (descending)
      rows.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      setStockRows(rows);
      setUpdated(new Date());
      setLoading(false);

      // Fetch 7D/30D changes in background
      fetchHistorical(rows);
    } catch (e) {
      setErr("Failed to fetch: " + e.message);
      setLoading(false);
    }
  }, []);

  /* ── Fetch 1mo history for each stock to calc 7D/30D ── */
  const fetchHistorical = useCallback(async (rows) => {
    try {
      // Fetch all in parallel — each goes through our serverless proxy
      const promises = rows.map(async (r) => {
        try {
          const res = await fetch("/api/stocks?type=history&symbol=" + encodeURIComponent(r.symbol) + "&range=1mo");
          const json = await res.json();
          const result = json?.chart?.result?.[0];
          if (!result) return { symbol: r.symbol };

          const closes = result.indicators?.quote?.[0]?.close || [];
          const timestamps = result.timestamp || [];
          return { symbol: r.symbol, closes, timestamps };
        } catch {
          return { symbol: r.symbol };
        }
      });

      const results = await Promise.all(promises);

      setStockRows(prev => {
        const updated = [...prev];
        const now = Date.now() / 1000;

        for (const { symbol, closes, timestamps } of results) {
          if (!closes || !timestamps || closes.length < 2) continue;
          const row = updated.find(r => r.symbol === symbol);
          if (!row || !row.price) continue;

          const currentPrice = row.price;

          // Find price ~7 days ago
          const t7d = now - 7 * 86400;
          let price7d = null;
          for (let i = timestamps.length - 1; i >= 0; i--) {
            if (timestamps[i] <= t7d) { price7d = closes[i]; break; }
          }
          if (!price7d && closes.length >= 6) price7d = closes[closes.length - 6];
          if (price7d) row.change7d = ((currentPrice - price7d) / price7d) * 100;

          // Find price ~30 days ago (first in array)
          const price30d = closes[0];
          if (price30d) row.change30d = ((currentPrice - price30d) / price30d) * 100;
        }
        return updated;
      });
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if (auto) timer.current = setInterval(fetchAll, 120000); // 2min
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [auto, fetchAll]);

  const thBase = {
    padding: "10px 8px", textAlign: "right", fontSize: 11, color: "#6b7280",
    fontWeight: 600, borderBottom: "2px solid #e5e7eb", whiteSpace: "nowrap",
    position: "sticky", top: 0, background: "#fff", zIndex: 1,
  };
  const thLeft = { ...thBase, textAlign: "left" };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#111", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 16px" }}>

        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 28 }}>{"\uD83D\uDCCA"}</span> Stock Dashboard
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, fontSize: 13, color: "#6b7280" }}>
            {updated && <span>Last updated: {updated.toLocaleTimeString("en-US")}</span>}
            <button onClick={fetchAll} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>Refresh</button>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Auto-refresh 2min
            </label>
          </div>
        </div>

        <IndexBanner indexQuotes={indexQuotes} />

        {err && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
            {err}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#9ca3af" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{"\uD83D\uDCE1"}</div>
              <p>Loading stock data...</p>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e5e7eb" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700, background: "#fff" }}>
              <thead>
                <tr>
                  <th style={{ ...thLeft, width: 36, textAlign: "center" }}>#</th>
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
                  <tr key={r.symbol} style={{ borderBottom: "1px solid #f3f4f6", transition: "background .15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                    <td style={{ padding: "12px 8px", textAlign: "center", fontSize: 12, color: "#9ca3af" }}>{idx + 1}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.symbol}</div>
                      </div>
                    </td>
                    <td style={tdR}>{fmtMcap(r.marketCap)}</td>
                    <td style={{ ...tdR, fontWeight: 700, color: "#111", fontSize: 14 }}>{fmtPrice(r.price)}</td>
                    <PctCell value={r.changePct} />
                    <PctCell value={r.change7d} />
                    <PctCell value={r.change30d} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
          Data: Yahoo Finance &middot; Auto-refresh 2min &middot; Global Top 20 by Market Cap &middot; No API key required
        </div>
      </div>
    </div>
  );
}
