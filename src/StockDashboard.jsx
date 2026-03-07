import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";

/*
 * ══════════════════════════════════════════════════════════════
 *  Twelve Data API — 무료 8 credits/min, 800/day
 *  가입: https://twelvedata.com/ (Google 로그인 가능)
 *  Dashboard에서 API Key 복사
 * ══════════════════════════════════════════════════════════════
 */
const TD = "https://api.twelvedata.com";

/* ── 상단 배너 지수 목록 ── */
const INDICES = [
  { symbol: "DJI",    name: "Dow Jones",      flag: "\u{1F1FA}\u{1F1F8}", group: "US" },
  { symbol: "SPX",    name: "S&P 500",        flag: "\u{1F1FA}\u{1F1F8}", group: "US" },
  { symbol: "IXIC",   name: "Nasdaq",         flag: "\u{1F1FA}\u{1F1F8}", group: "US" },
  { symbol: "HSI",    name: "Hang Seng",      flag: "\u{1F1ED}\u{1F1F0}", group: "Asia" },
  { symbol: "KOSPI",  name: "KOSPI",          flag: "\u{1F1F0}\u{1F1F7}", group: "Korea" },
];

/* ── 글로벌 시총 Top 20 종목 (2026-02 기준) ── */
const TOP_STOCKS = [
  "NVDA", "AAPL", "GOOGL", "MSFT", "AMZN",
  "META", "TSLA", "TSM", "BRK.B", "AVGO",
  "LLY", "WMT", "JPM", "V", "MA",
  "UNH", "XOM", "COST", "JNJ", "ASML",
];

/* ── Format helpers ── */
function fmtPrice(p) {
  if (p == null) return "\u2014";
  const n = parseFloat(p);
  if (isNaN(n)) return "\u2014";
  if (Math.abs(n) >= 1000) return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1) return "$" + n.toFixed(2);
  return "$" + n.toFixed(4);
}
function fmtIdx(p) {
  if (p == null) return "\u2014";
  const n = parseFloat(p);
  if (isNaN(n)) return "\u2014";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
function IndexCard({ data, meta }) {
  const price = data?.close ? parseFloat(data.close) : null;
  const pctChange = data?.percent_change ? parseFloat(data.percent_change) : null;
  const change = data?.change ? parseFloat(data.change) : null;
  const pos = (change ?? 0) >= 0;
  const color = pos ? "#16a34a" : "#dc2626";
  const bgColor = pos ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)";

  return (
    <div style={{
      background: bgColor, border: "1px solid " + (pos ? "rgba(22,163,74,0.15)" : "rgba(220,38,38,0.15)"),
      borderRadius: 10, padding: "10px 14px", minWidth: 155, flex: "1 1 155px",
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
        {pctChange != null ? "(" + fmtPct(pctChange) + ")" : ""}
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
    try { return localStorage.getItem("td_api_key") || ""; } catch { return ""; }
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const timer = useRef(null);

  const hasKey = apiKey && apiKey.length > 5;

  /* ── Fetch index quotes (1 API call) ── */
  const fetchIndices = useCallback(async () => {
    if (!hasKey) return;
    try {
      const symbols = INDICES.map(i => i.symbol).join(",");
      const res = await fetch(TD + "/quote?symbol=" + symbols + "&apikey=" + apiKey);
      const json = await res.json();

      if (json.code === 429) return; // rate limit
      if (json.status === "error") return;

      const map = {};
      // Single symbol returns object, multiple returns object keyed by symbol
      if (json.close) {
        // single result
        map[INDICES[0].symbol] = json;
      } else {
        Object.entries(json).forEach(([sym, data]) => {
          if (data && !data.code) map[sym] = data;
        });
      }
      setIndexData(map);
    } catch (e) { /* silent */ }
  }, [hasKey, apiKey]);

  /* ── Fetch stock quotes (1 API call for batch) ── */
  const fetchStocks = useCallback(async () => {
    if (!hasKey) { setLoading(false); return; }
    try {
      setErr(null);
      const symbols = TOP_STOCKS.join(",");
      const res = await fetch(TD + "/quote?symbol=" + symbols + "&apikey=" + apiKey);
      const text = await res.text();

      let json;
      try { json = JSON.parse(text); } catch {
        setErr("API returned invalid response. Check your API key.");
        setLoading(false);
        return;
      }

      if (json.code === 401) {
        setErr("Invalid API key. Please check your Twelve Data API key.");
        setLoading(false);
        return;
      }
      if (json.code === 429) {
        setErr("API rate limit reached (8/min free). Please wait a moment.");
        setLoading(false);
        return;
      }
      if (json.status === "error") {
        setErr("API Error: " + (json.message || "Unknown error"));
        setLoading(false);
        return;
      }

      const rows = [];
      Object.entries(json).forEach(([sym, data]) => {
        if (!data || data.code) return; // skip errors
        rows.push({
          symbol: data.symbol || sym,
          name: data.name || sym,
          price: data.close ? parseFloat(data.close) : null,
          change: data.change ? parseFloat(data.change) : null,
          changePct: data.percent_change ? parseFloat(data.percent_change) : null,
          volume: data.volume ? parseInt(data.volume) : null,
          high52w: data.fifty_two_week?.high ? parseFloat(data.fifty_two_week.high) : null,
          low52w: data.fifty_two_week?.low ? parseFloat(data.fifty_two_week.low) : null,
          change7d: null,
          change30d: null,
        });
      });

      setStockRows(rows);
      setUpdated(new Date());
      setLoading(false);

      // Fetch 7D/30D changes in background (uses more API credits)
      fetchHistoricalChanges(rows);
    } catch (e) { setErr(e.message); setLoading(false); }
  }, [hasKey, apiKey]);

  /* ── Fetch 30D historical for 7D & 30D change calc ── */
  const fetchHistoricalChanges = useCallback(async (rows) => {
    if (!hasKey || rows.length === 0) return;

    // To save API credits, batch 5 symbols per call
    const batchSize = 5;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const symbols = batch.map(r => r.symbol).join(",");

      try {
        // Wait 8 seconds between batches to respect 8 credits/min
        if (i > 0) await new Promise(r => setTimeout(r, 8000));

        const res = await fetch(
          TD + "/time_series?symbol=" + symbols +
          "&interval=1day&outputsize=30&apikey=" + apiKey
        );
        const json = await res.json();
        if (json.code === 429 || json.status === "error") continue;

        setStockRows(prev => {
          const updated = [...prev];

          const processSymbol = (sym, data) => {
            if (!data?.values || !Array.isArray(data.values)) return;
            const row = updated.find(r => r.symbol === sym);
            if (!row || !row.price) return;

            const values = data.values; // newest first
            const currentPrice = row.price;

            // 7D change (approx 5 trading days)
            if (values.length >= 5) {
              const p7d = parseFloat(values[4]?.close);
              if (p7d) row.change7d = ((currentPrice - p7d) / p7d) * 100;
            }

            // 30D change (last item)
            if (values.length >= 20) {
              const p30d = parseFloat(values[values.length - 1]?.close);
              if (p30d) row.change30d = ((currentPrice - p30d) / p30d) * 100;
            }
          };

          if (batch.length === 1) {
            // Single symbol: json has meta + values directly
            processSymbol(batch[0].symbol, json);
          } else {
            // Multiple symbols: json is keyed by symbol
            Object.entries(json).forEach(([sym, data]) => {
              processSymbol(sym, data);
            });
          }

          return updated;
        });
      } catch (e) { /* silent */ }
    }
  }, [hasKey, apiKey]);

  const fetchAll = useCallback(() => {
    fetchIndices();
    fetchStocks();
  }, [fetchIndices, fetchStocks]);

  useEffect(() => { if (hasKey) fetchAll(); }, [hasKey, fetchAll]);
  useEffect(() => {
    if (auto && hasKey) timer.current = setInterval(fetchAll, 300000); // 5분 (API 절약)
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [auto, hasKey, fetchAll]);

  const handleSaveKey = (newKey) => {
    setApiKey(newKey);
    try { localStorage.setItem("td_api_key", newKey); } catch {}
    setShowKeyInput(false);
    setLoading(true);
    setErr(null);
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

        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 28 }}>{"\uD83D\uDCCA"}</span> Stock Dashboard
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, fontSize: 13, color: "#6b7280" }}>
            {updated && <span>Last updated: {updated.toLocaleTimeString("en-US")}</span>}
            {hasKey && <button onClick={fetchAll} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>Refresh</button>}
            {hasKey && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Auto-refresh 5min
              </label>
            )}
            <button onClick={() => setShowKeyInput(!showKeyInput)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 12 }}>
              {"\u2699\uFE0F"} API Key
            </button>
          </div>
        </div>

        {(!hasKey || showKeyInput) && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: "#1e40af" }}>
              {"\uD83D\uDD11"} Twelve Data API Key Required
            </div>
            <p style={{ fontSize: 13, color: "#3b82f6", marginBottom: 12, lineHeight: 1.5 }}>
              Stock data is powered by{" "}
              <a href="https://twelvedata.com/" target="_blank" rel="noopener" style={{ color: "#1d4ed8", fontWeight: 600 }}>
                Twelve Data
              </a>{" "}
              (free: 8 credits/min, 800/day). Sign up and paste your API key below.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                defaultValue={apiKey}
                placeholder="Paste your Twelve Data API key here..."
                onKeyDown={e => { if (e.key === "Enter") handleSaveKey(e.target.value.trim()); }}
                id="td-key-input"
                style={{
                  flex: 1, padding: "10px 14px", border: "1px solid #d1d5db",
                  borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "monospace",
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById("td-key-input");
                  if (input) handleSaveKey(input.value.trim());
                }}
                style={{
                  padding: "10px 20px", background: "#2563eb", color: "#fff",
                  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {hasKey && (
          <>
            <IndexBanner indexData={indexData} />

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
                      <th style={thBase}>Price</th>
                      <th style={thBase}>Change</th>
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
              Data: Twelve Data API &middot; Auto-refresh 5min &middot; Global Top 20 by Market Cap
            </div>
          </>
        )}
      </div>
    </div>
  );
}
