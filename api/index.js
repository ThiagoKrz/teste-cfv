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

function cleanName(value) {
  let cleaned = normalizeText(value);
  cleaned = cleaned.replace(/\s+-\s+Cardfight Vanguard.*$/i, "");
  cleaned = cleaned.replace(/\s+-\s+Cardfight.*$/i, "");
  cleaned = cleaned.replace(/\s+-\s+vanguardcard\.io$/i, "");
  cleaned = cleaned.replace(/\s+-\s+Card Database.*$/i, "");
  return cleaned.trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractByLabels(text, labels, stopLabels) {
  if (!text) {
    return "";
  }

  const labelPattern = labels.map(escapeRegExp).join("|");
  const stopPattern = stopLabels && stopLabels.length
    ? stopLabels.map(escapeRegExp).join("|")
    : "$";

  const pattern = new RegExp(`(?:${labelPattern})\\s*:?\\s*(.+?)(?=${stopPattern}|$)`, "i");
  const match = text.match(pattern);
  return match ? normalizeText(match[1]) : "";
}

function extractRarityToken(text) {
  if (!text) {
    return "";
  }
  const match = text.match(/\b(SP|RRR|RR|R|C)\b/i);
  return match ? match[1].toUpperCase() : "";
}

function extractCardIdFromImage(url) {
  if (!url) {
    return "";
  }
  const match = url.match(/\/cards\/(\d+)-/i);
  return match ? match[1] : "";
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

  const rawName =
    normalizeText($(".card-name h1").first().text()) ||
    normalizeText($("meta[property='og:title']").attr("content")) ||
    normalizeText($("title").first().text());
  const name = cleanName(rawName);
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

  const rarity =
    normalizeText($(".card-rarity").first().text()) ||
    extractRarityToken(miscText);
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

async function fetchHtml(targetUrl) {
  if (typeof fetch !== "function") {
    throw new Error("FETCH_UNAVAILABLE");
  }

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

  return response.text();
}

function resolveImageUrl(url, fallbackId) {
  if (!url && fallbackId) {
    return `${IMAGE_FALLBACK}/${encodeURIComponent(fallbackId)}-jp.jpg`;
  }

  if (!url) {
    return "";
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("/")) {
    return `${BASE_URL}${url}`;
  }

  return url;
}

function extractCatalogCards(html) {
  const $ = cheerio.load(html);
  const cards = [];
  const seen = new Set();

  $("a[href*='/card?search=']").each((_, element) => {
    const href = $(element).attr("href") || "";
    const linkUrl = new URL(href, BASE_URL);
    const id = normalizeText(linkUrl.searchParams.get("search") || "");
    if (!id || seen.has(id)) {
      return;
    }

    const container = $(element).closest(
      "tr, .card-item, .card, .result, .card-list-item, li, .row"
    );
    const containerText = normalizeText(container.text());
    const imageNode = $(element).find("img").first();
    const name = cleanName(
      normalizeText($(element).attr("title")) ||
        normalizeText(imageNode.attr("title")) ||
        normalizeText(imageNode.attr("alt")) ||
        normalizeText(container.find(".card-name, .name").first().text()) ||
        normalizeText($(element).text())
    );

    const imageUrl = resolveImageUrl(
      imageNode.attr("data-src") || imageNode.attr("src") || "",
      id
    );

    const grade =
      normalizeText(container.find(".card-grade, .grade").first().text()) ||
      extractByLabels(containerText, ["Grade"], [
        "Power",
        "Shield",
        "Rarity",
        "Clan",
        "Nation",
        "Format",
        "Set",
      ]);

    const rarity =
      normalizeText(container.find(".card-rarity, .rarity").first().text()) ||
      extractByLabels(containerText, ["Rarity"], [
        "Grade",
        "Power",
        "Clan",
        "Nation",
        "Format",
        "Set",
      ]) ||
      extractRarityToken(containerText);

    const clan =
      normalizeText(container.find(".card-clan, .clan").first().text()) ||
      extractByLabels(containerText, ["Clan"], ["Nation", "Format", "Set"]);

    const nation =
      normalizeText(container.find(".card-nation, .nation").first().text()) ||
      extractByLabels(containerText, ["Nation"], ["Format", "Set"]);

    const format =
      normalizeText(container.find(".card-format, .format").first().text()) ||
      extractByLabels(containerText, ["Format", "Card Format"], ["Set"]);

    const setName =
      normalizeText(
        container.find("a[href*='/pack']").first().text()
      ) ||
      normalizeText(container.find(".card-set, .set").first().text()) ||
      extractByLabels(containerText, ["Set"], []);

    cards.push({
      id,
      name: name || id,
      imageUrl,
      grade,
      rarity,
      clan,
      nation,
      format,
      set: setName,
      url: `${BASE_URL}/card/?search=${encodeURIComponent(id)}`,
    });
    seen.add(id);
  });

  $("img").each((_, element) => {
    const imageNode = $(element);
    const rawUrl = imageNode.attr("data-src") || imageNode.attr("src") || "";
    const id = extractCardIdFromImage(rawUrl);
    if (!id || seen.has(id)) {
      return;
    }

    const name = cleanName(
      normalizeText(imageNode.attr("title")) ||
        normalizeText(imageNode.attr("alt")) ||
        id
    );

    cards.push({
      id,
      name: name || id,
      imageUrl: resolveImageUrl(rawUrl, id),
      grade: "",
      rarity: "",
      clan: "",
      nation: "",
      format: "",
      set: "",
      url: `${BASE_URL}/card/?search=${encodeURIComponent(id)}`,
    });
    seen.add(id);
  });

  return cards;
}

async function fetchCatalog(query, limit) {
  const trimmed = String(query || "").trim();
  const targetUrl = trimmed
    ? `${BASE_URL}/card-database/?search=${encodeURIComponent(trimmed)}`
    : `${BASE_URL}/card-database/`;

  const html = await fetchHtml(targetUrl);
  let cards = extractCatalogCards(html);
  let sourceUrl = targetUrl;

  if (!cards.length && trimmed) {
    const cardUrl = `${BASE_URL}/card/?search=${encodeURIComponent(trimmed)}`;
    const cardHtml = await fetchHtml(cardUrl);
    const mainCard = extractCardData(cardHtml, trimmed);
    const related = extractCatalogCards(cardHtml);
    cards = [mainCard, ...related].filter(Boolean);
    sourceUrl = cardUrl;
  }

  return {
    sourceUrl,
    cards: cards.slice(0, limit),
    total: cards.length,
  };
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

  if (req.method === "GET" && segments.length >= 2 && segments[1] === "search") {
    const query =
      url.searchParams.get("search") || url.searchParams.get("q") || "";
    const limitParam = Number(url.searchParams.get("limit") || 120);
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(200, Math.floor(limitParam)))
      : 120;

    try {
      const result = await fetchCatalog(String(query).trim(), limit);
      return sendJson(res, 200, {
        query: String(query || ""),
        total: result.total,
        cards: result.cards,
        sourceUrl: result.sourceUrl,
      });
    } catch (error) {
      if (error.message === "FETCH_UNAVAILABLE") {
        return sendJson(res, 500, { detail: "Fetch not available" });
      }
      if (error.message === "UPSTREAM_BLOCKED") {
        return sendJson(res, 502, { detail: "Upstream blocked" });
      }
      return sendJson(res, 502, { detail: "Failed to fetch catalog" });
    }
  }

  return sendJson(res, 404, { detail: "Not found" });
};
