import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";

/*
 * ══════════════════════════════════════════════════════════════
 *  FMP (Financial Modeling Prep) API — 무료 250 calls/day
 *  가입: https://site.financialmodelingprep.com/developer/docs
 *  아래 API_KEY를 본인 키로 교체하세요
 * ══════════════════════════════════════════════════════════════
 */
const API_KEY = "YOUR_FMP_API_KEY";
const FMP = "https://financialmodelingprep.com/api/v3";

/* ── 상단 배너 지수 목록 ── */
const INDICES = [
  // 🇺🇸 US
  { symbol: "^DJI",    name: "Dow Jones",  flag: "🇺🇸", group: "US" },
  { symbol: "^GSPC",   name: "S&P 500",    flag: "🇺🇸", group: "US" },
  { symbol: "^IXIC",   name: "Nasdaq",     flag: "🇺🇸", group: "US" },
  // 🇺🇸 US Futures
  { symbol: "YM=F",    name: "Dow Futures",    flag: "🇺🇸", group: "US Futures" },
  { symbol: "ES=F",    name: "S&P Futures",    flag: "🇺🇸", group: "US Futures" },
  { symbol: "NQ=F",    name: "Nasdaq Futures",  flag: "🇺🇸", group: "US Futures" },
  // 🇨🇳 China
  { symbol: "399001.SZ", name: "Shenzhen",   flag: "🇨🇳", group: "China" },
  { symbol: "^HSI",      name: "Hang Seng",  flag: "🇭🇰", group: "China" },
  // 🇰🇷 Korea
  { symbol: "^KS11",   name: "KOSPI",      flag: "🇰🇷", group: "Korea" },
  { symbol: "^KQ11",   name: "KOSDAQ",     flag: "🇰🇷", group: "Korea" },
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
  { symbol: "ASML",  name: "ASML Holdings" },
];

/* ── Format helpers ── */
function fmtPrice(p) {
  if (p == null) return "\u2014";
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

/* ── Index Card Component ── */
function IndexCard({ data, meta }) {
  const price = data?.price ?? data?.changesPercentage != null ? data?.price : null;
  const change = data?.change;
  const changePct = data?.changesPercentage;
  const pos = (change ?? 0) >= 0;
  const color = pos ? "#16a34a" : "#dc2626";
  const bgColor = pos ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)";

  return (
    <div style={{
      background: bgColor, border: "1px solid " + (pos ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)"),
      borderRadius: 10, padding: "10px 14px", minWidth: 145, flex: "1 1 145px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14 }}>{meta.flag}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>{meta.name}</span>
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
function IndexBanner({ indexData }) {
  const groups = {};
  INDICES.forEach(idx => {
    if (!groups[idx.group]) groups[idx.group] = [];
    groups[idx.group].push(idx);
  });

  return (
    <div style={{ marginBottom: 24 }}>
      {Object.entries(groups).map(([groupName, items]) => (
        <div key={groupName} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            {groupName}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {items.map(meta => (
              <IndexCard key={meta.symbol} meta={meta} data={indexData[meta.symbol]} />
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
  const [indexData, setIndexData] = useState({});
  const [stockRows, setStockRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [auto, setAuto] = useState(true);
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem("fmp_api_key") || ""; } catch { return ""; }
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const timer = useRef(null);

  const key = apiKey || API_KEY;
  const hasKey = key && key !== "YOUR_FMP_API_KEY";

  /* ── Fetch index quotes ── */
  const fetchIndices = useCallback(async () => {
    if (!hasKey) return;
    try {
      // FMP uses different symbols for some indices
      const symbolMap = {
        "^DJI": "^DJI", "^GSPC": "^GSPC", "^IXIC": "^IXIC",
        "YM=F": "YM=F", "ES=F": "ES=F", "NQ=F": "NQ=F",
        "399001.SZ": "399001.SZ", "^HSI": "^HSI",
        "^KS11": "^KS11", "^KQ11": "^KQ11",
      };
      const symbols = INDICES.map(i => i.symbol).join(",");
      const res = await fetch(FMP + "/quote/" + symbols + "?apikey=" + key);
      if (res.ok) {
        const json = await res.json();
        const map = {};
        json.forEach(item => { map[item.symbol] = item; });
        setIndexData(map);
      }
    } catch (e) { /* silent */ }
  }, [hasKey, key]);

  /* ── Fetch stock quotes ── */
  const fetchStocks = useCallback(async () => {
    if (!hasKey) { setLoading(false); return; }
    try {
      setErr(null);
      const symbols = TOP_STOCKS.map(s => s.symbol).join(",");
      const res = await fetch(FMP + "/quote/" + symbols + "?apikey=" + key);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setErr("Invalid API key. Please check your FMP API key.");
        } else {
          setErr("API Error: " + res.status);
        }
        setLoading(false);
        return;
      }
      const json = await res.json();

      /* FMP /quote gives: price, marketCap, changesPercentage (24h) 
         For 7D and 30D, we need historical data */
      const rows = json.map(item => {
        const meta = TOP_STOCKS.find(s => s.symbol === item.symbol);
        return {
          symbol: item.symbol,
          name: item.name || meta?.name || item.symbol,
          price: item.price,
          marketCap: item.marketCap,
          change24h: item.changesPercentage,
          change7d: null,
          change30d: null,
        };
      });

      // Sort by market cap descending
      rows.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      setStockRows(rows);
      setUpdated(new Date());
      setLoading(false);

      // Fetch 7D and 30D changes in background
      fetchHistoricalChanges(rows);
    } catch (e) { setErr(e.message); setLoading(false); }
  }, [hasKey, key]);

  /* ── Fetch historical changes for 7D & 30D ── */
  const fetchHistoricalChanges = useCallback(async (rows) => {
    if (!hasKey) return;
    try {
      const today = new Date();
      const d7 = new Date(today); d7.setDate(d7.getDate() - 7);
      const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
      const fmt = d => d.toISOString().slice(0, 10);

      // Use batch historical endpoint for each stock
      const symbols = rows.map(r => r.symbol);

      // Fetch 30-day historical for all stocks (includes 7d data)
      const histPromises = symbols.map(async (sym) => {
        try {
          const res = await fetch(
            FMP + "/historical-price-full/" + sym + "?from=" + fmt(d30) + "&to=" + fmt(today) + "&apikey=" + key
          );
          if (!res.ok) return { symbol: sym, data: [] };
          const json = await res.json();
          return { symbol: sym, data: json.historical || [] };
        } catch { return { symbol: sym, data: [] }; }
      });

      const results = await Promise.all(histPromises);

      setStockRows(prev => {
        const updated = [...prev];
        for (const { symbol, data } of results) {
          if (data.length === 0) continue;
          const row = updated.find(r => r.symbol === symbol);
          if (!row) continue;

          const currentPrice = row.price;
          // data is sorted newest first
          const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

          // Find price ~7 days ago
          const d7target = new Date(today); d7target.setDate(d7target.getDate() - 7);
          const price7d = findClosestPrice(sorted, d7target);
          if (price7d && currentPrice) row.change7d = ((currentPrice - price7d) / price7d) * 100;

          // Find price ~30 days ago
          const d30target = new Date(today); d30target.setDate(d30target.getDate() - 30);
          const price30d = findClosestPrice(sorted, d30target);
          if (price30d && currentPrice) row.change30d = ((currentPrice - price30d) / price30d) * 100;
        }
        return updated;
      });
    } catch (e) { /* silent */ }
  }, [hasKey, key]);

  function findClosestPrice(sorted, targetDate) {
    const target = targetDate.getTime();
    let closest = null;
    let minDiff = Infinity;
    for (const item of sorted) {
      const diff = Math.abs(new Date(item.date).getTime() - target);
      if (diff < minDiff) { minDiff = diff; closest = item.close; }
    }
    return closest;
  }

  const fetchAll = useCallback(() => {
    fetchIndices();
    fetchStocks();
  }, [fetchIndices, fetchStocks]);

  useEffect(() => { if (hasKey) fetchAll(); }, [hasKey, fetchAll]);
  useEffect(() => {
    if (auto && hasKey) timer.current = setInterval(fetchAll, 120000); // 2분 (API 절약)
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [auto, hasKey, fetchAll]);

  const handleSaveKey = (newKey) => {
    setApiKey(newKey);
    try { localStorage.setItem("fmp_api_key", newKey); } catch {}
    setShowKeyInput(false);
  };

  const thBase = {
    padding: "10px 8px", textAlign: "right", fontSize: 11, color: "#6b7280",
    fontWeight: 600, borderBottom: "2px solid #e5e7eb", whiteSpace: "nowrap",
    position: "sticky", top: 0, background: "#fff", zIndex: 1,
  };
  const thLeft = { ...thBase, textAlign: "left" };

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#111", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 16px" }}>

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 28 }}>📊</span> Stock Dashboard
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, fontSize: 13, color: "#6b7280" }}>
            {updated && <span>Last updated: {updated.toLocaleTimeString("en-US")}</span>}
            {hasKey && <button onClick={fetchAll} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>Refresh</button>}
            {hasKey && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Auto-refresh 2min
              </label>
            )}
            <button onClick={() => setShowKeyInput(!showKeyInput)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 12 }}>
              ⚙️ API Key
            </button>
          </div>
        </div>

        {/* API Key Input */}
        {(!hasKey || showKeyInput) && (
          <div style={{
            background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12,
            padding: 20, marginBottom: 20,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: "#1e40af" }}>
              🔑 FMP API Key Required
            </div>
            <p style={{ fontSize: 13, color: "#3b82f6", marginBottom: 12, lineHeight: 1.5 }}>
              Stock data is powered by <a href="https://site.financialmodelingprep.com/developer/docs" target="_blank" rel="noopener" style={{ color: "#1d4ed8", fontWeight: 600 }}>Financial Modeling Prep</a> (free: 250 calls/day).
              Sign up and paste your API key below.
            </p>
            <ApiKeyForm currentKey={apiKey} onSave={handleSaveKey} />
          </div>
        )}

        {hasKey && (
          <>
            {/* Index Banner */}
            <IndexBanner indexData={indexData} />

            {/* Error */}
            {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{err}</div>}

            {/* Stock Table */}
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#9ca3af" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
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
                      <th style={thBase}>24h</th>
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
                        <PctCell value={r.change24h} />
                        <PctCell value={r.change7d} />
                        <PctCell value={r.change30d} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
              Data: Financial Modeling Prep API &middot; Auto-refresh 2min &middot; Global Top 20 by Market Cap
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── API Key Form Component ── */
function ApiKeyForm({ currentKey, onSave }) {
  const [value, setValue] = useState(currentKey || "");
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Paste your FMP API key here..."
        style={{
          flex: 1, padding: "10px 14px", border: "1px solid #d1d5db",
          borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "monospace",
        }}
      />
      <button
        onClick={() => onSave(value.trim())}
        style={{
          padding: "10px 20px", background: "#2563eb", color: "#fff",
          border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Save
      </button>
    </div>
  );
}
