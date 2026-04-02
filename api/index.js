const BASE_URL = "https://vanguardcard.io";
const API_URL = `${BASE_URL}/api/search.php`;
const IMAGE_BASE = "https://images.vanguardcard.io/images/cards";
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
  return String(value).replace(/\s+/g, " ").trim();
}

function pickField(raw, keys) {
  for (const key of keys) {
    if (raw && raw[key] !== undefined && raw[key] !== null) {
      const value = normalizeText(raw[key]);
      if (value) {
        return value;
      }
    }
  }
  return "";
}

function buildImageUrl(id, image) {
  const direct = normalizeText(image);
  if (direct) {
    return direct.startsWith("http") ? direct : `${BASE_URL}${direct}`;
  }
  if (id) {
    return `${IMAGE_BASE}/${encodeURIComponent(id)}-jp.jpg`;
  }
  return "";
}

function normalizeCard(raw) {
  const id = pickField(raw, [
    "id",
    "cardid",
    "card_id",
    "cardcode",
    "card_code",
    "code",
    "cid",
  ]);
  const name = pickField(raw, [
    "name",
    "card_name",
    "cardname",
    "cardName",
    "title",
  ]);
  const grade = pickField(raw, ["grade", "card_grade", "grade_level"]);
  const power = pickField(raw, ["power", "card_power"]);
  const shield = pickField(raw, ["shield", "card_shield"]);
  const rarity = pickField(raw, ["rarity", "card_rarity", "rarity_tier"]);
  const clan = pickField(raw, ["clan", "card_clan"]);
  const nation = pickField(raw, ["nation", "card_nation"]);
  const format = pickField(raw, ["format", "card_format"]);
  const set = pickField(raw, ["set", "card_set", "set_name", "pack"]);
  const mainEffect = pickField(raw, [
    "effect",
    "effect_text",
    "text",
    "skill",
  ]);
  const sourceEffect = pickField(raw, [
    "flavor",
    "flavor_text",
    "flavour",
    "flavorText",
  ]);
  const imageUrl = buildImageUrl(
    id,
    pickField(raw, ["imageUrl", "image_url", "image", "img", "art"])
  );

  return {
    id,
    name,
    imageUrl,
    grade,
    power,
    shield,
    rarity,
    clan,
    nation,
    format,
    set,
    mainEffect,
    sourceEffect,
    url: id ? `${BASE_URL}/card/?search=${encodeURIComponent(id)}` : "",
  };
}

function extractCards(payload) {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (Array.isArray(payload.results)) {
    return payload.results;
  }
  if (Array.isArray(payload.cards)) {
    return payload.cards;
  }
  if (payload.card) {
    return [payload.card];
  }
  return [];
}

function uniqueCards(cards) {
  const seen = new Set();
  const output = [];

  cards.forEach((card) => {
    const key = card.id || card.name;
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    output.push(card);
  });

  return output;
}

function filterByQuery(cards, query) {
  if (!query) {
    return cards;
  }

  const lowered = query.toLowerCase();
  return cards.filter((card) => {
    const id = normalizeText(card.id).toLowerCase();
    const name = normalizeText(card.name).toLowerCase();
    return id.includes(lowered) || name.includes(lowered);
  });
}

async function fetchApiCards(query, limit, useSearchParam, page, offset) {
  if (typeof fetch !== "function") {
    throw new Error("FETCH_UNAVAILABLE");
  }

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("sort", "name");
  if (useSearchParam && query) {
    params.set("search", query);
  }
  if (page) {
    params.set("page", String(page));
  }
  if (offset !== undefined && offset !== null) {
    params.set("offset", String(offset));
  }

  const url = `${API_URL}?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": DEFAULT_UA,
      Accept: "application/json, text/plain, */*",
      Referer: BASE_URL,
    },
  });

  if (!response.ok) {
    throw new Error("FETCH_FAILED");
  }

  const data = await response.json();
  return { data, url };
}

async function fetchAllCatalog(query, limit, maxPages) {
  const trimmed = normalizeText(query);
  let page = 1;
  let allCards = [];
  let sourceUrl = "";

  while (page <= maxPages) {
    const offset = (page - 1) * limit;
    const response = await fetchApiCards(trimmed, limit, true, page, offset);
    const rawCards = extractCards(response.data);
    if (!rawCards.length) {
      sourceUrl = response.url;
      break;
    }

    const normalized = rawCards.map(normalizeCard);
    const before = allCards.length;
    allCards = uniqueCards(allCards.concat(normalized));
    sourceUrl = response.url;

    if (allCards.length === before) {
      break;
    }

    if (rawCards.length < limit) {
      break;
    }

    page += 1;
  }

  return { cards: allCards, total: allCards.length, sourceUrl };
}

async function fetchCatalog(query, limit) {
  const trimmed = normalizeText(query);
  let response = await fetchApiCards(trimmed, limit, true);
  let rawCards = extractCards(response.data);
  let cards = uniqueCards(rawCards.map(normalizeCard));
  let sourceUrl = response.url;

  if (trimmed && !cards.length) {
    response = await fetchApiCards("", limit, false);
    rawCards = extractCards(response.data);
    cards = uniqueCards(rawCards.map(normalizeCard));
    cards = filterByQuery(cards, trimmed);
    sourceUrl = response.url;
  }

  const total =
    response.data?.total || response.data?.total_count || cards.length;

  return { cards: cards.slice(0, limit), total, sourceUrl };
}

async function fetchCard(query) {
  const trimmed = normalizeText(query);
  const catalog = await fetchCatalog(trimmed, 200);
  if (!catalog.cards.length) {
    return null;
  }

  const exactId = catalog.cards.find((card) => card.id === trimmed);
  if (exactId) {
    return exactId;
  }

  const lowered = trimmed.toLowerCase();
  return (
    catalog.cards.find(
      (card) => normalizeText(card.name).toLowerCase() === lowered
    ) || catalog.cards[0]
  );
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
      const card = await fetchCard(String(search));
      if (!card) {
        return sendJson(res, 404, { detail: "Card not found" });
      }
      return sendJson(res, 200, card);
    } catch (error) {
      if (error.message === "FETCH_UNAVAILABLE") {
        return sendJson(res, 500, { detail: "Fetch not available" });
      }
      return sendJson(res, 502, { detail: "Failed to fetch card" });
    }
  }

  if (req.method === "GET" && segments.length >= 2 && segments[1] === "search") {
    const query =
      url.searchParams.get("search") || url.searchParams.get("q") || "";
    const limitParam = Number(url.searchParams.get("limit") || 200);
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(200, Math.floor(limitParam)))
      : 200;
    const allParam = url.searchParams.get("all") || "";
    const maxPagesParam = Number(url.searchParams.get("maxPages") || 10);
    const maxPages = Number.isFinite(maxPagesParam)
      ? Math.max(1, Math.min(50, Math.floor(maxPagesParam)))
      : 10;

    try {
      const result = allParam
        ? await fetchAllCatalog(String(query), limit, maxPages)
        : await fetchCatalog(String(query), limit);
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
      return sendJson(res, 502, { detail: "Failed to fetch catalog" });
    }
  }

  return sendJson(res, 404, { detail: "Not found" });
};
