import React from "react";
import ReactDOM from "react-dom/client";

import { useState, useEffect, useCallback, useRef } from "react";

/*
 * ============================================
 *   코인 추가/삭제는 이 배열만 수정하면 됩니다!
 * ============================================
 *
 *   추가 방법:
 *   1. coingecko.com에서 코인 검색
 *   2. URL의 마지막 부분이 id (예: /coins/solana → id: "solana")
 *   3. 아래 배열에 객체를 추가:
 *
 *   { id: "solana", symbol: "SOL", name: "Solana", tgePrice: 0.22, tgeDate: "2020-03-10" },
 *
 *   - tgePrice: TGE(최초 거래) 당시 USD 가격. 모르면 null
 *   - tgeDate: 참고용 날짜. 모르면 ""
 */
const COINS = [
  { id: "bitcoin",  symbol: "BTC", name: "Bitcoin",  tgePrice: 0.0008, tgeDate: "2009-01" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", tgePrice: 0.311,  tgeDate: "2015-07" },
  { id: "ripple",   symbol: "XRP", name: "XRP",      tgePrice: 0.006,  tgeDate: "2013-08" },
  // { id: "solana",   symbol: "SOL", name: "Solana",   tgePrice: 0.22,   tgeDate: "2020-03" },
  // { id: "dogecoin", symbol: "DOGE",name: "Dogecoin", tgePrice: 0.0002, tgeDate: "2013-12" },
  // { id: "cardano",  symbol: "ADA", name: "Cardano",  tgePrice: 0.02,   tgeDate: "2017-10" },
];

const API = "https://api.coingecko.com/api/v3";

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

function PctCell({ value }) {
  if (value == null) return <td style={{ padding: "12px 8px", textAlign: "right", color: "#6b7280", fontSize: 13 }}>{"\u2014"}</td>;
  const pos = value >= 0;
  return (
    <td style={{ padding: "12px 8px", textAlign: "right", fontSize: 13, fontWeight: 600 }}>
      <span style={{
        color: pos ? "#4ade80" : "#f87171",
        background: pos ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        padding: "3px 10px", borderRadius: 6
      }}>
        {fmtPct(value)}
      </span>
    </td>
  );
}

function Spark({ data }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const W = 80, H = 28;
  const pts = data.map((v, i) => ((i / (data.length - 1)) * W) + "," + (H - ((v - mn) / r) * (H - 4) - 2)).join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={W} height={H}>
      <polyline points={pts} fill="none" stroke={up ? "#22c55e" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CryptoDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [auto, setAuto] = useState(true);
  const timer = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      setErr(null);
      const ids = COINS.map(c => c.id).join(",");
      const url = API + "/coins/markets?vs_currency=usd&ids=" + ids +
        "&order=market_cap_desc&per_page=100&page=1&sparkline=true" +
        "&price_change_percentage=7d%2C30d%2C90d";
      const res = await fetch(url);
      if (res.status === 429) { setErr("API \uC694\uCCAD \uC81C\uD55C. 1\uBD84 \uD6C4 \uC7AC\uC2DC\uB3C4."); return; }
      if (!res.ok) throw new Error("API Error: " + res.status);
      const json = await res.json();
      const built = json.map((item, idx) => {
        const coin = COINS.find(c => c.id === item.id);
        const cur = item.current_price;
        return {
          rank: item.market_cap_rank || idx + 1,
          id: item.id,
          name: item.name,
          symbol: (item.symbol || "").toUpperCase(),
          image: item.image,
          current: cur,
          marketCap: item.market_cap,
          change7d: item.price_change_percentage_7d_in_currency,
          change30d: item.price_change_percentage_30d_in_currency,
          change90d: item.price_change_percentage_90d_in_currency != null
            ? item.price_change_percentage_90d_in_currency
            : null,
          tgeChange: coin && coin.tgePrice ? ((cur - coin.tgePrice) / coin.tgePrice) * 100 : null,
          tgeDate: coin ? coin.tgeDate : "",
          sparkline: item.sparkline_in_7d ? item.sparkline_in_7d.price : [],
        };
      });
      built.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
      setRows(built);
      setUpdated(new Date());
      setLoading(false);
    } catch (e) { setErr(e.message); setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if (auto) timer.current = setInterval(fetchAll, 60000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [auto, fetchAll]);

  const thStyle = {
    padding: "10px 8px", textAlign: "right", fontSize: 11, color: "#6b7280",
    fontWeight: 600, borderBottom: "1px solid #1f2937", whiteSpace: "nowrap",
    position: "sticky", top: 0, background: "#111827", zIndex: 1
  };
  const thLeft = { ...thStyle, textAlign: "left" };

  return (
    <div style={{ minHeight: "100vh", background: "#111827", color: "#fff", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#eab308", fontSize: 30 }}>{"\u20BF"}</span>
            Crypto Dashboard
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, fontSize: 13, color: "#9ca3af" }}>
            {updated && <span>{"\uB9C8\uC9C0\uB9C9 \uC5C5\uB370\uC774\uD2B8"}: {updated.toLocaleTimeString("ko-KR")}</span>}
            <button onClick={fetchAll} style={{ background: "none", border: "none", color: "#eab308", cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>
              {"\uC0C8\uB85C\uACE0\uCE68"}
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />
              60{"\uCD08"} {"\uC790\uB3D9"}
            </label>
          </div>
        </div>

        {err && <div style={{ background: "rgba(239,68,68,.12)", border: "1px solid #991b1b", color: "#fca5a5", padding: 12, borderRadius: 12, marginBottom: 20, fontSize: 13 }}>{err}</div>}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#9ca3af" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12, animation: "pulse 2s infinite" }}>{"\uD83D\uDCE1"}</div>
              <p>{"\uB370\uC774\uD130 \uB85C\uB529 \uC911"}...</p>
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #1f2937" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#111827" }}>
                  <th style={{ ...thLeft, width: 40, textAlign: "center" }}>#</th>
                  <th style={{ ...thLeft, minWidth: 180 }}>{"\uCF54\uC778"}</th>
                  <th style={thStyle}>{"\uC2DC\uAC00\uCD1D\uC561"}</th>
                  <th style={thStyle}>{"\uD604\uC7AC \uAC00\uACA9"}</th>
                  <th style={thStyle}>7{"\uC77C"}</th>
                  <th style={thStyle}>TGE {"\uB300\uBE44"}</th>
                  <th style={thStyle}>90{"\uC77C"}</th>
                  <th style={thStyle}>30{"\uC77C"}</th>
                  <th style={thStyle}>7{"\uC77C"} {"\uCC28\uD2B8"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} style={{
                    background: i % 2 === 0 ? "#0d1117" : "#111827",
                    borderBottom: "1px solid #1e2533",
                    transition: "background .15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#1a2332"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#0d1117" : "#111827"}
                  >
                    <td style={{ padding: "12px 8px", textAlign: "center", fontSize: 12, color: "#6b7280" }}>{r.rank}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {r.image && <img src={r.image} alt={r.symbol} width={24} height={24} style={{ borderRadius: "50%" }} />}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "#fff" }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{r.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right", fontSize: 13, color: "#d1d5db" }}>{fmtMcap(r.marketCap)}</td>
                    <td style={{ padding: "12px 8px", textAlign: "right", fontSize: 14, fontWeight: 600, color: "#fff" }}>{fmtPrice(r.current)}</td>
                    <PctCell value={r.change7d} />
                    <PctCell value={r.tgeChange} />
                    <PctCell value={r.change90d} />
                    <PctCell value={r.change30d} />
                    <td style={{ padding: "12px 8px", textAlign: "center" }}>
                      <Spark data={r.sparkline} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "#4b5563" }}>
          CoinGecko Free API &middot; 60{"\uCD08"} {"\uC790\uB3D9 \uAC31\uC2E0"} &middot; {"\uC2DC\uAC00\uCD1D\uC561 \uC21C\uC704 \uC815\uB82C"}
        </div>
      </div>
    </div>
  );
}

// 위에서 만든 전체 컴포넌트 코드를 여기에 붙여넣기
// (import 문 포함, export default 포함 전부)

// 아래 코드를 맨 마지막에 추가:
ReactDOM.createRoot(document.getElementById("root")).render(<CryptoDashboard />);
