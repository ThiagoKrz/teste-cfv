const cheerio = require("cheerio");

const BASE_URL = "https://vanguardcard.io";
const IMAGE_FALLBACK = "https://images.vanguardcard.io/images/cards";
const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function normalizeText(value) {
  if (!value) {
    return "";
  }
  return value.replace(/\s+/g, " ").trim();
}

function parseStat(text, label, nextLabels) {
  const next = nextLabels && nextLabels.length
    ? `(?=${nextLabels.join("|")})`
    : "$";
  const pattern = new RegExp(`${label}\\s+(.+?)${next}`, "i");
  const match = text.match(pattern);
  return match ? normalizeText(match[1]) : "";
}

function extractCardData(html, search) {
  const $ = cheerio.load(html);

  const name =
    normalizeText($(".card-name h1").first().text()) ||
    normalizeText($("meta[property='og:title']").attr("content")) ||
    normalizeText($("title").first().text());
  if (!name) {
    return null;
  }

  const imageNode = $(".card-image img").first();
  let imageUrl =
    imageNode.attr("data-src") ||
    imageNode.attr("src") ||
    $("meta[property='og:image']").attr("content") ||
    "";

  if (imageUrl && imageUrl.startsWith("//")) {
    imageUrl = `https:${imageUrl}`;
  }

  if (!imageUrl && search) {
    imageUrl = `${IMAGE_FALLBACK}/${encodeURIComponent(search)}-jp.jpg`;
  }

  const miscText = normalizeText($(".card-misc").first().text());
  const grade = parseStat(miscText, "Grade", ["Power", "Shield"]);
  const power = parseStat(miscText, "Power", ["Shield"]);
  const shield = parseStat(miscText, "Shield", []);

  const costsText = normalizeText($(".card-costs").first().text());
  const clanMatch = costsText.match(/Clan\s+(.+?)(?=Nation|$)/i);
  const nationMatch = costsText.match(/Nation\s+(.+)$/i);

  const attributeText = normalizeText($(".card-attribute").first().text());
  const criticalMatch = attributeText.match(/Critical\s+(.+?)(?=Card Format|$)/i);
  const formatMatch = attributeText.match(/Card Format\s+(.+)$/i);

  const rarity = normalizeText($(".card-rarity").first().text());
  const setName = normalizeText($(".card-set .card-set-line").first().text());

  const mainEffect = normalizeText(
    $(".card-main-eff")
      .first()
      .html()
      ?.replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "") || ""
  );
  const sourceEffect = normalizeText(
    $(".card-source-eff")
      .first()
      .html()
      ?.replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "") || ""
  );
  const cardNumber = normalizeText($(".card-number").first().text());

  return {
    id: String(search || "").trim(),
    name,
    imageUrl,
    grade,
    power,
    shield,
    rarity,
    clan: clanMatch ? normalizeText(clanMatch[1]) : "",
    nation: nationMatch ? normalizeText(nationMatch[1]) : "",
    critical: criticalMatch ? normalizeText(criticalMatch[1]) : "",
    format: formatMatch ? normalizeText(formatMatch[1]) : "",
    set: setName,
    cardNumber,
    mainEffect,
    sourceEffect,
    url: `${BASE_URL}/card/?search=${encodeURIComponent(search || "")}`,
  };
}

async function fetchCard(search) {
  if (typeof fetch !== "function") {
    throw new Error("FETCH_UNAVAILABLE");
  }

  const targetUrl = `${BASE_URL}/card/?search=${encodeURIComponent(search)}`;
  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": DEFAULT_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8",
      Referer: BASE_URL,
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error("FETCH_FAILED");
  }

  if (response.url && !response.url.startsWith(BASE_URL)) {
    throw new Error("UPSTREAM_BLOCKED");
  }

  const html = await response.text();
  const card = extractCardData(html, search);
  if (!card) {
    throw new Error("CARD_NOT_FOUND");
  }

  return card;
}

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const segments = url.pathname.split("/").filter(Boolean);

  if (segments[0] !== "api") {
    return sendJson(res, 404, { detail: "Not found" });
  }

  if (req.method === "GET" && segments.length === 2 && segments[1] === "health") {
    return sendJson(res, 200, { status: "ok" });
  }

  if (req.method === "GET" && segments.length >= 2 && segments[1] === "card") {
    const search =
      segments[2] || url.searchParams.get("search") || url.searchParams.get("id");

    if (!search) {
      return sendJson(res, 400, { detail: "Search is required" });
    }

    try {
      const card = await fetchCard(String(search).trim());
      return sendJson(res, 200, card);
    } catch (error) {
      if (error.message === "CARD_NOT_FOUND") {
        return sendJson(res, 404, { detail: "Card not found" });
      }
      if (error.message === "FETCH_UNAVAILABLE") {
        return sendJson(res, 500, { detail: "Fetch not available" });
      }
      if (error.message === "UPSTREAM_BLOCKED") {
        return sendJson(res, 502, { detail: "Upstream blocked" });
      }
      return sendJson(res, 502, { detail: "Failed to fetch card" });
    }
  }

  return sendJson(res, 404, { detail: "Not found" });
};
