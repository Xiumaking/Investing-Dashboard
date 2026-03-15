// api/stocks.js — Vercel Serverless Function
// Yahoo Finance proxy with cookie + crumb authentication

let cachedCookie = null;
let cachedCrumb = null;
let crumbExpiry = 0;

async function getCookieAndCrumb() {
  const now = Date.now();
  if (cachedCookie && cachedCrumb && now < crumbExpiry) {
    return { cookie: cachedCookie, crumb: cachedCrumb };
  }

  const cookieRes = await fetch("https://fc.yahoo.com", {
    redirect: "manual",
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  const setCookie = cookieRes.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0];

  const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Cookie": cookie,
    },
  });
  const crumb = await crumbRes.text();

  if (!crumb || crumb.includes("Too Many") || crumb.length > 50) {
    throw new Error("Failed to get crumb from Yahoo Finance");
  }

  cachedCookie = cookie;
  cachedCrumb = crumb;
  crumbExpiry = now + 5 * 60 * 1000;

  return { cookie, crumb };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  const { type } = req.query;

  try {
    if (type === "quote") {
      const symbols = req.query.symbols || "";
      const { cookie, crumb } = await getCookieAndCrumb();

      const fields = [
        "symbol","shortName","regularMarketPrice","regularMarketChange",
        "regularMarketChangePercent","marketCap","sharesOutstanding",
        "regularMarketOpen","regularMarketDayHigh","regularMarketDayLow",
        "regularMarketVolume","currency"
      ].join(",");

      const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${fields}&crumb=${encodeURIComponent(crumb)}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Cookie": cookie,
        },
      });

      const data = await response.json();
      return res.status(200).json(data);
    }

    if (type === "chart") {
      const symbols = (req.query.symbols || "").split(",");
      const range = req.query.range || "1mo";
      const interval = req.query.interval || "1d";

      const results = {};
      const promises = symbols.map(async (sym) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym.trim())}?range=${range}&interval=${interval}`;
          const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          });
          const data = await response.json();
          results[sym.trim()] = data?.chart?.result?.[0] || null;
        } catch {
          results[sym.trim()] = null;
        }
      });

      await Promise.all(promises);
      return res.status(200).json(results);
    }

    return res.status(400).json({ error: "Use ?type=quote&symbols=... or ?type=chart&symbols=...&range=1mo" });
  } catch (error) {
    cachedCookie = null;
    cachedCrumb = null;
    crumbExpiry = 0;
    return res.status(500).json({ error: error.message });
  }
}
