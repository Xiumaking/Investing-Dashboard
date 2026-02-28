import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, NavLink } from "react-router-dom";
import CryptoDashboard from "./CryptoDashboard";
import StockDashboard from "./StockDashboard";

function Nav() {
  const base = {
    padding: "10px 24px", fontSize: 14, fontWeight: 600,
    textDecoration: "none", borderRadius: 8, transition: "all .2s",
    display: "inline-flex", alignItems: "center", gap: 6,
  };
  const active = { background: "#111", color: "#fff" };
  const inactive = { background: "#f3f4f6", color: "#6b7280" };
  return (
    <nav style={{ display: "flex", gap: 8, padding: "16px 24px", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
      <NavLink to="/" end style={({ isActive }) => ({ ...base, ...(isActive ? active : inactive) })}>
        🪙 Crypto
      </NavLink>
      <NavLink to="/stocks" style={({ isActive }) => ({ ...base, ...(isActive ? active : inactive) })}>
        📊 Stocks
      </NavLink>
    </nav>
  );
}

function App() {
  return (
    <HashRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<CryptoDashboard />} />
        <Route path="/stocks" element={<StockDashboard />} />
      </Routes>
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
