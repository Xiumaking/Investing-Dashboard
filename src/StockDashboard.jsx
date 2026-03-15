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

/* ── Top 20 Stocks ── */
const TOP_STOCKS = [
  { symbol: "NVDA", name: "NVIDIA" }, { symbol: "AAPL", name: "Apple" },
  { symbol: "GOOGL", name: "Alphabet" }, { symbol: "MSFT", name: "Microsoft" },
  { symbol: "AMZN", name: "Amazon" }, { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla" }, { symbol: "TSM", name: "TSMC" },
  { symbol: "BRK-B", name: "Berkshire Hathaway" }, { symbol: "AVGO", name: "Broadcom" },
  { symbol: "LLY", name: "Eli Lilly" }, { symbol: "WMT", name: "Walmart" },
  { symbol: "JPM", name: "JPMorgan Chase" }, { symbol: "V", name: "Visa" },
  { symbol: "MA", name: "Mastercard" }, { symbol: "UNH", name: "UnitedHealth" },
  { symbol: "XOM", name: "Exxon Mobil" }, { symbol: "COST", name: "Costco" },
  { symbol: "JNJ", name: "Johnson & Johnson" }, { symbol: "ASML", name: "ASML" },
];

const LOGO_DOMAINS = {
  NVDA:"nvidia.com",AAPL:"apple.com",GOOGL:"abc.xyz",MSFT:"microsoft.com",
  AMZN:"amazon.com",META:"meta.com",TSLA:"tesla.com",TSM:"tsmc.com",
  "BRK-B":"berkshirehathaway.com",AVGO:"broadcom.com",LLY:"lilly.com",
  WMT:"walmart.com",JPM:"jpmorganchase.com",V:"visa.com",MA:"mastercard.com",
  UNH:"unitedhealthgroup.com",XOM:"exxonmobil.com",COST:"costco.com",
  JNJ:"jnj.com",ASML:"asml.com",
};

/* ── Colors ── */
const C = {
  bg: "#0d0d1a", card: "#14142b", cardHover: "#1c1c3a", border: "#252547",
  text: "#e4e4f0", textDim: "#7a7a9e", green: "#22c55e", red: "#ef4444",
  greenBg: "rgba(34,197,94,0.1)", redBg: "rgba(239,68,68,0.1)",
  accent: "#6366f1", white: "#fff",
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

/* ── Mini Sparkline (ticker) ── */
function MiniSpark({ data, width = 44, height = 18 }) {
  if (!data || data.filter(v => v != null).length < 3) return <div style={{ width, height }} />;
  const cl = data.filter(v => v != null);
  const mn = Math.min(...cl), mx = Math.max(...cl), r = mx - mn || 1;
  const up = cl[cl.length - 1] >= cl[0];
  const pts = cl.map((v, i) => ((i / (cl.length - 1)) * width).toFixed(1) + "," + (height - ((v - mn) / r) * (height - 2) - 1).toFixed(1)).join(" ");
  return <svg width={width} height={height} style={{ display: "block", flexShrink: 0 }}><polyline points={pts} fill="none" stroke={up ? C.green : C.red} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/* ── 30D Sparkline (table) ── */
function Spark30D({ data, width = 90, height = 28 }) {
  if (!data || data.filter(v => v != null).length < 3) return null;
  const cl = data.filter(v => v != null);
  const mn = Math.min(...cl), mx = Math.max(...cl), r = mx - mn || 1;
  const up = cl[cl.length - 1] >= cl[0];
  const color = up ? C.green : C.red;
  const pts = cl.map((v, i) => ((i / (cl.length - 1)) * width).toFixed(1) + "," + (height - ((v - mn) / r) * (height - 4) - 2).toFixed(1)).join(" ");
  const gradId = "sg" + Math.random().toString(36).slice(2, 6);
  const fillPts = pts + ` ${width},${height} 0,${height}`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs><linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={fillPts} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Daily Candle ── */
function DailyCandle({ open, close, high, low }) {
  if (open == null || close == null || high == null || low == null) return null;
  const up = close >= open;
  const color = up ? C.green : C.red;
  const W = 14, H = 26, r = high - low || 1;
  const bTop = H - ((Math.max(open, close) - low) / r) * (H - 4) - 2;
  const bBot = H - ((Math.min(open, close) - low) / r) * (H - 4) - 2;
  const wTop = H - ((high - low) / r) * (H - 4) - 2;
  const bH = Math.max(bBot - bTop, 1.5);
  return <svg width={W} height={H} style={{ display: "block", flexShrink: 0 }}><line x1={W/2} y1={wTop} x2={W/2} y2={H-2} stroke={color} strokeWidth="1" /><rect x={3} y={bTop} width={W-6} height={bH} fill={color} rx="1" /></svg>;
}

/* ── Company Logo ── */
function CompanyLogo({ symbol, name }) {
  const [src, setSrc] = useState(0);
  const domain = LOGO_DOMAINS[symbol];
  const urls = [domain ? `https://cdn.tickerlogos.com/${domain}` : null, `https://eodhd.com/img/logos/US/${symbol}.png`].filter(Boolean);
  if (src >= urls.length) return <div style={{ width: 28, height: 28, borderRadius: 6, background: "#252547", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.textDim, flexShrink: 0 }}>{symbol.slice(0, 3)}</div>;
  return <img src={urls[src]} alt={name} width={28} height={28} style={{ borderRadius: 6, flexShrink: 0, background: "#1a1a2e", objectFit: "contain" }} onError={() => setSrc(p => p + 1)} />;
}

/* ── Pin Icon ── */
function PinIcon({ pinned, onClick }) {
  return (
    <button onClick={onClick} title={pinned ? "Unpin" : "Pin to top"} style={{
      background: "none", border: "none", cursor: "pointer", padding: 2,
      color: pinned ? C.accent : "#444466", fontSize: 14, lineHeight: 1,
      transition: "color .15s, transform .15s",
      transform: pinned ? "rotate(0deg)" : "rotate(45deg)",
    }}>
      {"\uD83D\uDCCC"}
    </button>
  );
}

/* ── Ticker Card ── */
function TickerCard({ item, quote, sparkData }) {
  const price = quote?.regularMarketPrice ?? null;
  const change = quote?.regularMarketChange ?? null;
  const changePct = quote?.regularMarketChangePercent ?? null;
  const pos = (change ?? 0) >= 0;
  const color = pos ? C.green : C.red;
  const arrow = pos ? "\u25B2" : "\u25BC";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", flex: "1 1 0%", minWidth: 0, borderRight: "1px solid " + C.border, cursor: "default", transition: "background .15s", overflow: "hidden" }}
      onMouseEnter={e => e.currentTarget.style.background = C.cardHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.textDim, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 1 }}>{price != null ? fmt.idx(price) : "\u2014"}</div>
        <div style={{ fontSize: 9, fontWeight: 600, color, display: "flex", alignItems: "center", gap: 2, whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 6 }}>{change != null ? arrow : ""}</span>
          <span>{fmt.change(change)}</span>
          <span>({fmt.pct(changePct)})</span>
        </div>
      </div>
      <MiniSpark data={sparkData} />
    </div>
  );
}

/* ── Ticker Banner ── */
function TickerBanner({ tickerData, sparklines }) {
  const renderRow = (items) => (
    <div style={{ display: "flex", width: "100%" }}>
      {items.map(item => <TickerCard key={item.symbol} item={item} quote={tickerData[item.symbol]} sparkData={sparklines[item.symbol]} />)}
    </div>
  );
  return (
    <div style={{ background: C.card, borderRadius: 10, overflow: "hidden", marginBottom: 20, border: "1px solid " + C.border }}>
      <div style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <style>{`.tb-s::-webkit-scrollbar{display:none}`}</style>
        <div className="tb-s" style={{ minWidth: 900 }}>
          {renderRow(TICKER_ROW1)}
          <div style={{ borderTop: "1px solid " + C.border }} />
          {renderRow(TICKER_ROW2)}
        </div>
      </div>
    </div>
  );
}

/* ── PctCell ── */
function PctCell({ value }) {
  if (value == null) return <td style={{ ...tdR, color: "#555" }}>{"\u2014"}</td>;
  const pos = value >= 0;
  return <td style={tdR}><span style={{ color: pos ? C.green : C.red, background: pos ? C.greenBg : C.redBg, padding: "3px 8px", borderRadius: 5, fontSize: 12, fontWeight: 600, display: "inline-block", minWidth: 66, textAlign: "center" }}>{fmt.pct(value)}</span></td>;
}

/* ── DailyCell ── */
function DailyCell({ row }) {
  if (row.changePct == null) return <td style={{ ...tdR, color: "#555" }}>{"\u2014"}</td>;
  const pos = row.changePct >= 0;
  return (
    <td style={tdR}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
        <DailyCandle open={row.open} close={row.price} high={row.high} low={row.low} />
        <span style={{ color: pos ? C.green : C.red, background: pos ? C.greenBg : C.redBg, padding: "3px 8px", borderRadius: 5, fontSize: 12, fontWeight: 600, display: "inline-block", minWidth: 66, textAlign: "center" }}>{fmt.pct(row.changePct)}</span>
      </div>
    </td>
  );
}

const tdR = { padding: "12px 8px", textAlign: "right", fontSize: 13, color: C.text };

/* ══════════════════════════════════════════════ */
export default function StockDashboard() {
  const [tickerData, setTickerData] = useState({});
  const [sparklines, setSparklines] = useState({});
  const [stockRows, setStockRows] = useState([]);
  const [stockSpark, setStockSpark] = useState({});
  const [pinnedSymbols, setPinnedSymbols] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pinned_stocks") || "[]"); } catch { return []; }
  });
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

  /* Sort: pinned first, then by original order */
  const sortedRows = [...stockRows].sort((a, b) => {
    const aPin = pinnedSymbols.includes(a.symbol) ? 0 : 1;
    const bPin = pinnedSymbols.includes(b.symbol) ? 0 : 1;
    if (aPin !== bPin) return aPin - bPin;
    return (b.marketCap || 0) - (a.marketCap || 0);
  });

  const fetchAll = useCallback(async () => {
    try {
      setErr(null);
      const allSymbols = [...ALL_TICKERS.map(i => i.symbol), ...TOP_STOCKS.map(s => s.symbol)].join(",");
      let quotes = [];
      try {
        const res = await fetch("/api/stocks?type=quote&symbols=" + encodeURIComponent(allSymbols));
        const json = await res.json();
        quotes = json?.quoteResponse?.result || [];
      } catch {}

      if (quotes.length === 0) {
        /* Fallback: chart only */
        try {
          const res = await fetch("/api/stocks?type=chart&symbols=" + encodeURIComponent(allSymbols) + "&range=1mo&interval=1d");
          const cd = await res.json();
          const tMap = {}, spMap = {}, stSpMap = {};
          ALL_TICKERS.forEach(item => { const c = cd[item.symbol]; if (!c) return; const cl = c.indicators?.quote?.[0]?.close?.filter(v=>v!=null)||[]; spMap[item.symbol]=cl; const prev=cl.length>=2?cl[cl.length-2]:null; const last=cl[cl.length-1]||null; if(last) tMap[item.symbol]={regularMarketPrice:last,regularMarketChange:prev?last-prev:null,regularMarketChangePercent:prev?((last-prev)/prev)*100:null}; });
          setTickerData(tMap); setSparklines(spMap);
          const rows = TOP_STOCKS.map(m => { const c=cd[m.symbol]; if(!c) return {symbol:m.symbol,name:m.name,price:null,marketCap:null,changePct:null,change7d:null,change30d:null,open:null,high:null,low:null}; const q=c.indicators?.quote?.[0]||{}; const cl=(q.close||[]).filter(v=>v!=null); const op=(q.open||[]).filter(v=>v!=null); const hi=(q.high||[]).filter(v=>v!=null); const lo=(q.low||[]).filter(v=>v!=null); const last=cl[cl.length-1]||null; const prev=cl.length>=2?cl[cl.length-2]:null; const p7=cl.length>=6?cl[cl.length-6]:null; const p30=cl[0]||null; stSpMap[m.symbol]=cl; return {symbol:m.symbol,name:m.name,price:last,marketCap:null,changePct:prev?((last-prev)/prev)*100:null,change7d:p7?((last-p7)/p7)*100:null,change30d:p30?((last-p30)/p30)*100:null,open:op[op.length-1]||null,high:hi[hi.length-1]||null,low:lo[lo.length-1]||null}; });
          setStockRows(rows); setStockSpark(stSpMap); setUpdated(new Date()); setLoading(false); return;
        } catch(e) { setErr("Failed: "+e.message); setLoading(false); return; }
      }

      /* Process v7 quotes */
      const tMap = {};
      const ts = new Set(ALL_TICKERS.map(i=>i.symbol));
      quotes.forEach(q => { if(ts.has(q.symbol)) tMap[q.symbol]=q; });
      setTickerData(tMap);

      const ss = new Set(TOP_STOCKS.map(s=>s.symbol));
      const rows = [];
      quotes.forEach(q => { if(!ss.has(q.symbol)) return; const m=TOP_STOCKS.find(s=>s.symbol===q.symbol); rows.push({symbol:q.symbol,name:m?.name||q.shortName||q.symbol,price:q.regularMarketPrice,marketCap:q.marketCap,changePct:q.regularMarketChangePercent,change7d:null,change30d:null,open:q.regularMarketOpen,high:q.regularMarketDayHigh,low:q.regularMarketDayLow}); });
      rows.sort((a,b)=>(b.marketCap||0)-(a.marketCap||0));
      setStockRows(rows); setUpdated(new Date()); setLoading(false);
      fetchChartData(rows);
    } catch(e) { setErr("Error: "+e.message); setLoading(false); }
  }, []);

  const fetchChartData = useCallback(async (rows) => {
    try {
      const allSym = [...ALL_TICKERS.map(i=>i.symbol), ...rows.map(r=>r.symbol)].join(",");
      const res = await fetch("/api/stocks?type=chart&symbols="+encodeURIComponent(allSym)+"&range=1mo&interval=1d");
      const cd = await res.json();
      const spMap = {}, stSpMap = {};
      ALL_TICKERS.forEach(item => { const c=cd[item.symbol]; if(!c) return; spMap[item.symbol]=c.indicators?.quote?.[0]?.close?.filter(v=>v!=null)||[]; });
      setSparklines(spMap);
      setStockRows(prev => {
        const u=[...prev];
        for(const r of u) { const c=cd[r.symbol]; if(!c) continue; const cl=c.indicators?.quote?.[0]?.close?.filter(v=>v!=null)||[]; stSpMap[r.symbol]=cl; if(cl.length<2||!r.price) continue; const p7=cl.length>=6?cl[cl.length-6]:null; const p30=cl[0]||null; if(p7) r.change7d=((r.price-p7)/p7)*100; if(p30) r.change30d=((r.price-p30)/p30)*100; }
        return u;
      });
      setStockSpark(stSpMap);
    } catch{}
  }, []);

  useEffect(()=>{fetchAll();},[fetchAll]);
  useEffect(()=>{
    if(auto) timer.current=setInterval(fetchAll,120000);
    return ()=>{if(timer.current) clearInterval(timer.current);};
  },[auto,fetchAll]);

  const th = { padding:"10px 8px", textAlign:"right", fontSize:10, color:C.textDim, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, borderBottom:"1px solid "+C.border, whiteSpace:"nowrap", position:"sticky", top:0, background:C.card, zIndex:1 };
  const thL = { ...th, textAlign:"left" };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:1400, margin:"0 auto", padding:"20px 16px" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, margin:0, color:C.text, letterSpacing:-0.5 }}>Stock Dashboard</h1>
            <div style={{ fontSize:12, color:C.textDim, marginTop:4 }}>Global Top 20 by Market Cap</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14, fontSize:12, color:C.textDim }}>
            {updated && <span>{updated.toLocaleTimeString("en-US")}</span>}
            <button onClick={fetchAll} style={{ background:C.accent, color:C.white, border:"none", borderRadius:6, padding:"6px 14px", fontSize:11, fontWeight:600, cursor:"pointer" }}>Refresh</button>
            <label style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}>
              <input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)} style={{ accentColor:C.accent }} /> Auto 2min
            </label>
          </div>
        </div>

        <TickerBanner tickerData={tickerData} sparklines={sparklines} />

        {err && <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:C.red, padding:"10px 16px", borderRadius:8, marginBottom:16, fontSize:13 }}>{err}</div>}

        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:C.textDim }}>
            <div style={{ textAlign:"center" }}><div style={{ fontSize:36, marginBottom:8 }}>{"\uD83D\uDCE1"}</div><p style={{ fontSize:14 }}>Loading market data...</p></div>
          </div>
        ) : (
          <div style={{ background:C.card, borderRadius:12, border:"1px solid "+C.border, overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:900 }}>
                <thead>
                  <tr>
                    <th style={{ ...thL, width:28, textAlign:"center", padding:"10px 4px" }}></th>
                    <th style={{ ...thL, width:32, textAlign:"center", padding:"10px 4px" }}>#</th>
                    <th style={{ ...thL, minWidth:180 }}>Company</th>
                    <th style={th}>Mcap</th>
                    <th style={th}>Price</th>
                    <th style={th}>Daily</th>
                    <th style={th}>7D</th>
                    <th style={th}>30D</th>
                    <th style={{ ...th, textAlign:"center", minWidth:100 }}>Last 30 Days</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((r, idx) => {
                    const isPinned = pinnedSymbols.includes(r.symbol);
                    return (
                      <tr key={r.symbol} style={{ borderBottom:"1px solid "+C.border, transition:"background .12s", background: isPinned ? "rgba(99,102,241,0.07)" : "transparent" }}
                        onMouseEnter={e => { if(!isPinned) e.currentTarget.style.background=C.cardHover; }}
                        onMouseLeave={e => { e.currentTarget.style.background= isPinned ? "rgba(99,102,241,0.07)" : "transparent"; }}>
                        <td style={{ padding:"12px 4px", textAlign:"center" }}>
                          <PinIcon pinned={isPinned} onClick={()=>togglePin(r.symbol)} />
                        </td>
                        <td style={{ padding:"12px 4px", textAlign:"center", fontSize:11, color:C.textDim, fontWeight:600 }}>{idx+1}</td>
                        <td style={{ padding:"12px 8px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <CompanyLogo symbol={r.symbol} name={r.name} />
                            <div>
                              <div style={{ fontWeight:600, fontSize:13, color:C.text }}>{r.name}</div>
                              <div style={{ fontSize:10, color:C.textDim, fontWeight:500 }}>{r.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ ...tdR, color:C.textDim, fontSize:12 }}>{fmt.mcap(r.marketCap)}</td>
                        <td style={{ ...tdR, fontWeight:700, color:C.text, fontSize:14 }}>{fmt.price(r.price)}</td>
                        <DailyCell row={r} />
                        <PctCell value={r.change7d} />
                        <PctCell value={r.change30d} />
                        <td style={{ padding:"12px 8px", textAlign:"center" }}>
                          <Spark30D data={stockSpark[r.symbol]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ marginTop:16, textAlign:"center", fontSize:11, color:"#444466" }}>
          <a href="https://www.allinvestview.com/tools/ticker-logos/" target="_blank" rel="noopener" style={{ color:"#444466", textDecoration:"none" }}>Logos by AllInvestView</a>
          {" "}&middot; Yahoo Finance &middot; Auto-refresh 2min
        </div>
      </div>
    </div>
  );
}
