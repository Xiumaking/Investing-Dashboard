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
  { id: "lighter",        symbol: "LIT",      name: "Lighter",          tgePrice: 1.50,    tgeDate: "2025-12" },
  { id: "yooldo-games",   symbol: "ESPORTS",  name: "Yooldo Games",     tgePrice: 0.05,    tgeDate: "2025" },
  { id: "delabs-games",   symbol: "DELABS",   name: "Delabs Games",     tgePrice: 0.0033,  tgeDate: "2025-07" },
  { id: "cross-2",        symbol: "CROSS",    name: "CROSS",            tgePrice: 0.006,   tgeDate: "2025" },
  { id: "wemix-token",     symbol: "WEMIX",   name: "WEMIX",            tgePrice: 0.28,    tgeDate: "2020-10" },
  { id: "nexpace",         symbol: "NXPC",    name: "Nexpace",          tgePrice: 1.50,    tgeDate: "2025-05" },
  { id: "marblex",         symbol: "MBX",     name: "MARBLEX",          tgePrice: 1.17,    tgeDate: "2022" },
  { id: "xpla",            symbol: "XPLA",    name: "XPLA",             tgePrice: 0.30,    tgeDate: "2022-10" },
  { id: "altava",          symbol: "TAVA",    name: "ALTAVA",           tgePrice: 0.08,    tgeDate: "2022" },
  { id: "ztx",             symbol: "ZTX",     name: "ZTX",              tgePrice: 0.015,   tgeDate: "2024" },
  { id: "overprotocol",    symbol: "OVER",    name: "OverProtocol",     tgePrice: 0.80,    tgeDate: "2024" },
];

const CG = "https://api.coingecko.com/api/v3";
const FNG_API = "https://api.alternative.me/fng/?limit=1";
const FNG_IMG = "https://alternative.me/crypto/fear-and-greed-index.png";

/* ── Format helpers ── */
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

/* ── Mini sparkline for banner cards ── */
function MiniSpark({ data, color, width = 80, height = 28 }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const pts = data.map((v, i) => ((i / (data.length - 1)) * width) + "," + (height - ((v - mn) / r) * (height - 4) - 2)).join(" ");
  const gradId = "g" + Math.random().toString(36).slice(2, 6);
  const fillPts = pts + ` ${width},${height} 0,${height}`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Dominance bar chart ── */
function DomBar({ btc, eth }) {
  const other = Math.max(0, 100 - (btc || 0) - (eth || 0));
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 6, background: "#e5e7eb" }}>
      <div style={{ width: (btc || 0) + "%", background: "#f7931a", transition: "width .3s" }} title={"BTC " + (btc||0).toFixed(1) + "%"} />
      <div style={{ width: (eth || 0) + "%", background: "#627eea", transition: "width .3s" }} title={"ETH " + (eth||0).toFixed(1) + "%"} />
      <div style={{ width: other + "%", background: "#d1d5db" }} />
    </div>
  );
}

/* ── Top Banner ── */
function TopBanner({ globalData, fng, mcapHistory, volHistory }) {
  const mc = globalData?.total_market_cap?.usd;
  const mcChange = globalData?.market_cap_change_percentage_24h_usd;
  const vol = globalData?.total_volume?.usd;
  const btcD = globalData?.market_cap_percentage?.btc;
  const ethD = globalData?.market_cap_percentage?.eth;

  const cardStyle = { background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", flex: "1 1 200px", minWidth: 180 };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
      {/* Market Cap */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Market Cap</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginTop: 2 }}>{mc ? fmtMcap(mc) : "\u2014"}</div>
            {mcChange != null && (
              <div style={{ fontSize: 12, fontWeight: 600, color: mcChange >= 0 ? "#16a34a" : "#dc2626", marginTop: 1 }}>
                {fmtPct(mcChange)}
              </div>
            )}
          </div>
          <MiniSpark data={mcapHistory} color={mcChange >= 0 ? "#16a34a" : "#dc2626"} />
        </div>
      </div>

      {/* 24h Volume */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>24h Volume</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111", marginTop: 2 }}>{vol ? fmtMcap(vol) : "\u2014"}</div>
          </div>
          <MiniSpark data={volHistory} color="#2563eb" />
        </div>
      </div>

      {/* BTC & ETH Dominance */}
      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Dominance</div>
        <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "#f7931a" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>BTC {btcD != null ? btcD.toFixed(1) + "%" : "\u2014"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: "#627eea" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>ETH {ethD != null ? ethD.toFixed(1) + "%" : "\u2014"}</span>
          </div>
          <span style={{ fontSize: 12, color: "#9ca3af", alignSelf: "center" }}>Others {btcD != null && ethD != null ? (100 - btcD - ethD).toFixed(1) + "%" : ""}</span>
        </div>
        <DomBar btc={btcD} eth={ethD} />
      </div>

      {/* Fear & Greed */}
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12 }}>
        <img src={FNG_IMG} alt="Fear & Greed" width={80} height={80} style={{ borderRadius: 8 }} />
        <div>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Fear & Greed</div>
          {fng ? (
            <>
              <div style={{ fontSize: 26, fontWeight: 700, color: fngColor(parseInt(fng.value)), marginTop: 2 }}>{fng.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: fngColor(parseInt(fng.value)) }}>{fng.value_classification}</div>
            </>
          ) : <div style={{ fontSize: 14, color: "#9ca3af", marginTop: 4 }}>Loading...</div>}
        </div>
      </div>
    </div>
  );
}

function fngColor(v) {
  if (v <= 25) return "#dc2626";
  if (v <= 45) return "#ea580c";
  if (v <= 55) return "#ca8a04";
  if (v <= 75) return "#65a30d";
  return "#16a34a";
}

/* ── Table components ── */
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

const S = { tdR: { padding: "12px 8px", textAlign: "right", fontSize: 13, color: "#374151" } };

/* ── Main Dashboard ── */
function CryptoDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [auto, setAuto] = useState(true);
  const [globalData, setGlobalData] = useState(null);
  const [fng, setFng] = useState(null);
  const [mcapHistory, setMcapHistory] = useState(null);
  const [volHistory, setVolHistory] = useState(null);
  const timer = useRef(null);

  const fetchGlobal = useCallback(async () => {
    try {
      const [gRes, fRes] = await Promise.all([
        fetch(CG + "/global"),
        fetch(FNG_API),
      ]);
      if (gRes.ok) { const gj = await gRes.json(); setGlobalData(gj.data); }
      if (fRes.ok) { const fj = await fRes.json(); if (fj.data?.[0]) setFng(fj.data[0]); }
    } catch (e) { /* silent */ }
  }, []);

  /* Fetch BTC 7d chart as proxy for market cap trend */
  const fetchCharts = useCallback(async () => {
    try {
      const res = await fetch(CG + "/coins/bitcoin/market_chart?vs_currency=usd&days=7");
      if (res.ok) {
        const json = await res.json();
        if (json.market_caps) setMcapHistory(json.market_caps.map(d => d[1]));
        if (json.total_volumes) setVolHistory(json.total_volumes.map(d => d[1]));
      }
    } catch (e) { /* silent */ }
  }, []);

 const fetchCoins = useCallback(async () => {
    try {
      setErr(null);
      const ids = COINS.map(c => c.id).join(",");
      const url = CG + "/coins/markets?vs_currency=usd&ids=" + ids +
        "&order=market_cap_desc&per_page=100&page=1&sparkline=true" +
        "&price_change_percentage=1h%2C7d%2C30d";
      const res = await fetch(url);
      if (res.status === 429) { setErr("API rate limit reached. Auto-retry in 1 min."); return; }
      if (!res.ok) throw new Error("API Error: " + res.status);
      const json = await res.json();

      /* ── Fallback: 누락된 코인을 /coins/{id}로 개별 조회 ── */
      const fetchedIds = new Set(json.map(item => item.id));
      const missingCoins = COINS.filter(c => !fetchedIds.has(c.id));
      const fallbackItems = [];

      if (missingCoins.length > 0) {
        const detailPromises = missingCoins.map(async (mc) => {
          try {
            const dRes = await fetch(CG + "/coins/" + mc.id +
              "?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true");
            if (!dRes.ok) return null;
            const d = await dRes.json();
            return {
              id: mc.id,
              name: d.name || mc.name,
              symbol: (d.symbol || mc.symbol).toUpperCase(),
              image: d.image?.small || d.image?.thumb || null,
              current: d.market_data?.current_price?.usd ?? null,
              marketCap: d.market_data?.market_cap?.usd || d.market_data?.fully_diluted_valuation?.usd || null,
              fdv: d.market_data?.fully_diluted_valuation?.usd || null,
              change1h: d.market_data?.price_change_percentage_1h_in_currency?.usd ?? null,
              change7d: d.market_data?.price_change_percentage_7d_in_currency?.usd ?? null,
              change30d: d.market_data?.price_change_percentage_30d_in_currency?.usd ?? null,
              sparkline: d.market_data?.sparkline_7d?.price || [],
              tgePrice: mc.tgePrice,
            };
          } catch (e) { return null; }
        });
        const results = await Promise.all(detailPromises);
        results.forEach(r => { if (r) fallbackItems.push(r); });
      }

      const built = json.map((item) => {
        const coin = COINS.find(c => c.id === item.id);
        const cur = item.current_price;
        const tgeP = coin ? coin.tgePrice : null;
        return {
          rank: item.market_cap_rank || 9999, id: item.id, name: item.name,
          symbol: (item.symbol || "").toUpperCase(), image: item.image, current: cur,
          marketCap: item.market_cap || item.fully_diluted_valuation, fdv: item.fully_diluted_valuation,
          change1h: item.price_change_percentage_1h_in_currency,
          change7d: item.price_change_percentage_7d_in_currency,
          change30d: item.price_change_percentage_30d_in_currency,
          sparkline: item.sparkline_in_7d ? item.sparkline_in_7d.price : [],
          tgePrice: tgeP, priceOverTge: tgeP ? cur / tgeP : null,
        };
      });

      /* ── Fallback 코인 추가 ── */
      for (const fb of fallbackItems) {
        const cur = fb.current;
        built.push({
          rank: 9999, id: fb.id, name: fb.name,
          symbol: fb.symbol, image: fb.image, current: cur,
          marketCap: fb.marketCap, fdv: fb.fdv,
          change1h: fb.change1h, change7d: fb.change7d, change30d: fb.change30d,
          sparkline: fb.sparkline,
          tgePrice: fb.tgePrice, priceOverTge: (cur && fb.tgePrice) ? cur / fb.tgePrice : null,
        });
      }

      built.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
      setRows(built);
      setUpdated(new Date());
      setLoading(false);
    } catch (e) { setErr(e.message); setLoading(false); }
  }, []);

  const fetchAll = useCallback(() => { fetchGlobal(); fetchCoins(); }, [fetchGlobal, fetchCoins]);

  useEffect(() => { fetchAll(); fetchCharts(); }, [fetchAll, fetchCharts]);
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
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 28 }}>{"\uD83D\uDCC8"}</span> Crypto Dashboard
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, fontSize: 13, color: "#6b7280" }}>
            {updated && <span>Last updated: {updated.toLocaleTimeString("en-US")}</span>}
            <button onClick={fetchAll} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>Refresh</button>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> Auto-refresh 60s
            </label>
          </div>
        </div>

        <TopBanner globalData={globalData} fng={fng} mcapHistory={mcapHistory} volHistory={volHistory} />

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
                {rows.map((r) => (
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
          Data: CoinGecko API + Alternative.me &middot; Auto-refresh 60s &middot; Sorted by market cap rank
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<CryptoDashboard />);
