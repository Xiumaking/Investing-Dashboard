import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";

/* ═══════════════════════════════════════════════
   HARDCODED POSITIONS (edit here on GitHub)
   ─────────────────────────────────────────
   assetType: "crypto" or "stock"
   symbol: CoinGecko id (crypto) or Yahoo symbol (stock)
   display: short ticker for UI
   side: "long" or "short"
   avg: entry price (in the asset's native currency)
   notional: position size in USD (for crypto) or native currency (for stock)
   leverage: 1 for spot, >1 for margin/futures
   ─────────────────────────────────────────
═══════════════════════════════════════════════ */
const HARDCODED_POSITIONS = [
  {
    assetType: "crypto",
    symbol: "worldcoin-wld",
    display: "WLD",
    side: "long",
    avg: 0.2827851,
    notional: 4838.64,
    leverage: 3,
    mode: "cross",
  },
];

/* Wallet / account balance (USD) */
const WALLET_BALANCE_USD = 8073.08;

/* Symbols used by Stock Dashboard — for fetching current prices of stock positions */
const STOCK_NATIVE_CURRENCY = {
  ".KS": "KRW", ".KQ": "KRW", ".HK": "HKD", ".SS": "CNY", ".SZ": "CNY",
};

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
    return "$" + v.toFixed(6);
  },
  qty(v) {
    if (v == null) return "—";
    if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
    return v.toFixed(4);
  },
};

/* ── PnL math ── */
function computePosition(pos, currentPrice, fxRates) {
  if (!currentPrice || !pos.avg) return null;

  // Size = notional / avg price
  const size = pos.notional / pos.avg;
  const isLong = pos.side === "long";

  // Current position value in native currency
  const currentValue = size * currentPrice;

  // PnL in native currency
  const pnlNative = isLong
    ? (currentPrice - pos.avg) * size
    : (pos.avg - currentPrice) * size;

  // PnL% based on margin (actual capital at risk)
  const margin = pos.notional / pos.leverage;
  const pnlPct = (pnlNative / margin) * 100 * (isLong ? 1 : 1);

  // Liquidation price (simple formula)
  const liqPrice = isLong
    ? pos.avg * (1 - 1 / pos.leverage)
    : pos.avg * (1 + 1 / pos.leverage);

  // Convert to USD if needed
  const fx = pos.assetType === "stock" ? getStockFx(pos.symbol, fxRates) : 1;
  const notionalUSD = pos.notional / fx;
  const currentValueUSD = currentValue / fx;
  const pnlUSD = pnlNative / fx;
  const marginUSD = margin / fx;

  return {
    size,
    currentPrice,
    currentValue,
    currentValueUSD,
    pnlNative,
    pnlUSD,
    pnlPct,
    margin,
    marginUSD,
    notionalUSD,
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
  if (!symbols.length) return { quotes: {}, fx: {} };
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

/* ── Components ── */
function StatCard({ label, value, sub, color, size = "md" }) {
  return (
    <div style={{
      background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: 12,
      padding: "14px 18px", flex: "1 1 180px", minWidth: 160,
    }}>
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{
        fontSize: size === "lg" ? 22 : 18,
        fontWeight: 800,
        color: color || "#1a1a2e",
        marginTop: 4,
        letterSpacing: -0.3,
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{pos.display}</div>
            <div style={{ fontSize: 10, color: "#8b8fa3", textTransform: "uppercase" }}>
              {pos.assetType}
            </div>
          </div>
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
        {fmt.qty(calc?.size)}
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
        {calc ? fmt.usd(calc.marginUSD) : "—"}
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
    avg: "", notional: "", leverage: "1", mode: "cross",
  });

  const submit = () => {
    if (!form.symbol || !form.avg || !form.notional) {
      alert("symbol, 평단가, notional은 필수입니다.");
      return;
    }
    onAdd({
      assetType: form.assetType,
      symbol: form.symbol.trim(),
      display: (form.display || form.symbol).trim().toUpperCase(),
      side: form.side,
      avg: parseFloat(form.avg),
      notional: parseFloat(form.notional),
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
          <label style={labelStyle}>Avg price</label>
          <input type="number" step="any" placeholder="0.28" value={form.avg}
            onChange={e => setForm({ ...form, avg: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Notional ({form.assetType === "crypto" ? "USD" : "local"})</label>
          <input type="number" step="any" placeholder="4838.64" value={form.notional}
            onChange={e => setForm({ ...form, notional: e.target.value })} style={inputStyle} />
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
    try { return JSON.parse(localStorage.getItem("user_positions") || "[]"); }
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
    try { localStorage.setItem("user_positions", JSON.stringify(next)); } catch {}
    setShowAdd(false);
  };

  const deletePosition = (key) => {
    if (!key.startsWith("user_")) return;
    const idx = parseInt(key.split("_")[1]);
    const next = userPositions.filter((_, i) => i !== idx);
    setUserPositions(next);
    try { localStorage.setItem("user_positions", JSON.stringify(next)); } catch {}
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

  // Compute each position
  const rows = allPositions.map(pos => {
    const priceKey = pos.assetType + ":" + pos.symbol;
    const curPrice = prices[priceKey];
    return { pos, calc: computePosition(pos, curPrice, fxRates) };
  });

  // Totals
  const totalMarginUSD = rows.reduce((s, r) => s + (r.calc?.marginUSD || 0), 0);
  const totalPnlUSD = rows.reduce((s, r) => s + (r.calc?.pnlUSD || 0), 0);
  const totalNotionalUSD = rows.reduce((s, r) => s + (r.calc?.notionalUSD || 0), 0);
  const accountValue = WALLET_BALANCE_USD + totalPnlUSD;
  const totalPnlPct = totalMarginUSD > 0 ? (totalPnlUSD / totalMarginUSD) * 100 : 0;

  // By asset class
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
              Realtime PnL · All values in USD
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
            label="Account Value"
            value={fmt.usd(accountValue)}
            sub={`Wallet ${fmt.usd(WALLET_BALANCE_USD)} ${totalPnlUSD >= 0 ? "+" : ""}${fmt.usd(totalPnlUSD)} uPnL`}
            size="lg"
          />
          <StatCard
            label="Total Unrealized PnL"
            value={(totalPnlUSD >= 0 ? "+" : "") + fmt.usd(Math.abs(totalPnlUSD))}
            sub={fmt.pct(totalPnlPct)}
            color={pnlColor}
            size="lg"
          />
          <StatCard
            label="Total Margin Used"
            value={fmt.usd(totalMarginUSD)}
            sub={`Notional ${fmt.usd(totalNotionalUSD)}`}
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

        {/* Add position button / form */}
        {showAdd ? (
          <AddPositionForm onAdd={addPosition} onCancel={() => setShowAdd(false)} />
        ) : (
          <button onClick={() => setShowAdd(true)} style={{
            background: "#fff", color: "#4f46e5", border: "1px dashed #c7d2fe",
            borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", marginBottom: 16, width: "100%",
          }}>+ Add Position (browser only, not saved to GitHub)</button>
        )}

        {/* Positions table */}
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
                    <th style={th}>Size</th>
                    <th style={th}>Avg Price</th>
                    <th style={th}>Current</th>
                    <th style={th}>Liq. Price</th>
                    <th style={th}>Margin</th>
                    <th style={th}>Unrealized PnL</th>
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
          Prices: CoinGecko + Yahoo Finance · Auto-refresh 60s · Liquidation = simple formula (maintenance margin ignored)
        </div>
      </div>
    </div>
  );
}
