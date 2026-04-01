const packQuery = document.getElementById("packQuery");
const packCountInput = document.getElementById("packCount");
const packSizeInput = document.getElementById("packSize");
const openButton = document.getElementById("openButton");
const packStatus = document.getElementById("packStatus");
const packSummary = document.getElementById("packSummary");
const packResults = document.getElementById("packResults");

const catalogQuery = document.getElementById("catalogQuery");
const catalogButton = document.getElementById("catalogButton");
const catalogStatus = document.getElementById("catalogStatus");
const catalogResults = document.getElementById("catalogResults");

const filterRarity = document.getElementById("filterRarity");
const filterGrade = document.getElementById("filterGrade");
const filterClan = document.getElementById("filterClan");
const filterNation = document.getElementById("filterNation");
const filterFormat = document.getElementById("filterFormat");

const DEFAULT_IMAGE =
  "https://images.vanguardcard.io/images/assets/CardBack.jpg";
const MAX_RESULTS = 160;

let catalogCards = [];

function setButtonLoading(button, isLoading, label) {
  if (!button) {
    return;
  }

  if (isLoading) {
    button.dataset.label = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value) {
  return String(value || "").trim();
}

function setSelectOptions(select, values, placeholder) {
  if (!select) {
    return;
  }

  select.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = placeholder;
  select.appendChild(defaultOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function uniqueSorted(values, numeric) {
  const set = new Set(values.filter(Boolean));
  const list = Array.from(set);
  if (numeric) {
    return list.sort((a, b) => Number(a) - Number(b));
  }
  return list.sort((a, b) => a.localeCompare(b));
}

function buildFilters(cards) {
  setSelectOptions(
    filterRarity,
    uniqueSorted(cards.map((card) => normalizeText(card.rarity)), false),
    "All"
  );
  setSelectOptions(
    filterGrade,
    uniqueSorted(cards.map((card) => normalizeText(card.grade)), true),
    "All"
  );
  setSelectOptions(
    filterClan,
    uniqueSorted(cards.map((card) => normalizeText(card.clan)), false),
    "All"
  );
  setSelectOptions(
    filterNation,
    uniqueSorted(cards.map((card) => normalizeText(card.nation)), false),
    "All"
  );
  setSelectOptions(
    filterFormat,
    uniqueSorted(cards.map((card) => normalizeText(card.format)), false),
    "All"
  );
}

function applyFilters(cards) {
  const rarity = normalizeText(filterRarity.value);
  const grade = normalizeText(filterGrade.value);
  const clan = normalizeText(filterClan.value);
  const nation = normalizeText(filterNation.value);
  const format = normalizeText(filterFormat.value);

  return cards.filter((card) => {
    if (rarity && normalizeText(card.rarity) !== rarity) {
      return false;
    }
    if (grade && normalizeText(card.grade) !== grade) {
      return false;
    }
    if (clan && normalizeText(card.clan) !== clan) {
      return false;
    }
    if (nation && normalizeText(card.nation) !== nation) {
      return false;
    }
    if (format && normalizeText(card.format) !== format) {
      return false;
    }
    return true;
  });
}

function buildMetaLine(card) {
  const parts = [];
  if (card.grade) {
    parts.push(`Grade ${escapeHtml(card.grade)}`);
  }
  if (card.clan) {
    parts.push(escapeHtml(card.clan));
  } else if (card.nation) {
    parts.push(escapeHtml(card.nation));
  }
  return parts.join(" · ");
}

function renderCardTile(card) {
  const rarityValue = normalizeText(card.rarity) || "UNKNOWN";
  const rarityClass = `rarity-${rarityValue.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const imageUrl = card.imageUrl || DEFAULT_IMAGE;

  return `<article class="card-tile ${rarityClass}">
    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(card.name)}" />
    <div class="card-body">
      <div class="card-name">${escapeHtml(card.name)}</div>
      <div class="card-meta-line">${buildMetaLine(card)}</div>
      <div class="card-footer">
        <span class="chip ${rarityClass}">${escapeHtml(rarityValue)}</span>
        <span class="card-id">ID ${escapeHtml(card.id || "-")}</span>
      </div>
    </div>
  </article>`;
}

function renderPack(pack, index) {
  const cards = pack.map(renderCardTile).join("");
  return `<article class="pack-result">
    <header>
      <span>Pack ${index + 1}</span>
      <span>${pack.length} cards</span>
    </header>
    <div class="pack-grid">${cards}</div>
  </article>`;
}

function summarizePacks(packs) {
  const byRarity = {};
  let totalCards = 0;

  packs.forEach((pack) => {
    pack.forEach((card) => {
      totalCards += 1;
      const rarity = normalizeText(card.rarity) || "UNKNOWN";
      byRarity[rarity] = (byRarity[rarity] || 0) + 1;
    });
  });

  return { byRarity, totalCards };
}

function renderSummary(summary) {
  if (!summary) {
    return "";
  }

  const order = ["SP", "RRR", "RR", "R", "C", "UNKNOWN"];
  const rows = order
    .filter((rarity) => summary.byRarity[rarity])
    .map((rarity) => {
      const count = summary.byRarity[rarity];
      const percent = summary.totalCards
        ? Math.round((count / summary.totalCards) * 100)
        : 0;
      const rarityClass = `rarity-${rarity.toLowerCase()}`;
      return `<div class="rarity-row">
        <span class="chip ${rarityClass}">${escapeHtml(rarity)}</span>
        <div class="bar"><span style="width: ${percent}%"></span></div>
        <span class="percent">${percent}%</span>
      </div>`;
    })
    .join("");

  return `<div class="summary-grid">
    <div>
      <h3>Total cards</h3>
      <p>${summary.totalCards}</p>
    </div>
    <div>
      <h3>Rarity mix</h3>
      <div class="rarity-rows">${rows}</div>
    </div>
  </div>`;
}

function pickRandomCards(pool, count) {
  const picks = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(Math.random() * pool.length);
    picks.push(pool[index]);
  }
  return picks;
}

function pickWeightedRare(groups) {
  const weights = [
    { rarity: "R", weight: 70 },
    { rarity: "RR", weight: 20 },
    { rarity: "RRR", weight: 9 },
    { rarity: "SP", weight: 1 },
  ].filter((entry) => groups[entry.rarity]?.length);

  if (!weights.length) {
    return [];
  }

  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weights) {
    if (roll < entry.weight) {
      return pickRandomCards(groups[entry.rarity], 1);
    }
    roll -= entry.weight;
  }

  return pickRandomCards(groups[weights[weights.length - 1].rarity], 1);
}

function groupByRarity(cards) {
  const groups = { C: [], R: [], RR: [], RRR: [], SP: [], UNKNOWN: [] };
  cards.forEach((card) => {
    const rarity = normalizeText(card.rarity) || "UNKNOWN";
    if (groups[rarity]) {
      groups[rarity].push(card);
    } else {
      groups.UNKNOWN.push(card);
    }
  });
  return groups;
}

function openSinglePack(pool, packSize) {
  if (!pool.length) {
    return [];
  }

  const size = Math.max(1, packSize);
  const commonCount = Math.max(0, size - 1);
  const groups = groupByRarity(pool);
  const commons = groups.C || [];
  const rarePick = pickWeightedRare(groups);

  if (commons.length >= commonCount && rarePick.length) {
    return pickRandomCards(commons, commonCount).concat(rarePick);
  }

  return pickRandomCards(pool, size);
}

function openPacks(pool, packCount, packSize) {
  const packs = [];
  for (let i = 0; i < packCount; i += 1) {
    packs.push(openSinglePack(pool, packSize));
  }
  return packs;
}

async function fetchCatalog(query) {
  const url = `/api/search?search=${encodeURIComponent(query)}&limit=${MAX_RESULTS}`;
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.detail || "Failed to fetch catalog";
    throw new Error(message);
  }
  return response.json();
}

async function handleOpenPacks() {
  const query = normalizeText(packQuery.value);
  if (!query) {
    packStatus.textContent = "Type a search term to build a pool.";
    return;
  }

  const packCount = Math.max(1, Number(packCountInput.value || 1));
  const packSize = Math.max(1, Number(packSizeInput.value || 5));

  packStatus.textContent = "Loading card pool...";
  packSummary.innerHTML = "";
  packResults.innerHTML =
    "<div class=\"empty-state\">Building packs...</div>";
  setButtonLoading(openButton, true, "Opening...");

  try {
    const data = await fetchCatalog(query);
    const pool = data.cards || [];
    if (!pool.length) {
      packStatus.textContent = "No cards found for this search.";
      packResults.innerHTML =
        "<div class=\"empty-state\">Try another search.</div>";
      return;
    }

    const packs = openPacks(pool, packCount, packSize);
    packResults.innerHTML = packs.map(renderPack).join("");
    packSummary.innerHTML = renderSummary(summarizePacks(packs));
    packStatus.textContent = `Opened ${packCount} pack${
      packCount === 1 ? "" : "s"
    } from ${pool.length} cards.`;
  } catch (error) {
    packResults.innerHTML = "<div class=\"empty-state\">No results.</div>";
    packStatus.textContent = error.message || "Failed to open packs.";
  } finally {
    setButtonLoading(openButton, false);
  }
}

function renderCatalog() {
  if (!catalogCards.length) {
    catalogResults.innerHTML =
      "<div class=\"empty-state\">No cards loaded.</div>";
    return;
  }

  const filtered = applyFilters(catalogCards);
  if (!filtered.length) {
    catalogResults.innerHTML =
      "<div class=\"empty-state\">No cards match these filters.</div>";
    return;
  }

  catalogResults.innerHTML = `<div class=\"catalog-grid\">${filtered
    .map(renderCardTile)
    .join("")}</div>`;
}

async function handleCatalogLoad() {
  const query = normalizeText(catalogQuery.value);
  const statusLabel = query
    ? "Loading catalog..."
    : "Loading full catalog...";

  catalogStatus.textContent = statusLabel;
  catalogResults.innerHTML =
    "<div class=\"empty-state\">Fetching cards...</div>";
  setButtonLoading(catalogButton, true, "Loading...");

  try {
    const data = await fetchCatalog(query);
    catalogCards = data.cards || [];
    if (!catalogCards.length) {
      catalogStatus.textContent = "No cards found for this search.";
      catalogResults.innerHTML =
        "<div class=\"empty-state\">Try another search.</div>";
      return;
    }

    buildFilters(catalogCards);
    renderCatalog();
    catalogStatus.textContent = `Loaded ${catalogCards.length} cards.`;
  } catch (error) {
    catalogStatus.textContent = error.message || "Failed to load catalog.";
    catalogResults.innerHTML =
      "<div class=\"empty-state\">Catalog unavailable.</div>";
  } finally {
    setButtonLoading(catalogButton, false);
  }
}

openButton.addEventListener("click", () => {
  handleOpenPacks().catch(() => {
    packStatus.textContent = "Unexpected error.";
  });
});

catalogButton.addEventListener("click", () => {
  handleCatalogLoad().catch(() => {
    catalogStatus.textContent = "Unexpected error.";
  });
});

[filterRarity, filterGrade, filterClan, filterNation, filterFormat].forEach(
  (select) => {
    select.addEventListener("change", renderCatalog);
  }
);
