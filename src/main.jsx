import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";
import ReactDOM from "react-dom/client";

const COINS = [
  { id: "bitcoin",          symbol: "BTC",    name: "Bitcoin",          tgePrice: 0.0008,  tgeDate: "2009-01" },
  { id: "ethereum",         symbol: "ETH",    name: "Ethereum",         tgePrice: 0.311,   tgeDate: "2015-07" },
  { id: "ripple",           symbol: "XRP",    name: "XRP",              tgePrice: 0.006,   tgeDate: "2013-08" },
  { id: "binancecoin",      symbol: "BNB",    name: "BNB",              tgePrice: 0.15,    tgeDate: "2017-07" },
  { id: "hyperliquid",      symbol: "HYPE",   name: "Hyperliquid",      tgePrice: 3.81,    tgeDate: "2024-11" },
  { id: "avalanche-2",      symbol: "AVAX",   name: "Avalanche",        tgePrice: 0.50,    tgeDate: "2020-09" },
  { id: "world-liberty-financial", symbol: "WLFI", name: "World Liberty Financial", tgePrice: 0.015, tgeDate: "2024-10" },
  { id: "mantle",           symbol: "MNT",    name: "Mantle",           tgePrice: 0.42,    tgeDate: "2023-07" },
  { id: "aster-2",          symbol: "ASTER",  name: "Aster",            tgePrice: 0.50,    tgeDate: "2025-09" },
  { id: "ondo-finance",     symbol: "ONDO",   name: "Ondo Finance",     tgePrice: 0.089,   tgeDate: "2024-01" },
  { id: "worldcoin-wld",    symbol: "WLD",    name: "Worldcoin",        tgePrice: 2.00,    tgeDate: "2023-07" },
  { id: "ethena",           symbol: "ENA",    name: "Ethena",           tgePrice: 0.36,    tgeDate: "2024-04" },
  { id: "stable-2",         symbol: "STABLE", name: "Stable",           tgePrice: 0.01,    tgeDate: "2025-01" },
  { id: "pudgy-penguins",   symbol: "PENGU",  name: "Pudgy Penguins",   tgePrice: 0.035,   tgeDate: "2024-12" },
  { id: "kite-ai",          symbol: "KITE",   name: "Kite",             tgePrice: 0.088,   tgeDate: "2025-11" },
  { id: "kaia",             symbol: "KAIA",   name: "Kaia",             tgePrice: 0.10,    tgeDate: "2024-11" },
  { id: "the-sandbox",      symbol: "SAND",   name: "The Sandbox",      tgePrice: 0.0083,  tgeDate: "2020-08" },
  { id: "decentraland",     symbol: "MANA",   name: "Decentraland",     tgePrice: 0.024,   tgeDate: "2017-08" },
];

const CG_API = "https://api.coingecko.com/api/v3";
const FNG_API = "https://api.alternative.me/fng/?limit=1";

function fmtPrice(p) {
  if (p == null) return "\u2014";
  if (p >= 1000) return "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return "$" + p.toFixed(2);
  if (p >= 0.01) return "$" + p.toFixed(4);
  return "$" + p.toFixed(6);
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
  if (Math.abs(v) >= 1e6) return s + (v / 1e6).toFixed(1) + "M%";
  if (Math.abs(v) >= 1e4) return s + (v / 1e3).toFixed(0) + "K%";
  return s + v.toFixed(2) + "%";
}
function fmtRatio(v) {
  if (v == null) return "\u2014";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M x";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K x";
  return v.toFixed(2) + " x";
}

function PctCell({ value }) {
  if (value == null) return <td style={{ ...S.tdR, color: "#aaa" }}>{"\u2014"}</td>;
  const pos = value >= 0;
  return (
    <td style={S.tdR}>
      <span style={{ color: pos ? "#16a34a" : "#dc2626", background: pos ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)", padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
        {fmtPct(value)}
      </span>
    </td>
  );
}

function Spark({ data }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const W = 100, H = 32;
  const pts = data.map((v, i) => ((i / (data.length - 1)) * W) + "," + (H - ((v - mn) / r) * (H - 4) - 2)).join(" ");
  const up = data[data.length - 1] >= data[0];
  return <svg width={W} height={H}><polyline points={pts} fill="none" stroke={up ? "#16a34a" : "#dc2626"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function fngColor(v) {
  if (v <= 25) return "#dc2626";
  if (v <= 45) return "#ea580c";
  if (v <= 55) return "#ca8a04";
  if (v <= 75) return "#65a30d";
  return "#16a34a";
}

function TopBanner({ globalData, fng }) {
  const items = [];
  if (globalData) {
    const mc = globalData.total_market_cap?.usd;
    const mcChange = globalData.market_cap_change_percentage_24h_usd;
    items.push({ label: "Market Cap", value: mc ? fmtMcap(mc) : "\u2014", sub: mcChange != null ? fmtPct(mcChange) : null, subColor: mcChange >= 0 ? "#16a34a" : "#dc2626" });
    const btcDom = globalData.market_cap_percentage?.btc;
    items.push({ label: "BTC Dominance", value: btcDom != null ? btcDom.toFixed(1) + "%" : "\u2014" });
    const ethDom = globalData.market_cap_percentage?.eth;
    items.push({ label: "ETH Dominance", value: ethDom != null ? ethDom.toFixed(1) + "%" : "\u2014" });
    const coins = globalData.active_cryptocurrencies;
    items.push({ label: "Active Coins", value: coins ? coins.toLocaleString() : "\u2014" });
  }
  if (fng) {
    items.push({ label: "Fear & Greed", value: fng.value, sub: fng.value_classification, subColor: fngColor(parseInt(fng.value)), isFng: true });
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
      {items.map((it, i) => (
        <div key={i} style={{ background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 16px", minWidth: 140, flex: "1 1 auto" }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{it.label}</div>
          <div style={{ fontSize: it.isFng ? 22 : 16, fontWeight: 700, color: it.isFng ? fngColor(parseInt(it.value)) : "#111", marginTop: 2 }}>
            {it.value}
          </div>
          {it.sub && <div style={{ fontSize: 12, color: it.subColor || "#6b7280", fontWeight: 600, marginTop: 1 }}>{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

const S = {
  tdR: { padding: "12px 8px", textAlign: "right", fontSize: 13, color: "#374151" },
};

function CryptoDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [auto, setAuto] = useState(true);
  const [globalData, setGlobalData] = useState(null);
  const [fng, setFng] = useState(null);
  const timer = useRef(null);

  const fetchGlobal = useCallback(async () => {
    try {
      const [gRes, fRes] = await Promise.all([
        fetch(CG_API + "/global"),
        fetch(FNG_API),
      ]);
      if (gRes.ok) { const gj = await gRes.json(); setGlobalData(gj.data); }
      if (fRes.ok) { const fj = await fRes.json(); if (fj.data && fj.data[0]) setFng(fj.data[0]); }
    } catch (e) { /* silent */ }
  }, []);

  const fetchCoins = useCallback(async () => {
    try {
      setErr(null);
      const ids = COINS.map(c => c.id).join(",");
      const url = CG_API + "/coins/markets?vs_currency=usd&ids=" + ids +
        "&order=market_cap_desc&per_page=100&page=1&sparkline=true" +
        "&price_change_percentage=1h%2C7d%2C30d";
      const res = await fetch(url);
      if (res.status === 429) { setErr("API rate limit reached. Auto-retry in 1 min."); return; }
      if (!res.ok) throw new Error("API Error: " + res.status);
      const json = await res.json();
      const built = json.map((item, idx) => {
        const coin = COINS.find(c => c.id === item.id);
        const cur = item.current_price;
        const tgeP = coin ? coin.tgePrice : null;
        return {
          rank: item.market_cap_rank || idx + 1, id: item.id, name: item.name,
          symbol: (item.symbol || "").toUpperCase(), image: item.image, current: cur,
          marketCap: item.market_cap, fdv: item.fully_diluted_valuation,
          change1h: item.price_change_percentage_1h_in_currency,
          change7d: item.price_change_percentage_7d_in_currency,
          change30d: item.price_change_percentage_30d_in_currency,
          sparkline: item.sparkline_in_7d ? item.sparkline_in_7d.price : [],
          tgePrice: tgeP, priceOverTge: tgeP ? cur / tgeP : null,
        };
      });
      built.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
      setRows(built);
      setUpdated(new Date());
      setLoading(false);
    } catch (e) { setErr(e.message); setLoading(false); }
  }, []);

  const fetchAll = useCallback(() => { fetchGlobal(); fetchCoins(); }, [fetchGlobal, fetchCoins]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if (auto) timer.current = setInterval(fetchAll, 60000);
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
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 28 }}>{"\uD83D\uDCC8"}</span> Crypto Dashboard
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, fontSize: 13, color: "#6b7280" }}>
            {updated && <span>Last updated: {updated.toLocaleTimeString("en-US")}</span>}
            <button onClick={fetchAll} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>Refresh</button>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />
              Auto-refresh 60s
            </label>
          </div>
        </div>

        {/* Top Banner */}
        <TopBanner globalData={globalData} fng={fng} />

        {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>{err}</div>}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#9ca3af" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 12 }}>{"\uD83D\uDCE1"}</div><p>Loading data...</p></div>
          </div>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e5e7eb" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100, background: "#fff" }}>
              <thead>
                <tr>
                  <th style={{ ...thLeft, width: 36, textAlign: "center" }}>#</th>
                  <th style={{ ...thLeft, minWidth: 160 }}>Coin</th>
                  <th style={thBase}>Marketcap</th>
                  <th style={thBase}>FDV</th>
                  <th style={thBase}>Price</th>
                  <th style={thBase}>1h</th>
                  <th style={thBase}>7D</th>
                  <th style={thBase}>30D</th>
                  <th style={{ ...thBase, textAlign: "center" }}>Last 30 days</th>
                  <th style={thBase}>TGE price</th>
                  <th style={thBase}>Price / TGE price</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", transition: "background .15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                    <td style={{ padding: "12px 8px", textAlign: "center", fontSize: 12, color: "#9ca3af" }}>{r.rank}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {r.image && <img src={r.image} alt={r.symbol} width={24} height={24} style={{ borderRadius: "50%" }} />}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td style={S.tdR}>{fmtMcap(r.marketCap)}</td>
                    <td style={S.tdR}>{fmtMcap(r.fdv)}</td>
                    <td style={{ ...S.tdR, fontWeight: 700, color: "#111", fontSize: 14 }}>{fmtPrice(r.current)}</td>
                    <PctCell value={r.change1h} />
                    <PctCell value={r.change7d} />
                    <PctCell value={r.change30d} />
                    <td style={{ padding: "12px 8px", textAlign: "center" }}><Spark data={r.sparkline} /></td>
                    <td style={S.tdR}>{r.tgePrice != null ? fmtPrice(r.tgePrice) : "\u2014"}</td>
                    <td style={S.tdR}>
                      {r.priceOverTge != null ? (
                        <span style={{ fontWeight: 700, fontSize: 13, color: r.priceOverTge >= 1 ? "#16a34a" : "#dc2626",
                          background: r.priceOverTge >= 1 ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
                          padding: "3px 10px", borderRadius: 6 }}>
                          {fmtRatio(r.priceOverTge)}
                        </span>
                      ) : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
          Data: CoinGecko Free API + Alternative.me Fear & Greed API &middot; Auto-refresh every 60s &middot; Sorted by market cap rank
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CryptoDashboard />);
