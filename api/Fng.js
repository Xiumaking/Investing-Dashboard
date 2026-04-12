// api/fng.js — Vercel Serverless Function
// Proxy for CoinMarketCap Fear & Greed Index (bypasses CORS)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  try {
    // CoinMarketCap's public frontend endpoint (no API key needed)
    const url = "https://api.coinmarketcap.com/data-api/v3/fear-greed/chart?start=1&limit=1";
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Referer": "https://coinmarketcap.com/charts/fear-and-greed-index/",
      },
    });

    if (!response.ok) throw new Error("CMC fetch failed: " + response.status);
    const data = await response.json();

    // Response shape: { data: { dataList: [{ score, name, timestamp }], ... } }
    const list = data?.data?.dataList || [];
    const latest = list[list.length - 1] || list[0];

    if (!latest) throw new Error("No fear/greed data");

    return res.status(200).json({
      value: Math.round(latest.score),
      classification: latest.name,
      timestamp: latest.timestamp,
      source: "CoinMarketCap",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
