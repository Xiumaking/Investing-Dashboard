// api/stocks.js — Vercel Serverless Function
// Yahoo Finance v8 chart + quote proxy (CORS-free, no API key needed)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  const { type } = req.query;

  try {
    if (type === "quote") {
      // Batch quote for stocks and indices
      const symbols = req.query.symbols || "";
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=symbol,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,marketCap,regularMarketVolume,fiftyTwoWeekHigh,fiftyTwoWeekLow`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (type === "history") {
      // Historical data for 7D/30D change calculation
      const symbol = req.query.symbol || "";
      const range = req.query.range || "1mo";
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: "Missing type parameter. Use ?type=quote or ?type=history" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
