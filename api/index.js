const fs = require("fs");
const path = require("path");

const PACKS_DIR = path.join(process.cwd(), "packs");

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function parseCsvRows(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (inQuotes) {
      if (char === "\"") {
        if (content[i + 1] === "\"") {
          field += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
      continue;
    }

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function parseCsv(content) {
  const rows = parseCsvRows(content);
  if (!rows.length) {
    return [];
  }

  const headers = rows.shift().map((header) => header.trim());
  return rows
    .filter((row) => row.some((value) => value && value.trim()))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = (row[index] || "").trim();
      });
      return record;
    });
}

function listPackNames() {
  if (!fs.existsSync(PACKS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(PACKS_DIR)
    .filter((name) => name.toLowerCase().endsWith(".csv"))
    .map((name) => path.basename(name, ".csv"))
    .sort();
}

function loadPackCards(pack) {
  const packFile = path.join(PACKS_DIR, `${pack}.csv`);
  if (!fs.existsSync(packFile)) {
    throw new Error("PACK_NOT_FOUND");
  }

  const content = fs.readFileSync(packFile, "utf8");
  const records = parseCsv(content);
  return records.map((row) => ({
    set: (row.set || "").trim(),
    id: (row.id || "").trim(),
    name: (row.name || "").trim(),
    grade: (row.grade || "").trim(),
    clan: (row.clan || "").trim(),
    type: (row.type || "").trim(),
    rarity: (row.rarity || "").trim(),
  }));
}

function sampleCards(pool, count) {
  if (!pool.length) {
    return [];
  }

  if (pool.length >= count) {
    const picks = [];
    const remaining = pool.slice();
    for (let i = 0; i < count; i += 1) {
      const index = Math.floor(Math.random() * remaining.length);
      picks.push(remaining.splice(index, 1)[0]);
    }
    return picks;
  }

  const picks = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(Math.random() * pool.length);
    picks.push(pool[index]);
  }
  return picks;
}

function rollRarity() {
  const roll = Math.floor(Math.random() * 100) + 1;
  if (roll <= 70) {
    return "R";
  }
  if (roll <= 90) {
    return "RR";
  }
  if (roll <= 99) {
    return "RRR";
  }
  return "SP";
}

function pickRare(cards) {
  const rarity = rollRarity();
  const pool = cards.filter((card) => card.rarity === rarity);
  const rare = sampleCards(pool, 1);
  if (rare.length) {
    return rare;
  }

  const fallbacks = ["RRR", "RR", "R", "C"];
  for (const fallback of fallbacks) {
    const fallbackPool = cards.filter((card) => card.rarity === fallback);
    const fallbackPick = sampleCards(fallbackPool, 1);
    if (fallbackPick.length) {
      return fallbackPick;
    }
  }

  return [];
}

function openSinglePack(cards) {
  const commonsPool = cards.filter((card) => card.rarity === "C");
  const commons = sampleCards(commonsPool, 4);
  const rare = pickRare(cards);
  return commons.concat(rare);
}

function openManyPacks(cards, count) {
  const packs = [];
  for (let i = 0; i < count; i += 1) {
    packs.push(openSinglePack(cards));
  }
  return packs;
}

function summarizePacks(packs) {
  const byRarity = {};
  let totalCards = 0;

  for (const pack of packs) {
    for (const card of pack) {
      totalCards += 1;
      const rarity = card.rarity || "UNKNOWN";
      byRarity[rarity] = (byRarity[rarity] || 0) + 1;
    }
  }

  return { by_rarity: byRarity, total_cards: totalCards };
}

function filterCards(cards, query, rarity, clan, cardType, grade) {
  let filtered = cards.slice();

  if (query) {
    const queryLower = query.toLowerCase();
    filtered = filtered.filter(
      (card) =>
        card.name.toLowerCase().includes(queryLower) ||
        card.id.toLowerCase().includes(queryLower)
    );
  }

  if (rarity) {
    filtered = filtered.filter((card) => card.rarity === rarity);
  }

  if (clan) {
    const clanLower = clan.toLowerCase();
    filtered = filtered.filter((card) =>
      card.clan.toLowerCase().includes(clanLower)
    );
  }

  if (cardType) {
    const typeLower = cardType.toLowerCase();
    filtered = filtered.filter((card) =>
      card.type.toLowerCase().includes(typeLower)
    );
  }

  if (grade) {
    filtered = filtered.filter((card) => card.grade === grade);
  }

  return filtered;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
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

  if (req.method === "GET" && segments.length === 2 && segments[1] === "packs") {
    return sendJson(res, 200, { packs: listPackNames() });
  }

  if (
    req.method === "GET" &&
    segments.length === 4 &&
    segments[1] === "packs" &&
    segments[3] === "cards"
  ) {
    const packName = segments[2].toUpperCase();
    try {
      const cards = loadPackCards(packName);
      const query = url.searchParams.get("q");
      const rarity = url.searchParams.get("rarity");
      const clan = url.searchParams.get("clan");
      const cardType = url.searchParams.get("type");
      const grade = url.searchParams.get("grade");

      const filtered = filterCards(cards, query, rarity, clan, cardType, grade);
      return sendJson(res, 200, { pack: packName, cards: filtered });
    } catch (error) {
      if (error.message === "PACK_NOT_FOUND") {
        return sendJson(res, 404, { detail: "Pack not found" });
      }
      return sendJson(res, 500, { detail: "Failed to load pack" });
    }
  }

  if (req.method === "POST" && segments.length === 2 && segments[1] === "open") {
    let payload = null;

    try {
      const body = await readRequestBody(req);
      payload = body ? JSON.parse(body) : {};
    } catch (error) {
      return sendJson(res, 400, { detail: "Invalid JSON payload" });
    }

    const pack = String(payload.pack || "").trim().toUpperCase();
    const count = Number(payload.count || 1);

    if (!pack) {
      return sendJson(res, 400, { detail: "Pack is required" });
    }

    if (!Number.isInteger(count) || count < 1 || count > 100) {
      return sendJson(res, 400, { detail: "Count must be between 1 and 100" });
    }

    try {
      const cards = loadPackCards(pack);
      const opened = openManyPacks(cards, count);
      const summary = summarizePacks(opened);

      return sendJson(res, 200, {
        pack,
        count,
        packs: opened,
        summary,
      });
    } catch (error) {
      if (error.message === "PACK_NOT_FOUND") {
        return sendJson(res, 404, { detail: "Pack not found" });
      }
      return sendJson(res, 500, { detail: "Failed to open packs" });
    }
  }

  return sendJson(res, 404, { detail: "Not found" });
};
