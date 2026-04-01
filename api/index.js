const cheerio = require("cheerio");

const BASE_URL = "https://vanguardcard.io";
const IMAGE_FALLBACK = "https://images.vanguardcard.io/images/cards";

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

function parseStat(text, label) {
  const pattern = new RegExp(`${label}\\s+([^\\s]+(?:\\s+[^\\s]+)*)`, "i");
  const match = text.match(pattern);
  return match ? normalizeText(match[1]) : "";
}

function extractCardData(html, search) {
  const $ = cheerio.load(html);

  const name = normalizeText($(".card-name h1").first().text());
  if (!name) {
    return null;
  }

  const imageNode = $(".card-image img").first();
  let imageUrl =
    imageNode.attr("data-src") || imageNode.attr("src") || "";

  if (imageUrl && imageUrl.startsWith("//")) {
    imageUrl = `https:${imageUrl}`;
  }

  if (!imageUrl && search) {
    imageUrl = `${IMAGE_FALLBACK}/${encodeURIComponent(search)}-jp.jpg`;
  }

  const miscText = normalizeText($(".card-misc").first().text());
  const grade = parseStat(miscText, "Grade");
  const power = parseStat(miscText, "Power");
  const shield = parseStat(miscText, "Shield");

  const costsText = normalizeText($(".card-costs").first().text());
  const clanMatch = costsText.match(/Clan\s+(.+?)\s+Nation\s+/i);
  const nationMatch = costsText.match(/Nation\s+(.+)$/i);

  const attributeText = normalizeText($(".card-attribute").first().text());
  const criticalMatch = attributeText.match(/Critical\s+(.+?)\s+Card Format/i);
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
      "User-Agent": "Mozilla/5.0 (compatible; CFVanguard/1.0)",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error("FETCH_FAILED");
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
      return sendJson(res, 502, { detail: "Failed to fetch card" });
    }
  }

  return sendJson(res, 404, { detail: "Not found" });
};
