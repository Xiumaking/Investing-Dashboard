import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";

/*
 * ══════════════════════════════════════════════════════════════
 *  Finnhub API — 무료 60 calls/min, CORS 지원
 *  가입: https://finnhub.io/ → Get Free API Key
 *  /quote: 개별 종목 실시간 가격
 *  /stock/candle: 히스토리컬 데이터 (7D/30D 변동률 계산)
 * ══════════════════════════════════════════════════════════════
 */
const FH = "https://finnhub.io/api/v1";

/* ── 상단 배너 지수 ETF (Finnhub은 지수 직접 지원 안 함 → ETF로 대체) ── */
const INDEX_ETFS = [
  { symbol: "DIA",  name: "Dow Jones",    flag: "\u{1F1FA}\u{1F1F8}", group: "US" },
  { symbol: "SPY",  name: "S&P 500",      flag: "\u{1F1FA}\u{1F1F8}", group: "US" },
  { symbol: "QQQ",  name: "Nasdaq 100",   flag: "\u{1F1FA}\u{1F1F8}", group: "US" },
  { symbol: "EWY",  name: "KOSPI (ETF)",  flag: "\u{1F1F0}\u{1F1F7}", group: "Korea" },
  { symbol: "FXI",  name: "China (ETF)",  flag: "\u{1F1E8}\u{1F1F3}", group: "Asia" },
  { symbol: "EWH",  name: "HK (ETF)",     flag: "\u{1F1ED}\u{1F1F0}", group: "Asia" },
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
  { symbol: "BRK.B", name: "Berkshire Hathaway" },
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
  if (p == null || p === 0) return "\u2014";
  if (Math.abs(p) >= 1000) return "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(p) >= 1) return "$" + p.toFixed(2);
  return "$" + p.toFixed(4);
}
function fmtPct(v) {
  if (v == null) return "\u2014";
  const s = v >= 0 ? "+" : "";
  return s + v.toFixed(2) + "%";
}

/* ── Index Card ── */
function IndexCard({ data, meta }) {
  const price = data?.c || null;
  const change = data?.d || null;
  const changePct = data?.dp || null;
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
        {price ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "\u2014"}
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
  INDEX_ETFS.forEach(idx => {
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

/* ── Helper: sequential fetch with delay ── */
async function fetchSequential(urls, delayMs = 100) {
  const results = [];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      const json = await res.json();
      results.push(json);
    } catch {
      results.push(null);
    }
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  }
  return results;
}

/* ── Main Stock Dashboard ── */
export default function StockDashboard() {
  const [indexData, setIndexData] = useState({});
  const [stockRows, setStockRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [auto, setAuto] = useState(true);
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem("fh_api_key") || ""; } catch { return ""; }
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const timer = useRef(null);
  const fetchingRef = useRef(false);

  const hasKey = apiKey && apiKey.length > 5;

  /* ── Fetch all index ETF quotes (6 calls) ── */
  const fetchIndices = useCallback(async () => {
    if (!hasKey) return;
    const urls = INDEX_ETFS.map(i => FH + "/quote?symbol=" + i.symbol + "&token=" + apiKey);
    const results = await fetchSequential(urls, 50);
    const map = {};
    INDEX_ETFS.forEach((meta, i) => {
      if (results[i] && results[i].c) map[meta.symbol] = results[i];
    });
    setIndexData(map);
  }, [hasKey, apiKey]);

  /* ── Fetch all stock quotes (20 calls) ── */
  const fetchStocks = useCallback(async () => {
    if (!hasKey) { setLoading(false); return; }
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setErr(null);
      const urls = TOP_STOCKS.map(s => FH + "/quote?symbol=" + s.symbol + "&token=" + apiKey);
      const results = await fetchSequential(urls, 80);

      // Check first result for auth error
      if (results[0] && results[0].error) {
        setErr("Finnhub API: " + results[0].error);
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      const rows = TOP_STOCKS.map((meta, i) => {
        const q = results[i];
        if (!q || !q.c) return { symbol: meta.symbol, name: meta.name, price: null, changePct: null, change7d: null, change30d: null };
        return {
          symbol: meta.symbol,
          name: meta.name,
          price: q.c,           // current price
          prevClose: q.pc,      // previous close
          changePct: q.dp,      // daily change %
          high: q.h,
          low: q.l,
          change7d: null,
          change30d: null,
        };
      });

      setStockRows(rows);
      setUpdated(new Date());
      setLoading(false);

      // Fetch 7D/30D in background (needs candle data)
      // Wait 5 seconds to avoid rate limit, then fetch
      setTimeout(() => fetchHistorical(rows), 5000);
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
    fetchingRef.current = false;
  }, [hasKey, apiKey]);

  /* ── Fetch 30D candle data for 7D/30D change ── */
  const fetchHistorical = useCallback(async (rows) => {
    if (!hasKey) return;
    const now = Math.floor(Date.now() / 1000);
    const d30ago = now - 30 * 86400;

    const urls = rows.map(r =>
      FH + "/stock/candle?symbol=" + r.symbol + "&resolution=D&from=" + d30ago + "&to=" + now + "&token=" + apiKey
    );

    // Fetch with 100ms delay between each (20 calls over ~2s)
    const results = await fetchSequential(urls, 100);

    setStockRows(prev => {
      const updated = [...prev];
      results.forEach((candle, i) => {
        if (!candle || candle.s !== "ok" || !candle.c || candle.c.length < 2) return;
        const row = updated[i];
        if (!row || !row.price) return;

        const closes = candle.c;
        const currentPrice = row.price;

        // 7D: ~5 trading days from end
        if (closes.length >= 6) {
          const p7d = closes[closes.length - 6];
          if (p7d) row.change7d = ((currentPrice - p7d) / p7d) * 100;
        }

        // 30D: first close in the array
        const p30d = closes[0];
        if (p30d) row.change30d = ((currentPrice - p30d) / p30d) * 100;
      });
      return updated;
    });
  }, [hasKey, apiKey]);

  const fetchAll = useCallback(() => {
    fetchIndices();
    fetchStocks();
  }, [fetchIndices, fetchStocks]);

  useEffect(() => { if (hasKey) fetchAll(); }, [hasKey]);
  useEffect(() => {
    if (auto && hasKey) timer.current = setInterval(() => { fetchIndices(); fetchStocks(); }, 300000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [auto, hasKey, fetchIndices, fetchStocks]);

  const handleSaveKey = (newKey) => {
    setApiKey(newKey);
    try { localStorage.setItem("fh_api_key", newKey); } catch {}
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
              {"\uD83D\uDD11"} Finnhub API Key Required
            </div>
            <p style={{ fontSize: 13, color: "#3b82f6", marginBottom: 12, lineHeight: 1.5 }}>
              Stock data is powered by{" "}
              <a href="https://finnhub.io/" target="_blank" rel="noopener" style={{ color: "#1d4ed8", fontWeight: 600 }}>
                Finnhub
              </a>{" "}
              (free: 60 calls/min). Sign up and paste your API key below.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                defaultValue={apiKey}
                placeholder="Paste your Finnhub API key here..."
                onKeyDown={e => { if (e.key === "Enter") handleSaveKey(e.target.value.trim()); }}
                id="fh-key-input"
                style={{
                  flex: 1, padding: "10px 14px", border: "1px solid #d1d5db",
                  borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "monospace",
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById("fh-key-input");
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
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650, background: "#fff" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thLeft, width: 36, textAlign: "center" }}>#</th>
                      <th style={{ ...thLeft, minWidth: 200 }}>Company</th>
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
              Data: Finnhub API &middot; Auto-refresh 5min &middot; Global Top 20 by Market Cap
            </div>
          </>
        )}
      </div>
    </div>
  );
}
