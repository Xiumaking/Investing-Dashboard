// api/fng.js — Vercel Serverless Function
// Proxy for CoinMarketCap Fear & Greed Index (bypasses CORS)

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://coinmarketcap.com/charts/fear-and-greed-index/",
  "Origin": "https://coinmarketcap.com",
};

// Try to pull {value, classification, timestamp} out of various possible shapes.
function extract(json) {
  if (!json) return null;
  const d = json.data ?? json;

  if (d?.dataList?.length) {
    const latest = d.dataList[d.dataList.length - 1];
    return {
      value: latest.score ?? latest.value,
      classification: latest.name ?? latest.value_classification,
      timestamp: latest.timestamp,
    };
  }
  if (Array.isArray(d) && d.length) {
    const latest = d[d.length - 1];
    return {
      value: latest.value ?? latest.score,
      classification: latest.value_classification ?? latest.name,
      timestamp: latest.timestamp ?? latest.update_time,
    };
  }
  if (typeof d === "object" && (d.value != null || d.score != null)) {
    return {
      value: d.value ?? d.score,
      classification: d.value_classification ?? d.name,
      timestamp: d.timestamp,
    };
  }
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

  // CMC fear-greed/chart expects unix timestamps (seconds) for start & end
  const now = Math.floor(Date.now() / 1000);
  const weekAgo = now - 7 * 24 * 60 * 60;

  const endpoints = [
    `https://api.coinmarketcap.com/data-api/v3/fear-greed/chart?start=${weekAgo}&end=${now}`,
    `https://api.coinmarketcap.com/data-api/v3/fear-greed/historical?start=${weekAgo}&end=${now}`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, { headers: HEADERS });
      const text = await response.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* not JSON */ }

      attempts.push({
        url,
        status: response.status,
        ok: response.ok,
        snippet: text.slice(0, 300),
      });

      if (!response.ok || !json) continue;

      // If CMC returned an error in JSON body (e.g. error_code != 0), skip
      if (json?.status?.error_code && json.status.error_code !== "0" && json.status.error_code !== 0) {
        continue;
      }

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
