import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import CryptoDashboard from "./CryptoDashboard";
import StockDashboard from "./StockDashboard";

/* ── Dropdown Menu Hook ── */
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

/* ── Dropdown Item ── */
function DropItem({ to, icon, label, desc, onClose }) {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      style={({ isActive }) => ({
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "10px 14px", borderRadius: 8, textDecoration: "none",
        background: isActive ? "#f0f0ff" : "transparent",
        transition: "background .12s",
      })}
      onMouseEnter={e => {
        const isActive = e.currentTarget.getAttribute("aria-current") === "page";
        if (!isActive) e.currentTarget.style.background = "#f8f8fc";
      }}
      onMouseLeave={e => {
        const isActive = e.currentTarget.getAttribute("aria-current") === "page";
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1.2, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#8b8fa3", marginTop: 1 }}>{desc}</div>
      </div>
    </NavLink>
  );
}

/* ── Navigation Bar ── */
function Nav() {
  const [marketsOpen, setMarketsOpen] = useState(false);
  const dropRef = useRef(null);
  const location = useLocation();

  useClickOutside(dropRef, () => setMarketsOpen(false));

  // Determine active section label
  const getActiveLabel = () => {
    if (location.pathname === "/" || location.pathname === "/crypto") return "Crypto";
    if (location.pathname === "/stocks") return "Stocks";
    if (location.pathname === "/portfolio") return "Portfolio";
    return "Markets";
  };

  const isMarketsActive = location.pathname === "/" || location.pathname === "/crypto" || location.pathname === "/stocks";

  return (
    <nav style={{
      display: "flex", alignItems: "center", gap: 0,
      padding: "0 24px", height: 52, background: "#fff",
      borderBottom: "1px solid #ebedf2",
      fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ fontWeight: 800, fontSize: 17, color: "#1a1a2e", marginRight: 32, letterSpacing: -0.5, display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 20 }}>{"\uD83D\uDCC8"}</span>
        InvestBoard
      </div>

      {/* Markets Dropdown */}
      <div ref={dropRef} style={{ position: "relative" }}>
        <button
          onClick={() => setMarketsOpen(!marketsOpen)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "8px 14px", fontSize: 14, fontWeight: 600,
            color: isMarketsActive ? "#1a1a2e" : "#6b7280",
            background: marketsOpen ? "#f5f5f8" : "transparent",
            border: "none", borderRadius: 8, cursor: "pointer",
            transition: "all .15s",
            borderBottom: isMarketsActive ? "2px solid #6366f1" : "2px solid transparent",
          }}
          onMouseEnter={e => { if (!marketsOpen) e.currentTarget.style.background = "#f8f8fc"; }}
          onMouseLeave={e => { if (!marketsOpen) e.currentTarget.style.background = "transparent"; }}
        >
          Markets
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: marketsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Dropdown Panel */}
        {marketsOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0,
            background: "#fff", borderRadius: 12,
            boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid #ebedf2",
            padding: 8, minWidth: 260,
            animation: "fadeIn .15s ease-out",
          }}>
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

            <div style={{ padding: "6px 14px 8px", fontSize: 10, fontWeight: 700, color: "#b0b4c0", textTransform: "uppercase", letterSpacing: 1 }}>
              Markets
            </div>

            <DropItem
              to="/"
              icon={"\uD83E\uDE99"}
              label="Crypto"
              desc="Real-time cryptocurrency prices & trends"
              onClose={() => setMarketsOpen(false)}
            />
            <DropItem
              to="/stocks"
              icon={"\uD83D\uDCCA"}
              label="Stocks"
              desc="Global top 20 stocks by market cap"
              onClose={() => setMarketsOpen(false)}
            />

            <div style={{ height: 1, background: "#f0f0f4", margin: "6px 8px" }} />

            <div style={{ padding: "6px 14px 8px", fontSize: 10, fontWeight: 700, color: "#b0b4c0", textTransform: "uppercase", letterSpacing: 1 }}>
              Coming Soon
            </div>

            <div style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "10px 14px", borderRadius: 8, opacity: 0.5, cursor: "default",
            }}>
              <span style={{ fontSize: 20, lineHeight: 1.2, flexShrink: 0, marginTop: 1 }}>{"\uD83D\uDCB1"}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>ETFs & Forex</div>
                <div style={{ fontSize: 11, color: "#8b8fa3", marginTop: 1 }}>Global ETFs and currency pairs</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Portfolio Link */}
      <NavLink
        to="/portfolio"
        style={({ isActive }) => ({
          display: "flex", alignItems: "center", gap: 5,
          padding: "8px 14px", fontSize: 14, fontWeight: 600,
          color: isActive ? "#1a1a2e" : "#6b7280",
          textDecoration: "none", borderRadius: 8,
          borderBottom: isActive ? "2px solid #6366f1" : "2px solid transparent",
          transition: "all .15s",
        })}
        onMouseEnter={e => e.currentTarget.style.background = "#f8f8fc"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        Portfolio
      </NavLink>

      {/* Spacer + active indicator */}
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 12, color: "#b0b4c0", fontWeight: 500 }}>
        {getActiveLabel()}
      </div>
    </nav>
  );
}

/* ── Portfolio Placeholder ── */
function PortfolioPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f8", fontFamily: "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{"\uD83D\uDCBC"}</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>Portfolio</h2>
        <p style={{ fontSize: 15, color: "#8b8fa3", lineHeight: 1.6, marginBottom: 24 }}>
          Track your investments in real-time.<br />
          Add your holdings with average cost and see live P&L.
        </p>
        <div style={{
          background: "#fff", borderRadius: 12, border: "1px solid #ebedf2",
          padding: 32, color: "#b0b4c0", fontSize: 14,
        }}>
          Coming soon — stay tuned!
        </div>
      </div>
    </div>
  );
}

/* ── App ── */
function App() {
  return (
    <HashRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<CryptoDashboard />} />
        <Route path="/stocks" element={<StockDashboard />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
      </Routes>
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
