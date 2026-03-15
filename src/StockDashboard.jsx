import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";

/* ── Ticker Rows ── */
const TICKER_ROW1 = [
  { symbol: "^DJI", label: "Dow 30" }, { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" }, { symbol: "^RUT", label: "Russell 2000" },
  { symbol: "^VIX", label: "VIX" }, { symbol: "GC=F", label: "Gold" },
  { symbol: "SI=F", label: "Silver" }, { symbol: "CL=F", label: "Crude Oil" },
];
const TICKER_ROW2 = [
  { symbol: "YM=F", label: "Dow Futures" }, { symbol: "ES=F", label: "S&P Futures" },
  { symbol: "NQ=F", label: "Nasdaq Futures" }, { symbol: "^KS11", label: "KOSPI" },
  { symbol: "^KQ11", label: "KOSDAQ" }, { symbol: "KRW=X", label: "KRW/USD" },
  { symbol: "399001.SZ", label: "Shenzhen" }, { symbol: "^HSI", label: "Hang Seng" },
];
const ALL_TICKERS = [...TICKER_ROW1, ...TICKER_ROW2];

/* ── Stock List (US + HK) ── */
const STOCKS = [
  { symbol: "NVDA",  name: "NVIDIA",                   flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "AAPL",  name: "Apple",                     flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "GOOGL", name: "Alphabet",                  flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "MSFT",  name: "Microsoft",                 flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "AMZN",  name: "Amazon",                    flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "META",  name: "Meta Platforms",             flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "TSLA",  name: "Tesla",                     flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "TSM",   name: "TSMC",                      flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "BRK-B", name: "Berkshire Hathaway",         flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "AVGO",  name: "Broadcom",                  flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "LLY",   name: "Eli Lilly",                 flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "WMT",   name: "Walmart",                   flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "JPM",   name: "JPMorgan Chase",            flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "V",     name: "Visa",                      flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "MA",    name: "Mastercard",                flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "UNH",   name: "UnitedHealth",              flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "XOM",   name: "Exxon Mobil",               flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "COST",  name: "Costco",                    flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "JNJ",   name: "Johnson & Johnson",         flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "ASML",  name: "ASML",                      flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "FRMI",  name: "Fermi Inc.",                 flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "STSS",  name: "Sharps Technology",          flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "ALTS",  name: "ALT5 Sigma",                flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "MSTR",  name: "MicroStrategy",             flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "BMNR",  name: "Bitmine Immersion",          flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "SBET",  name: "SharpLink Gaming",           flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "CRCL",  name: "Circle Internet",            flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "LUNR",  name: "Intuitive Machines",         flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "GME",   name: "GameStop",                  flag: "\u{1F1FA}\u{1F1F8}" },
  { symbol: "0100.HK", name: "MiniMax",                 flag: "\u{1F1ED}\u{1F1F0}" },
  { symbol: "0728.HK", name: "China Telecom",           flag: "\u{1F1ED}\u{1F1F0}" },
];

const LOGO_DOMAINS = {
  NVDA:"nvidia.com",AAPL:"apple.com",GOOGL:"abc.xyz",MSFT:"microsoft.com",
  AMZN:"amazon.com",META:"meta.com",TSLA:"tesla.com",TSM:"tsmc.com",
  "BRK-B":"berkshirehathaway.com",AVGO:"broadcom.com",LLY:"lilly.com",
  WMT:"walmart.com",JPM:"jpmorganchase.com",V:"visa.com",MA:"mastercard.com",
  UNH:"unitedhealthgroup.com",XOM:"exxonmobil.com",COST:"costco.com",
  JNJ:"jnj.com",ASML:"asml.com",MSTR:"microstrategy.com",
  CRCL:"circle.com",LUNR:"intuitivemachines.com",GME:"gamestop.com",
};

/* ── Formatters ── */
const fmt = {
  price(p) {
    if (p == null || p === 0) return "\u2014";
    if (Math.abs(p) >= 1000) return "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (Math.abs(p) >= 1) return "$" + p.toFixed(2);
    return "$" + p.toFixed(4);
  },
  idx(p) { return p == null ? "\u2014" : p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },
  mcap(m) {
    if (m == null) return "\u2014";
    if (m >= 1e12) return "$" + (m / 1e12).toFixed(2) + "T";
    if (m >= 1e9) return "$" + (m / 1e9).toFixed(1) + "B";
    if (m >= 1e6) return "$" + (m / 1e6).toFixed(0) + "M";
    return "$" + m.toLocaleString();
  },
  pct(v) { return v == null ? "\u2014" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%"; },
  change(v) { return v == null ? "" : (v >= 0 ? "+" : "") + v.toFixed(2); },
};

/* ── MiniSpark (ticker) ── */
function MiniSpark({ data, width = 44, height = 18 }) {
  if (!data || data.filter(v => v != null).length < 3) return <div style={{ width, height }} />;
  const cl = data.filter(v => v != null);
  const mn = Math.min(...cl), mx = Math.max(...cl), r = mx - mn || 1;
  const up = cl[cl.length - 1] >= cl[0];
  const pts = cl.map((v, i) => ((i / (cl.length - 1)) * width).toFixed(1) + "," + (height - ((v - mn) / r) * (height - 2) - 1).toFixed(1)).join(" ");
  return <svg width={width} height={height} style={{ display: "block", flexShrink: 0 }}><polyline points={pts} fill="none" stroke={up ? "#16a34a" : "#dc2626"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/* ── Spark30D (table) ── */
function Spark30D({ data, width = 90, height = 28 }) {
  if (!data || data.filter(v => v != null).length < 3) return null;
  const cl = data.filter(v => v != null);
  const mn = Math.min(...cl), mx = Math.max(...cl), r = mx - mn || 1;
  const up = cl[cl.length - 1] >= cl[0];
  const color = up ? "#16a34a" : "#dc2626";
  const pts = cl.map((v, i) => ((i / (cl.length - 1)) * width).toFixed(1) + "," + (height - ((v - mn) / r) * (height - 4) - 2).toFixed(1)).join(" ");
  const gId = "sg" + Math.random().toString(36).slice(2, 6);
  const fp = pts + ` ${width},${height} 0,${height}`;
  return <svg width={width} height={height} style={{ display: "block" }}><defs><linearGradient id={gId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs><polygon points={fp} fill={`url(#${gId})`} /><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/* ── DailyCandle ── */
function DailyCandle({ open, close, high, low }) {
  if (open == null || close == null || high == null || low == null) return null;
  const up = close >= open, color = up ? "#16a34a" : "#dc2626";
  const W = 14, H = 26, r = high - low || 1;
  const bTop = H - ((Math.max(open, close) - low) / r) * (H - 4) - 2;
  const bBot = H - ((Math.min(open, close) - low) / r) * (H - 4) - 2;
  const wTop = H - ((high - low) / r) * (H - 4) - 2;
  const bH = Math.max(bBot - bTop, 1.5);
  return <svg width={W} height={H} style={{ display: "block", flexShrink: 0 }}><line x1={W / 2} y1={wTop} x2={W / 2} y2={H - 2} stroke={color} strokeWidth="1" /><rect x={3} y={bTop} width={W - 6} height={bH} fill={color} rx="1" /></svg>;
}

/* ── CompanyLogo ── */
function CompanyLogo({ symbol, name }) {
  const [src, setSrc] = useState(0);
  const domain = LOGO_DOMAINS[symbol];
  const urls = [domain ? `https://cdn.tickerlogos.com/${domain}` : null, `https://eodhd.com/img/logos/US/${symbol}.png`].filter(Boolean);
  if (src >= urls.length) return <div style={{ width: 28, height: 28, borderRadius: 6, background: "#f0f1f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#888", flexShrink: 0 }}>{symbol.slice(0, 3)}</div>;
  return <img src={urls[src]} alt={name} width={28} height={28} style={{ borderRadius: 6, flexShrink: 0, background: "#fff", objectFit: "contain" }} onError={() => setSrc(p => p + 1)} />;
}

/* ── CompanyCell with hover-pin ── */
function CompanyCell({ row, isPinned, onTogglePin }) {
  const [hovered, setHovered] = useState(false);
  return (
    <td style={{ padding: "12px 8px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <CompanyLogo symbol={row.symbol} name={row.name} />
          {(hovered || isPinned) && (
            <button onClick={(e) => { e.stopPropagation(); onTogglePin(row.symbol); }}
              title={isPinned ? "Unpin" : "Pin to top"}
              style={{
                position: "absolute", top: -6, left: -6,
                width: 18, height: 18, borderRadius: "50%",
                background: isPinned ? "#6366f1" : "#fff",
                border: isPinned ? "none" : "1px solid #ddd",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", padding: 0, fontSize: 10, lineHeight: 1,
                color: isPinned ? "#fff" : "#999",
                transition: "all .15s",
              }}>
              {"\uD83D\uDCCC"}
            </button>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>{row.name}</div>
          <div style={{ fontSize: 10, color: "#8b8fa3", fontWeight: 500 }}>{row.symbol}</div>
        </div>
      </div>
    </td>
  );
}

/* ── TickerCard ── */
function TickerCard({ item, quote, sparkData }) {
  const price = quote?.regularMarketPrice ?? null;
  const change = quote?.regularMarketChange ?? null;
  const changePct = quote?.regularMarketChangePercent ?? null;
  const pos = (change ?? 0) >= 0, color = pos ? "#22c55e" : "#ef4444", arrow = pos ? "\u25B2" : "\u25BC";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", flex: "1 1 0%", minWidth: 0, borderRight: "1px solid #2d2d44", cursor: "default", transition: "background .15s", overflow: "hidden" }}
      onMouseEnter={e => e.currentTarget.style.background = "#252542"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#8888aa", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#eee", marginBottom: 1 }}>{price != null ? fmt.idx(price) : "\u2014"}</div>
        <div style={{ fontSize: 9, fontWeight: 600, color, display: "flex", alignItems: "center", gap: 2, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 6 }}>{change != null ? arrow : ""}</span><span>{fmt.change(change)}</span><span>({fmt.pct(changePct)})</span>
        </div>
      </div>
      <MiniSpark data={sparkData} />
    </div>
  );
}

/* ── TickerBanner ── */
function TickerBanner({ tickerData, sparklines }) {
  const renderRow = (items) => <div style={{ display: "flex", width: "100%" }}>{items.map(item => <TickerCard key={item.symbol} item={item} quote={tickerData[item.symbol]} sparkData={sparklines[item.symbol]} />)}</div>;
  return (
    <div style={{ background: "#1a1a2e", borderRadius: 10, overflow: "hidden", marginBottom: 20, border: "1px solid #252547" }}>
      <div style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <style>{`.tb-s::-webkit-scrollbar{display:none}`}</style>
        <div className="tb-s" style={{ minWidth: 900 }}>{renderRow(TICKER_ROW1)}<div style={{ borderTop: "1px solid #2d2d44" }} />{renderRow(TICKER_ROW2)}</div>
      </div>
    </div>
  );
}

/* ── PctCell ── */
function PctCell({ value }) {
  if (value == null) return <td style={{ ...tdR, color: "#aaa" }}>{"\u2014"}</td>;
  const pos = value >= 0;
  return <td style={tdR}><span style={{ color: pos ? "#16a34a" : "#dc2626", background: pos ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)", padding: "3px 8px", borderRadius: 5, fontSize: 12, fontWeight: 600, display: "inline-block", minWidth: 66, textAlign: "center" }}>{fmt.pct(value)}</span></td>;
}

/* ── DailyCell ── */
function DailyCell({ row }) {
  if (row.changePct == null) return <td style={{ ...tdR, color: "#aaa" }}>{"\u2014"}</td>;
  const pos = row.changePct >= 0;
  return <td style={tdR}><div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}><DailyCandle open={row.open} close={row.price} high={row.high} low={row.low} /><span style={{ color: pos ? "#16a34a" : "#dc2626", background: pos ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)", padding: "3px 8px", borderRadius: 5, fontSize: 12, fontWeight: 600, display: "inline-block", minWidth: 66, textAlign: "center" }}>{fmt.pct(row.changePct)}</span></div></td>;
}

const tdR = { padding: "12px 8px", textAlign: "right", fontSize: 13, color: "#374151" };

/* ═══════════════════ MAIN ═══════════════════ */
export default function StockDashboard() {
  const [tickerData, setTickerData] = useState({});
  const [sparklines, setSparklines] = useState({});
  const [stockRows, setStockRows] = useState([]);
  const [stockSpark, setStockSpark] = useState({});
  const [pinnedSymbols, setPinnedSymbols] = useState(() => { try { return JSON.parse(localStorage.getItem("pinned_stocks") || "[]"); } catch { return []; } });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [updated, setUpdated] = useState(null);
  const [auto, setAuto] = useState(true);
  const timer = useRef(null);

  const togglePin = (symbol) => {
    setPinnedSymbols(prev => {
      const next = prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol];
      try { localStorage.setItem("pinned_stocks", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const displayRows = React.useMemo(() => {
    const withRank = stockRows.map((r, i) => ({ ...r, rank: i + 1 }));
    const pinned = withRank.filter(r => pinnedSymbols.includes(r.symbol));
    const unpinned = withRank.filter(r => !pinnedSymbols.includes(r.symbol));
    return [...pinned, ...unpinned];
  }, [stockRows, pinnedSymbols]);

  const fetchAll = useCallback(async () => {
    try {
      setErr(null);
      const allSymbols = [...ALL_TICKERS.map(i => i.symbol), ...STOCKS.map(s => s.symbol)].join(",");
      let quotes = [];
      try { const res = await fetch("/api/stocks?type=quote&symbols=" + encodeURIComponent(allSymbols)); const json = await res.json(); quotes = json?.quoteResponse?.result || []; } catch {}

      if (quotes.length === 0) {
        try {
          const res = await fetch("/api/stocks?type=chart&symbols=" + encodeURIComponent(allSymbols) + "&range=1mo&interval=1d");
          const cd = await res.json();
          const tMap = {}, spMap = {}, stSpMap = {};
          ALL_TICKERS.forEach(item => { const c = cd[item.symbol]; if (!c) return; const cl = c.indicators?.quote?.[0]?.close?.filter(v => v != null) || []; spMap[item.symbol] = cl; const prev = cl.length >= 2 ? cl[cl.length - 2] : null; const last = cl[cl.length - 1] || null; if (last) tMap[item.symbol] = { regularMarketPrice: last, regularMarketChange: prev ? last - prev : null, regularMarketChangePercent: prev ? ((last - prev) / prev) * 100 : null }; });
          setTickerData(tMap); setSparklines(spMap);
          const rows = STOCKS.map(m => { const c = cd[m.symbol]; if (!c) return { symbol: m.symbol, name: m.name, flag: m.flag, price: null, marketCap: null, changePct: null, change7d: null, change30d: null, open: null, high: null, low: null }; const q = c.indicators?.quote?.[0] || {}; const cl = (q.close || []).filter(v => v != null); const op = (q.open || []).filter(v => v != null); const hi = (q.high || []).filter(v => v != null); const lo = (q.low || []).filter(v => v != null); const last = cl[cl.length - 1] || null; const prev = cl.length >= 2 ? cl[cl.length - 2] : null; const p7 = cl.length >= 6 ? cl[cl.length - 6] : null; const p30 = cl[0] || null; stSpMap[m.symbol] = cl; return { symbol: m.symbol, name: m.name, flag: m.flag, price: last, marketCap: null, changePct: prev ? ((last - prev) / prev) * 100 : null, change7d: p7 ? ((last - p7) / p7) * 100 : null, change30d: p30 ? ((last - p30) / p30) * 100 : null, open: op[op.length - 1] || null, high: hi[hi.length - 1] || null, low: lo[lo.length - 1] || null }; });
          setStockRows(rows); setStockSpark(stSpMap); setUpdated(new Date()); setLoading(false); return;
        } catch (e) { setErr("Failed: " + e.message); setLoading(false); return; }
      }

      const tMap = {}; const ts = new Set(ALL_TICKERS.map(i => i.symbol));
      quotes.forEach(q => { if (ts.has(q.symbol)) tMap[q.symbol] = q; });
      setTickerData(tMap);

      const ss = new Set(STOCKS.map(s => s.symbol));
      const rows = [];
      quotes.forEach(q => { if (!ss.has(q.symbol)) return; const m = STOCKS.find(s => s.symbol === q.symbol); rows.push({ symbol: q.symbol, name: m?.name || q.shortName || q.symbol, flag: m?.flag || "\u{1F3F3}", price: q.regularMarketPrice, marketCap: q.marketCap, changePct: q.regularMarketChangePercent, change7d: null, change30d: null, open: q.regularMarketOpen, high: q.regularMarketDayHigh, low: q.regularMarketDayLow }); });
      rows.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
      setStockRows(rows); setUpdated(new Date()); setLoading(false);
      fetchChartData(rows);
    } catch (e) { setErr("Error: " + e.message); setLoading(false); }
  }, []);

  const fetchChartData = useCallback(async (rows) => {
    try {
      const allSym = [...ALL_TICKERS.map(i => i.symbol), ...rows.map(r => r.symbol)].join(",");
      const res = await fetch("/api/stocks?type=chart&symbols=" + encodeURIComponent(allSym) + "&range=1mo&interval=1d");
      const cd = await res.json();
      const spMap = {}, stSpMap = {};
      ALL_TICKERS.forEach(item => { const c = cd[item.symbol]; if (!c) return; spMap[item.symbol] = c.indicators?.quote?.[0]?.close?.filter(v => v != null) || []; });
      setSparklines(spMap);
      setStockRows(prev => {
        const u = [...prev];
        for (const r of u) { const c = cd[r.symbol]; if (!c) continue; const cl = c.indicators?.quote?.[0]?.close?.filter(v => v != null) || []; stSpMap[r.symbol] = cl; if (cl.length < 2 || !r.price) continue; const p7 = cl.length >= 6 ? cl[cl.length - 6] : null; const p30 = cl[0] || null; if (p7) r.change7d = ((r.price - p7) / p7) * 100; if (p30) r.change30d = ((r.price - p30) / p30) * 100; }
        return u;
      });
      setStockSpark(stSpMap);
    } catch {}
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (auto) timer.current = setInterval(fetchAll, 120000); return () => { if (timer.current) clearInterval(timer.current); }; }, [auto, fetchAll]);

  const th = { padding: "10px 8px", textAlign: "right", fontSize: 10, color: "#8b8fa3", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid #ebedf2", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#fff", zIndex: 1 };
  const thL = { ...th, textAlign: "left" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f8", color: "#111", fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#1a1a2e", letterSpacing: -0.5 }}>Stock Dashboard</h1>
            <div style={{ fontSize: 12, color: "#8b8fa3", marginTop: 4 }}>Realtime Stock List &middot; Yahoo Finance</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "#8b8fa3" }}>
            {updated && <span>{updated.toLocaleTimeString("en-US")}</span>}
            <button onClick={fetchAll} style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Refresh</button>
            <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} style={{ accentColor: "#1a1a2e" }} /> Auto 2min</label>
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
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
                <thead>
                  <tr>
                    <th style={{ ...thL, width: 32, textAlign: "center", padding: "10px 4px" }}>#</th>
                    <th style={{ ...thL, width: 28, textAlign: "center", padding: "10px 2px" }}></th>
                    <th style={{ ...thL, minWidth: 170 }}>Company</th>
                    <th style={th}>Mcap</th>
                    <th style={th}>Price</th>
                    <th style={th}>Daily</th>
                    <th style={th}>7D</th>
                    <th style={th}>30D</th>
                    <th style={{ ...th, textAlign: "center", minWidth: 100 }}>Last 30 Days</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r) => {
                    const isPinned = pinnedSymbols.includes(r.symbol);
                    return (
                      <tr key={r.symbol} style={{ borderBottom: "1px solid #f3f4f6", transition: "background .12s", background: isPinned ? "rgba(99,102,241,0.04)" : "#fff" }}
                        onMouseEnter={e => e.currentTarget.style.background = isPinned ? "rgba(99,102,241,0.07)" : "#fafbfc"}
                        onMouseLeave={e => e.currentTarget.style.background = isPinned ? "rgba(99,102,241,0.04)" : "#fff"}>
                        <td style={{ padding: "12px 4px", textAlign: "center", fontSize: 11, color: "#b0b4c0", fontWeight: 600 }}>{r.rank}</td>
                        <td style={{ padding: "12px 2px", textAlign: "center", fontSize: 14 }}>{r.flag}</td>
                        <CompanyCell row={r} isPinned={isPinned} onTogglePin={togglePin} />
                        <td style={{ ...tdR, color: "#666", fontSize: 12 }}>{fmt.mcap(r.marketCap)}</td>
                        <td style={{ ...tdR, fontWeight: 700, color: "#1a1a2e", fontSize: 14 }}>{fmt.price(r.price)}</td>
                        <DailyCell row={r} />
                        <PctCell value={r.change7d} />
                        <PctCell value={r.change30d} />
                        <td style={{ padding: "12px 8px", textAlign: "center" }}><Spark30D data={stockSpark[r.symbol]} /></td>
                      </tr>
                    );
                  })}
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
