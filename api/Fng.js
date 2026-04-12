// api/fng.js — Vercel Serverless Function
// Proxy for CoinMarketCap Fear & Greed Index (bypasses CORS)
// Tries multiple endpoint shapes since the public frontend API may vary.

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://coinmarketcap.com/charts/fear-and-greed-index/",
  "Origin": "https://coinmarketcap.com",
};

// Endpoints to try, in order. The frontend uses these public APIs.
const ENDPOINTS = [
  "https://api.coinmarketcap.com/data-api/v3/fear-greed/chart?start=1&limit=1",
  "https://api.coinmarketcap.com/data-api/v3/fear-greed/latest",
  "https://api.coinmarketcap.com/data-api/v3/fear-and-greed/latest",
  "https://api.coinmarketcap.com/data-api/v3/fear-and-greed/chart?start=1&limit=1",
];

// Try to pull {value, classification, timestamp} out of various possible shapes.
function extract(json) {
  if (!json) return null;
  const d = json.data ?? json;

  // Shape A: { data: { dataList: [{ score, name, timestamp }] } }
  if (d?.dataList?.length) {
    const latest = d.dataList[d.dataList.length - 1];
    return {
      value: latest.score ?? latest.value,
      classification: latest.name ?? latest.value_classification,
      timestamp: latest.timestamp,
    };
  }

  // Shape B: { data: [{ value, value_classification, timestamp }] }
  if (Array.isArray(d) && d.length) {
    const latest = d[d.length - 1];
    return {
      value: latest.value ?? latest.score,
      classification: latest.value_classification ?? latest.name,
      timestamp: latest.timestamp ?? latest.update_time,
    };
  }

  // Shape C: { data: { value, value_classification } } or { data: { score, name } }
  if (typeof d === "object" && (d.value != null || d.score != null)) {
    return {
      value: d.value ?? d.score,
      classification: d.value_classification ?? d.name,
      timestamp: d.timestamp,
    };
  }

  // Shape D: { data: { points: [{ value, ... }] } }
  if (d?.points?.length) {
    const latest = d.points[d.points.length - 1];
    return {
      value: latest.value ?? latest.score,
      classification: latest.value_classification ?? latest.name,
      timestamp: latest.timestamp,
    };
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const debug = req.query.debug === "1";
  const attempts = [];

  for (const url of ENDPOINTS) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      const text = await response.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* not JSON */ }

      attempts.push({
        url,
        status: response.status,
        ok: response.ok,
        snippet: text.slice(0, 200),
      });

      if (!response.ok || !json) continue;

      const parsed = extract(json);
      if (parsed && parsed.value != null) {
        return res.status(200).json({
          value: Math.round(Number(parsed.value)),
          classification: parsed.classification || "",
          timestamp: parsed.timestamp || null,
          source: "CoinMarketCap",
          endpoint: url,
          ...(debug ? { attempts } : {}),
        });
      }
    } catch (error) {
      attempts.push({ url, error: error.message });
    }
  }

  return res.status(502).json({
    error: "All CMC endpoints failed",
    attempts,
  });
}
