import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";

/* ═══════════════════════════════════════════════
   HARDCODED POSITIONS (edit here on GitHub)
   ─────────────────────────────────────────
   Binance-style futures math:
     Size       = coin quantity (e.g. WLD units)
     Notional   = Size × Entry  (USDT)
     Margin     = Notional / Leverage  (Initial Margin)
     PnL (long) = (Mark − Entry) × Size
     PnL (short)= (Entry − Mark) × Size
     ROI        = PnL / Margin × 100%
     Liq (long) ≈ Entry × (1 − 1/Leverage)
     Liq (short)≈ Entry × (1 + 1/Leverage)
   ─────────────────────────────────────────
   Fields:
     assetType: "crypto" or "stock"
     symbol: CoinGecko id (crypto) or Yahoo symbol (stock)
     display: short ticker for UI
     side: "long" or "short"
     avg: entry price (native currency)
     size: coin/share quantity
     leverage: 1 for spot, >1 for margin/futures
═══════════════════════════════════════════════ */
const HARDCODED_POSITIONS = [
  {
    assetType: "crypto",
    symbol: "worldcoin-wld",
    display: "WLD",
    side: "long",
    avg: 0.2827851,
    size: 46545,           // coin quantity (Binance "Size(USDT)"/Mark ≈ 14670.98/0.3152)
    leverage: 3,
    mode: "cross",
  },
];

/* Wallet / account balance (USD) */
const WALLET_BALANCE_USD = 8231.68;

/* ── Formatters ── */
const fmt = {
  usd(v, digits = 2) {
    if (v == null || !isFinite(v)) return "—";
    const abs = Math.abs(v);
    const sign = v < 0 ? "-" : "";
    if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
    if (abs >= 1000) return sign + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    if (abs >= 1) return sign + "$" + abs.toFixed(digits);
    if (abs >= 0.01) return sign + "$" + abs.toFixed(4);
    return sign + "$" + abs.toFixed(6);
  },
  pct(v) {
    if (v == null || !isFinite(v)) return "—";
    return (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
  },
  price(v) {
    if (v == null || !isFinite(v)) return "—";
    if (v >= 1000) return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (v >= 1) return "$" + v.toFixed(2);
    if (v >= 0.01) return "$" + v.toFixed(4);
    return "$" + v.toFixed(7);
  },
  qty(v) {
    if (v == null) return "—";
    if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
    return v.toFixed(4);
  },
};

/* ── PnL math (Binance-style) ── */
function computePosition(pos, currentPrice, fxRates) {
  if (!currentPrice || !pos.avg || !pos.size) return null;
  const isLong = pos.side === "long";

  // In native currency (USDT for crypto, KRW/HKD/etc for stock)
  const entryNotional = pos.size * pos.avg;
  const currentNotional = pos.size * currentPrice;   // Binance "Size (USDT)" column
  const margin = entryNotional / pos.leverage;       // Initial margin

  const pnlNative = isLong
    ? (currentPrice - pos.avg) * pos.size
    : (pos.avg - currentPrice) * pos.size;

  const pnlPct = (pnlNative / margin) * 100;         // ROI

  const liqPrice = isLong
    ? pos.avg * (1 - 1 / pos.leverage)
    : pos.avg * (1 + 1 / pos.leverage);

  // USD conversion for stocks in foreign currency
  const fx = pos.assetType === "stock" ? getStockFx(pos.symbol, fxRates) : 1;

  return {
    size: pos.size,
    currentPrice,
    entryNotional,
    currentNotional,
    currentNotionalUSD: currentNotional / fx,
    pnlNative,
    pnlUSD: pnlNative / fx,
    pnlPct,
    margin,
    marginUSD: margin / fx,
    liqPrice,
    isLong,
  };
}

function getStockFx(symbol, fxRates) {
  if (symbol.endsWith(".KS") || symbol.endsWith(".KQ")) return fxRates.KRW || 1;
  if (symbol.endsWith(".HK")) return fxRates.HKD || 1;
  if (symbol.endsWith(".SS") || symbol.endsWith(".SZ")) return fxRates.CNY || 1;
  return 1;
}

/* ── API fetches ── */
async function fetchCryptoPrices(cgIds) {
  if (!cgIds.length) return {};
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds.join(",")}&vs_currencies=usd`;
  try {
    const res = await fetch(url);
    if (!res.ok) return {};
    return await res.json();
  } catch { return {}; }
}

async function fetchStockPrices(symbols) {
  if (!symbols.length) return { quotes: {}, fx: { KRW: 1, HKD: 1, CNY: 1 } };
  const fxSymbols = ["KRW=X", "HKD=X", "CNY=X"];
  const all = [...symbols, ...fxSymbols].join(",");
  try {
    const res = await fetch("/api/stocks?type=quote&symbols=" + encodeURIComponent(all));
    const json = await res.json();
    const list = json?.quoteResponse?.result || [];
    const quotes = {};
    const fx = { KRW: 1, HKD: 1, CNY: 1 };
    list.forEach(q => {
      if (q.symbol === "KRW=X") fx.KRW = q.regularMarketPrice;
      else if (q.symbol === "HKD=X") fx.HKD = q.regularMarketPrice;
      else if (q.symbol === "CNY=X") fx.CNY = q.regularMarketPrice;
      else quotes[q.symbol] = q.regularMarketPrice;
    });
    return { quotes, fx };
  } catch { return { quotes: {}, fx: { KRW: 1, HKD: 1, CNY: 1 } }; }
}

/* ── UI components ── */
function StatCard({ label, value, sub, color, size = "md" }) {
  return (
    <div style={{
      background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: 12,
      padding: "14px 18px", flex: "1 1 180px", minWidth: 160,
    }}>
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{
        fontSize: size === "lg" ? 22 : 18, fontWeight: 800,
        color: color || "#1a1a2e", marginTop: 4, letterSpacing: -0.3,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 12, fontWeight: 600, color: color || "#6b7280", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function PositionRow({ pos, calc, onDelete, editable }) {
  const pnlColor = !calc ? "#aaa" : calc.pnlUSD >= 0 ? "#16a34a" : "#dc2626";
  const sideColor = pos.side === "long" ? "#16a34a" : "#dc2626";

  return (
    <tr style={{ borderBottom: "1px solid #f3f4f6" }}
      onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"}
      onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
      <td style={{ padding: "14px 10px" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{pos.display}</div>
          <div style={{ fontSize: 10, color: "#8b8fa3", textTransform: "uppercase" }}>{pos.assetType}</div>
        </div>
      </td>
      <td style={{ padding: "14px 10px", textAlign: "center" }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: "#fff",
          background: sideColor, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase",
        }}>{pos.side}</span>
      </td>
      <td style={{ padding: "14px 10px", textAlign: "center", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
        {pos.leverage}x
        {pos.mode && <div style={{ fontSize: 9, color: "#b0b4c0", textTransform: "uppercase" }}>{pos.mode}</div>}
      </td>
      <td style={{ padding: "14px 10px", textAlign: "right", fontSize: 13, color: "#374151" }}>
        {fmt.qty(pos.size)}
      </td>
      <td style={{ padding: "14px 10px", textAlign: "right", fontSize: 13, color: "#374151" }}>
        {fmt.price(pos.avg)}
      </td>
      <td style={{ padding: "14px 10px", textAlign: "right", fontSize: 13, color: "#1a1a2e", fontWeight: 600 }}>
        {calc ? fmt.price(calc.currentPrice) : "—"}
      </td>
      <td style={{ padding: "14px 10px", textAlign: "right", fontSize: 12, color: "#dc2626" }}>
        {calc ? fmt.price(calc.liqPrice) : "—"}
      </td>
      <td style={{ padding: "14px 10px", textAlign: "right", fontSize: 13, color: "#374151" }}>
        <div>{calc ? fmt.usd(calc.marginUSD) : "—"}</div>
        <div style={{ fontSize: 10, color: "#8b8fa3" }}>
          {calc ? `Size ${fmt.usd(calc.currentNotionalUSD)}` : ""}
        </div>
      </td>
      <td style={{ padding: "14px 10px", textAlign: "right" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: pnlColor }}>
          {calc ? (calc.pnlUSD >= 0 ? "+" : "") + fmt.usd(Math.abs(calc.pnlUSD)) : "—"}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: pnlColor, marginTop: 2 }}>
          {calc ? fmt.pct(calc.pnlPct) : "—"}
        </div>
      </td>
      {editable && (
        <td style={{ padding: "14px 10px", textAlign: "center" }}>
          <button onClick={() => onDelete(pos._key)} style={{
            background: "none", border: "1px solid #fecaca", color: "#dc2626",
            borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600,
          }}>삭제</button>
        </td>
      )}
    </tr>
  );
}

function AddPositionForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({
    assetType: "crypto", symbol: "", display: "", side: "long",
    avg: "", size: "", leverage: "1", mode: "cross",
  });

  const submit = () => {
    if (!form.symbol || !form.avg || !form.size) {
      alert("symbol, 평단가, size(수량)은 필수입니다.");
      return;
    }
    onAdd({
      assetType: form.assetType,
      symbol: form.symbol.trim(),
      display: (form.display || form.symbol).trim().toUpperCase(),
      side: form.side,
      avg: parseFloat(form.avg),
      size: parseFloat(form.size),
      leverage: parseFloat(form.leverage) || 1,
      mode: form.mode,
    });
  };

  const inputStyle = {
    padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 6,
    fontSize: 13, width: "100%", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4, display: "block" };

  return (
    <div style={{
      background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: 12,
      padding: 20, marginBottom: 16,
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#1a1a2e" }}>New Position</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <div>
          <label style={labelStyle}>Asset</label>
          <select value={form.assetType} onChange={e => setForm({ ...form, assetType: e.target.value })} style={inputStyle}>
            <option value="crypto">Crypto</option>
            <option value="stock">Stock</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Symbol {form.assetType === "crypto" ? "(CoinGecko ID)" : "(Yahoo)"}</label>
          <input placeholder={form.assetType === "crypto" ? "bitcoin" : "AAPL"}
            value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Ticker (display)</label>
          <input placeholder="BTC" value={form.display} onChange={e => setForm({ ...form, display: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Side</label>
          <select value={form.side} onChange={e => setForm({ ...form, side: e.target.value })} style={inputStyle}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Avg price (Entry)</label>
          <input type="number" step="any" placeholder="0.2827851" value={form.avg}
            onChange={e => setForm({ ...form, avg: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Size (coin/share qty)</label>
          <input type="number" step="any" placeholder="46545" value={form.size}
            onChange={e => setForm({ ...form, size: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Leverage</label>
          <input type="number" step="any" placeholder="3" value={form.leverage}
            onChange={e => setForm({ ...form, leverage: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Mode</label>
          <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })} style={inputStyle}>
            <option value="cross">Cross</option>
            <option value="isolated">Isolated</option>
            <option value="spot">Spot</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={submit} style={{
          background: "#6366f1", color: "#fff", border: "none", borderRadius: 6,
          padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>Add</button>
        <button onClick={onCancel} style={{
          background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 6,
          padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>Cancel</button>
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN ═══════════════════ */
export default function PortfolioDashboard() {
  const [userPositions, setUserPositions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user_positions_v2") || "[]"); }
    catch { return []; }
  });
  const [prices, setPrices] = useState({});
  const [fxRates, setFxRates] = useState({ KRW: 1, HKD: 1, CNY: 1 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [updated, setUpdated] = useState(null);
  const timer = useRef(null);

  const allPositions = [
    ...HARDCODED_POSITIONS.map((p, i) => ({ ...p, _key: "hc_" + i, _editable: false })),
    ...userPositions.map((p, i) => ({ ...p, _key: "user_" + i, _editable: true })),
  ];

  const addPosition = (p) => {
    const next = [...userPositions, p];
    setUserPositions(next);
    try { localStorage.setItem("user_positions_v2", JSON.stringify(next)); } catch {}
    setShowAdd(false);
  };

  const deletePosition = (key) => {
    if (!key.startsWith("user_")) return;
    const idx = parseInt(key.split("_")[1]);
    const next = userPositions.filter((_, i) => i !== idx);
    setUserPositions(next);
    try { localStorage.setItem("user_positions_v2", JSON.stringify(next)); } catch {}
  };

  const fetchAll = useCallback(async () => {
    const cryptoIds = [...new Set(allPositions.filter(p => p.assetType === "crypto").map(p => p.symbol))];
    const stockSyms = [...new Set(allPositions.filter(p => p.assetType === "stock").map(p => p.symbol))];

    const [cryptoData, stockData] = await Promise.all([
      fetchCryptoPrices(cryptoIds),
      fetchStockPrices(stockSyms),
    ]);

    const newPrices = {};
    cryptoIds.forEach(id => { if (cryptoData[id]?.usd) newPrices["crypto:" + id] = cryptoData[id].usd; });
    Object.entries(stockData.quotes).forEach(([sym, p]) => { newPrices["stock:" + sym] = p; });

    setPrices(newPrices);
    setFxRates(stockData.fx);
    setUpdated(new Date());
    setLoading(false);
  }, [userPositions.length]); // eslint-disable-line

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    timer.current = setInterval(fetchAll, 60000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [fetchAll]);

  const rows = allPositions.map(pos => {
    const priceKey = pos.assetType + ":" + pos.symbol;
    const curPrice = prices[priceKey];
    return { pos, calc: computePosition(pos, curPrice, fxRates) };
  });

  const totalMarginUSD = rows.reduce((s, r) => s + (r.calc?.marginUSD || 0), 0);
  const totalPnlUSD = rows.reduce((s, r) => s + (r.calc?.pnlUSD || 0), 0);
  const totalNotionalUSD = rows.reduce((s, r) => s + (r.calc?.currentNotionalUSD || 0), 0);
  const accountValue = WALLET_BALANCE_USD + totalPnlUSD;
  const totalPnlPct = totalMarginUSD > 0 ? (totalPnlUSD / totalMarginUSD) * 100 : 0;

  const cryptoRows = rows.filter(r => r.pos.assetType === "crypto");
  const stockRows = rows.filter(r => r.pos.assetType === "stock");
  const cryptoPnL = cryptoRows.reduce((s, r) => s + (r.calc?.pnlUSD || 0), 0);
  const stockPnL = stockRows.reduce((s, r) => s + (r.calc?.pnlUSD || 0), 0);
  const cryptoMargin = cryptoRows.reduce((s, r) => s + (r.calc?.marginUSD || 0), 0);
  const stockMargin = stockRows.reduce((s, r) => s + (r.calc?.marginUSD || 0), 0);

  const pnlColor = totalPnlUSD >= 0 ? "#16a34a" : "#dc2626";
  const th = {
    padding: "10px", textAlign: "right", fontSize: 10, color: "#8b8fa3",
    fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
    borderBottom: "2px solid #ebedf2", whiteSpace: "nowrap",
    position: "sticky", top: 0, background: "#fff",
  };
  const thL = { ...th, textAlign: "left" };
  const thC = { ...th, textAlign: "center" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f8", fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 16px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#1a1a2e", letterSpacing: -0.5 }}>Portfolio</h1>
            <div style={{ fontSize: 12, color: "#8b8fa3", marginTop: 4 }}>
              Binance-style futures math · All values in USD
              {fxRates.KRW > 1 && <span> · 1 USD = {fxRates.KRW.toFixed(0)} KRW</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "#8b8fa3" }}>
            {updated && <span>{updated.toLocaleTimeString("en-US")}</span>}
            <button onClick={fetchAll} style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              Refresh
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <StatCard
            label="Margin Balance"
            value={fmt.usd(accountValue)}
            sub={`Wallet ${fmt.usd(WALLET_BALANCE_USD)} ${totalPnlUSD >= 0 ? "+" : ""}${fmt.usd(totalPnlUSD)} uPnL`}
            size="lg"
          />
          <StatCard
            label="Total Unrealized PnL"
            value={(totalPnlUSD >= 0 ? "+" : "") + fmt.usd(Math.abs(totalPnlUSD))}
            sub={fmt.pct(totalPnlPct) + " ROI"}
            color={pnlColor}
            size="lg"
          />
          <StatCard
            label="Total Margin"
            value={fmt.usd(totalMarginUSD)}
            sub={`Position Size ${fmt.usd(totalNotionalUSD)}`}
          />
          <StatCard
            label="Positions"
            value={String(rows.length)}
            sub={`${cryptoRows.length} crypto · ${stockRows.length} stock`}
          />
        </div>

        {/* Asset class breakdown */}
        {(cryptoRows.length > 0 || stockRows.length > 0) && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            {cryptoRows.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #ebedf2", borderRadius: 12, padding: "14px 18px", flex: "1 1 300px" }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>🪙 Crypto</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>{fmt.usd(cryptoMargin)}</div>
                    <div style={{ fontSize: 11, color: "#8b8fa3" }}>Margin used</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: cryptoPnL >= 0 ? "#16a34a" : "#dc2626" }}>
                      {(cryptoPnL >= 0 ? "+" : "") + fmt.usd(Math.abs(cryptoPnL))}
                    </div>
                    <div style={{ fontSize: 11, color: cryptoPnL >= 0 ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                      {fmt.pct(cryptoMargin > 0 ? (cryptoPnL / cryptoMargin) * 100 : 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {stockRows.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid #ebedf2", borderRadius: 12, padding: "14px 18px", flex: "1 1 300px" }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>📊 Stock</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>{fmt.usd(stockMargin)}</div>
                    <div style={{ fontSize: 11, color: "#8b8fa3" }}>Margin used</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: stockPnL >= 0 ? "#16a34a" : "#dc2626" }}>
                      {(stockPnL >= 0 ? "+" : "") + fmt.usd(Math.abs(stockPnL))}
                    </div>
                    <div style={{ fontSize: 11, color: stockPnL >= 0 ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                      {fmt.pct(stockMargin > 0 ? (stockPnL / stockMargin) * 100 : 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add position */}
        {showAdd ? (
          <AddPositionForm onAdd={addPosition} onCancel={() => setShowAdd(false)} />
        ) : (
          <button onClick={() => setShowAdd(true)} style={{
            background: "#fff", color: "#4f46e5", border: "1px dashed #c7d2fe",
            borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", marginBottom: 16, width: "100%",
          }}>+ Add Position (browser only, not saved to GitHub)</button>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#8b8fa3", fontSize: 14 }}>Loading prices...</div>
        ) : rows.length === 0 ? (
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid #ebedf2",
            padding: 48, textAlign: "center", color: "#8b8fa3", fontSize: 14,
          }}>
            No positions yet. Click "Add Position" above or hardcode in PortfolioDashboard.jsx.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #ebedf2", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={{ ...thL, minWidth: 100 }}>Asset</th>
                    <th style={thC}>Side</th>
                    <th style={thC}>Leverage</th>
                    <th style={th}>Qty</th>
                    <th style={th}>Entry</th>
                    <th style={th}>Mark</th>
                    <th style={th}>Liq. Price</th>
                    <th style={th}>Margin</th>
                    <th style={th}>PnL (ROI)</th>
                    <th style={thC}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ pos, calc }) => (
                    <PositionRow key={pos._key} pos={pos} calc={calc}
                      onDelete={deletePosition} editable={pos._editable} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: "#b0b4c0" }}>
          Size × Entry = Notional · Margin = Notional / Leverage · PnL = (Mark−Entry) × Size · ROI = PnL / Margin
          <br />Prices: CoinGecko + Yahoo Finance · Auto-refresh 60s · Liquidation = simple (maintenance margin ignored)
        </div>
      </div>
    </div>
  );
}
