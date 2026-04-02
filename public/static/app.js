const packQuery = document.getElementById("packQuery");
const packCountInput = document.getElementById("packCount");
const packSizeInput = document.getElementById("packSize");
const openButton = document.getElementById("openButton");
const packStatus = document.getElementById("packStatus");
const packSummary = document.getElementById("packSummary");
const packResults = document.getElementById("packResults");
const packClan = document.getElementById("packClan");
const packNation = document.getElementById("packNation");
const cardModal = document.getElementById("cardModal");
const cardModalBody = document.getElementById("cardModalBody");
const themeToggle = document.getElementById("themeToggle");
const langToggle = document.getElementById("langToggle");

const catalogQuery = document.getElementById("catalogQuery");
const catalogButton = document.getElementById("catalogButton");
const catalogStatus = document.getElementById("catalogStatus");
const catalogResults = document.getElementById("catalogResults");

const filterRarity = document.getElementById("filterRarity");
const filterGrade = document.getElementById("filterGrade");
const filterClan = document.getElementById("filterClan");
const filterNation = document.getElementById("filterNation");
const filterFormat = document.getElementById("filterFormat");
const filterOrder = document.getElementById("filterOrder");

const DEFAULT_IMAGE =
  "https://images.vanguardcard.io/images/assets/CardBack.jpg";
const IMAGE_BASE = "https://images.vanguardcard.io/images/cards";
const MAX_RESULTS = 200;

let catalogCards = [];
let packAnimationActive = false;
let lastOpenedPacks = [];
const cardCache = new Map();
let packOptionsLoaded = false;
let packAllCardsCache = null;
let currentLang = "en";
let currentTheme = "dark";

const I18N = {
  en: {
    nav: { subtitle: "Pack Lab", open: "Open packs", catalog: "Catalog" },
    hero: {
      badge: "Vanguard pack lab",
      title: "Spin the pack. Pull the legend.",
      subtitle:
        "Search the vanguardcard.io database, build a live pool, and open packs with rarity-style pulls and gorgeous card art.",
      ctaOpen: "Open packs",
      ctaCatalog: "Browse catalog",
      statLive: "Live data",
      statLiveSub: "vanguardcard.io",
      statBuilder: "Pack builder",
      statBuilderSub: "Rarity weighted pulls",
      statFilters: "Dynamic filters",
      statFiltersSub: "Grade, clan, rarity",
      logicTitle: "Pack logic",
      logicDesc: "Pull 4 commons + 1 rare slot by default.",
      tip: "Tip: Search by set name, clan, or ID to shape your pool.",
    },
    pack: {
      title: "Pack opener",
      subtitle: "Build a pool and open packs with rarity-weighted pulls.",
      pill: "Main focus",
      introTitle: "Pool setup",
      introDesc: "Pick a set, narrow by clan or nation, then open packs.",
      searchPool: "Search pool",
      clan: "Clan",
      nation: "Nation",
      packs: "Packs",
      cardsPerPack: "Cards per pack",
      open: "Open packs",
      opening: "Opening...",
      helper: "Uses vanguardcard.io card database.",
      statusSelect: "Select a pool or filters first.",
      statusLoadingAll: "Loading full card pool...",
      statusLoading: "Loading card pool...",
      statusNone: "No cards found for this search.",
      statusTry: "Try another search.",
      statusOpened: "Opened {count} pack{plural} from {total} cards.",
      statusSkip: "Click the results to skip the animation.",
      summaryTotal: "Total cards",
      summaryRarity: "Rarity mix",
    },
    catalog: {
      title: "Card catalog",
      subtitle: "Load the database and refine by grade, clan, rarity, or format.",
      pill: "Filters",
      search: "Search",
      searchPlaceholder: "Overlord, Royal Paladin, 411021",
      rarity: "Rarity",
      grade: "Grade",
      clan: "Clan",
      nation: "Nation",
      format: "Format",
      order: "Order",
      orderAsc: "A-Z",
      orderDesc: "Z-A",
      load: "Load catalog",
      statusLoading: "Loading catalog...",
      statusLoadingAll: "Loading full catalog...",
      statusNone: "No cards found for this search.",
      statusTry: "Try another search.",
      statusLoaded: "Loaded {count} cards.",
      statusUnavailable: "Catalog unavailable.",
    },
    common: {
      all: "All",
      allCards: "All cards",
      anyClan: "Any clan",
      anyNation: "Any nation",
      emptyResults: "No results.",
      building: "Building packs...",
      fetching: "Fetching cards...",
    },
    theme: { light: "Light", dark: "Dark" },
    lang: { en: "EN", pt: "PT-BR" },
  },
  pt: {
    nav: { subtitle: "Pack Lab", open: "Abrir packs", catalog: "Catalogo" },
    hero: {
      badge: "Laboratorio de packs",
      title: "Gire o pack. Puxe a lenda.",
      subtitle:
        "Pesquise o banco da vanguardcard.io, monte um pool e abra packs com raridades e artes incriveis.",
      ctaOpen: "Abrir packs",
      ctaCatalog: "Ver catalogo",
      statLive: "Dados ao vivo",
      statLiveSub: "vanguardcard.io",
      statBuilder: "Construtor de packs",
      statBuilderSub: "Probabilidades por raridade",
      statFilters: "Filtros dinamicos",
      statFiltersSub: "Grade, clan, raridade",
      logicTitle: "Logica do pack",
      logicDesc: "4 comuns + 1 slot raro por padrao.",
      tip: "Dica: pesquise por set, clan ou ID para montar o pool.",
    },
    pack: {
      title: "Abrir packs",
      subtitle: "Monte um pool e abra packs com raridades ponderadas.",
      pill: "Foco principal",
      introTitle: "Configurar pool",
      introDesc: "Escolha o set, filtre por clan ou nation e abra packs.",
      searchPool: "Pool",
      clan: "Clan",
      nation: "Nation",
      packs: "Packs",
      cardsPerPack: "Cartas por pack",
      open: "Abrir packs",
      opening: "Abrindo...",
      helper: "Usa o banco da vanguardcard.io.",
      statusSelect: "Escolha um pool ou filtros primeiro.",
      statusLoadingAll: "Carregando pool completo...",
      statusLoading: "Carregando pool...",
      statusNone: "Nenhuma carta encontrada.",
      statusTry: "Tente outra busca.",
      statusOpened: "Abriu {count} pack{plural} de {total} cartas.",
      statusSkip: "Clique nos resultados para pular a animacao.",
      summaryTotal: "Total de cartas",
      summaryRarity: "Mix de raridades",
    },
    catalog: {
      title: "Catalogo de cartas",
      subtitle: "Carregue o banco e filtre por grade, clan, raridade ou formato.",
      pill: "Filtros",
      search: "Buscar",
      searchPlaceholder: "Overlord, Royal Paladin, 411021",
      rarity: "Raridade",
      grade: "Grade",
      clan: "Clan",
      nation: "Nation",
      format: "Formato",
      order: "Ordem",
      orderAsc: "A-Z",
      orderDesc: "Z-A",
      load: "Carregar catalogo",
      statusLoading: "Carregando catalogo...",
      statusLoadingAll: "Carregando catalogo completo...",
      statusNone: "Nenhuma carta encontrada.",
      statusTry: "Tente outra busca.",
      statusLoaded: "{count} cartas carregadas.",
      statusUnavailable: "Catalogo indisponivel.",
    },
    common: {
      all: "Todos",
      allCards: "Todas as cartas",
      anyClan: "Qualquer clan",
      anyNation: "Qualquer nation",
      emptyResults: "Sem resultados.",
      building: "Montando packs...",
      fetching: "Buscando cartas...",
    },
    theme: { light: "Claro", dark: "Noturno" },
    lang: { en: "EN", pt: "PT-BR" },
  },
};

function t(key) {
  const parts = key.split(".");
  let value = I18N[currentLang];
  for (const part of parts) {
    value = value ? value[part] : null;
  }
  return value || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    element.setAttribute("placeholder", t(key));
  });

  if (themeToggle) {
    const nextMode = currentTheme === "dark" ? "light" : "dark";
    themeToggle.dataset.mode = nextMode;
    const label = nextMode === "light" ? t("theme.light") : t("theme.dark");
    themeToggle.setAttribute("aria-label", label);
    themeToggle.setAttribute("title", label);
  }

  if (langToggle) {
    const flag = langToggle.querySelector(".flag");
    const label = langToggle.querySelector(".flag-text");
    if (flag) {
      flag.classList.toggle("flag-us", currentLang === "en");
      flag.classList.toggle("flag-br", currentLang === "pt");
    }
    if (label) {
      label.textContent = currentLang === "en" ? t("lang.en") : t("lang.pt");
    }
  }
}

function refreshPackSelectLabels() {
  if (!packAllCardsCache) {
    return;
  }
  const sets = uniqueSorted(
    packAllCardsCache.map((card) => normalizeText(card.set)).filter(Boolean),
    false
  );
  const clans = uniqueSorted(
    packAllCardsCache.map((card) => normalizeText(card.clan)).filter(Boolean),
    false
  );
  const nations = uniqueSorted(
    packAllCardsCache.map((card) => normalizeText(card.nation)).filter(Boolean),
    false
  );
  setPackOptions(sets);
  if (packClan) {
    setSelectOptions(packClan, clans, t("common.anyClan"));
  }
  if (packNation) {
    setSelectOptions(packNation, nations, t("common.anyNation"));
  }
}

function applyTheme(theme) {
  currentTheme = theme;
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("cfv-theme", theme);
  applyTranslations();
}

function applyLanguage(lang) {
  currentLang = lang;
  document.body.setAttribute("data-lang", lang);
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  localStorage.setItem("cfv-lang", lang);
  applyTranslations();
  refreshPackSelectLabels();
  if (catalogCards.length) {
    buildFilters(catalogCards);
    renderCatalog();
  }
}

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

function resolveImage(card) {
  if (card.imageUrl) {
    return card.imageUrl;
  }
  if (card.id) {
    return `${IMAGE_BASE}/${encodeURIComponent(card.id)}-jp.jpg`;
  }
  return DEFAULT_IMAGE;
}

function cacheCard(card) {
  const key = normalizeText(card.id) || normalizeText(card.name);
  if (!key) {
    return "";
  }
  if (!cardCache.has(key)) {
    cardCache.set(key, { ...card });
  } else {
    const existing = cardCache.get(key);
    cardCache.set(key, { ...existing, ...card });
  }
  return key;
}

function formatEffect(text) {
  const safe = escapeHtml(normalizeText(text));
  return safe.replace(/\n/g, "<br />");
}

function buildMetaItem(label, value) {
  const display = normalizeText(value);
  if (!display || display.toLowerCase() === "n/a") {
    return "";
  }

  return `<div class="meta-item">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(display)}</strong>
  </div>`;
}

function setPackOptions(options) {
  if (!packQuery || packQuery.tagName !== "SELECT") {
    return;
  }

  const current = packQuery.value;
  packQuery.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = t("common.allCards");
  packQuery.appendChild(allOption);

  options.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    packQuery.appendChild(option);
  });

  packQuery.value = options.includes(current) ? current : "all";
}

async function loadPackOptions() {
  if (packOptionsLoaded) {
    return;
  }

  packOptionsLoaded = true;
  try {
    const response = await fetch(
      `/api/search?search=&limit=${MAX_RESULTS}&all=1&maxPages=10`
    );
    if (!response.ok) {
      setPackOptions([]);
      return;
    }

    const data = await response.json();
    const cards = data.cards || [];
    packAllCardsCache = cards;
    const sets = uniqueSorted(
      cards.map((card) => normalizeText(card.set)).filter(Boolean),
      false
    );
    const clans = uniqueSorted(
      cards.map((card) => normalizeText(card.clan)).filter(Boolean),
      false
    );
    const nations = uniqueSorted(
      cards.map((card) => normalizeText(card.nation)).filter(Boolean),
      false
    );
    setPackOptions(sets);
    if (packClan) {
      setSelectOptions(packClan, clans, t("common.anyClan"));
    }
    if (packNation) {
      setSelectOptions(packNation, nations, t("common.anyNation"));
    }
  } catch (error) {
    setPackOptions([]);
    if (packClan) {
      setSelectOptions(packClan, [], t("common.anyClan"));
    }
    if (packNation) {
      setSelectOptions(packNation, [], t("common.anyNation"));
    }
  }
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
    t("common.all")
  );
  setSelectOptions(
    filterGrade,
    uniqueSorted(cards.map((card) => normalizeText(card.grade)), true),
    t("common.all")
  );
  setSelectOptions(
    filterClan,
    uniqueSorted(cards.map((card) => normalizeText(card.clan)), false),
    t("common.all")
  );
  setSelectOptions(
    filterNation,
    uniqueSorted(cards.map((card) => normalizeText(card.nation)), false),
    t("common.all")
  );
  setSelectOptions(
    filterFormat,
    uniqueSorted(cards.map((card) => normalizeText(card.format)), false),
    t("common.all")
  );
}

function applyFilters(cards) {
  const rarity = normalizeText(filterRarity.value);
  const grade = normalizeText(filterGrade.value);
  const clan = normalizeText(filterClan.value);
  const nation = normalizeText(filterNation.value);
  const format = normalizeText(filterFormat.value);
  const order = normalizeText(filterOrder.value) || "asc";

  const filtered = cards.map((card, index) => ({ card, index })).filter((entry) => {
    const card = entry.card;
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

  const sorted = filtered.slice().sort((left, right) => {
    const a = left.card;
    const b = right.card;
    const aId = Number.parseInt(normalizeText(a.id), 10);
    const bId = Number.parseInt(normalizeText(b.id), 10);
    const aHasId = Number.isFinite(aId);
    const bHasId = Number.isFinite(bId);

    if (aHasId && bHasId) {
      return aId - bId;
    }
    if (aHasId) {
      return -1;
    }
    if (bHasId) {
      return 1;
    }
    return left.index - right.index;
  });

  const ordered = order === "desc" ? sorted.reverse() : sorted;
  return ordered.map((entry) => entry.card);
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
  const imageUrl = resolveImage(card);
  const cardKey = cacheCard(card);

  return `<article class="card-tile ${rarityClass}" data-card-key="${escapeHtml(
    cardKey
  )}">
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

function renderPack(pack, index, animate) {
  const cards = pack
    .map((card, cardIndex) => {
      if (!animate) {
        return renderCardTile(card);
      }
      const delay = 80 + cardIndex * 80;
      const tile = renderCardTile(card);
      return tile.replace(
        "<article",
        `<article style=\"animation-delay:${delay}ms\"`
      );
    })
    .join("");

  return `<article class="pack-result${animate ? " pack-animating" : ""}">
    <header>
      <span>Pack ${index + 1}</span>
      <span>${pack.length} cards</span>
    </header>
    <div class="pack-grid">${cards}</div>
  </article>`;
}

function skipPackAnimation() {
  if (!packAnimationActive || !lastOpenedPacks.length) {
    return false;
  }
  packAnimationActive = false;
  packResults.innerHTML = lastOpenedPacks
    .map((pack, index) => renderPack(pack, index, false))
    .join("");
  if (packStatus.textContent.includes(t("pack.statusSkip"))) {
    packStatus.textContent = packStatus.textContent.replace(
      ` ${t("pack.statusSkip")}`,
      ""
    );
  }
  return true;
}

function renderModal(card) {
  if (!cardModalBody) {
    return;
  }

  const rarityValue = normalizeText(card.rarity) || "UNKNOWN";
  const rarityClass = `rarity-${rarityValue.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const imageUrl = resolveImage(card);
  const metaItems = [
    buildMetaItem("Grade", card.grade),
    buildMetaItem("Power", card.power),
    buildMetaItem("Shield", card.shield),
    buildMetaItem("Rarity", rarityValue),
    buildMetaItem("Clan", card.clan),
    buildMetaItem("Nation", card.nation),
    buildMetaItem("Format", card.format),
    buildMetaItem("Set", card.set),
  ]
    .filter(Boolean)
    .join("");

  const mainEffect = formatEffect(card.mainEffect);
  const sourceEffect = formatEffect(card.sourceEffect);

  cardModalBody.innerHTML = `<div class="modal-card">
    <div>
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(card.name)}" />
    </div>
    <div>
      <div class="modal-title">
        <h3>${escapeHtml(card.name)}</h3>
        <span class="chip ${rarityClass}">${escapeHtml(rarityValue)}</span>
      </div>
      <p class="card-sub">ID ${escapeHtml(card.id || "-")}</p>
      <div class="modal-meta">${metaItems}</div>
      <div class="modal-effects">
        ${mainEffect ? `<p>${mainEffect}</p>` : ""}
        ${sourceEffect ? `<p class=\"muted\">${sourceEffect}</p>` : ""}
      </div>
      <div class="link-row">
        <a href="${escapeHtml(card.url)}" target="_blank" rel="noopener">View on vanguardcard.io</a>
      </div>
    </div>
  </div>`;
}

function openCardModal(card) {
  if (!cardModal) {
    return;
  }
  renderModal(card);
  cardModal.classList.add("is-open");
  cardModal.setAttribute("aria-hidden", "false");
}

function closeCardModal() {
  if (!cardModal) {
    return;
  }
  cardModal.classList.remove("is-open");
  cardModal.setAttribute("aria-hidden", "true");
}

function mergeCardDetails(base, extra) {
  if (!extra) {
    return base;
  }
  const merged = { ...base };
  Object.keys(extra).forEach((key) => {
    if (!merged[key] && extra[key]) {
      merged[key] = extra[key];
    }
  });
  return merged;
}

async function fetchCardDetails(card) {
  if (!card.id) {
    return card;
  }
  try {
    const response = await fetch(`/api/card?search=${encodeURIComponent(card.id)}`);
    if (!response.ok) {
      return card;
    }
    const data = await response.json();
    return mergeCardDetails(card, data);
  } catch (error) {
    return card;
  }
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
        <span class="percent">${percent}% (${count})</span>
      </div>`;
    })
    .join("");

  return `<div class="summary-grid">
    <div>
      <h3>${t("pack.summaryTotal")}</h3>
      <p>${summary.totalCards}</p>
    </div>
    <div>
      <h3>${t("pack.summaryRarity")}</h3>
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
  const trimmed = normalizeText(query);
  const all = trimmed ? "" : "&all=1&maxPages=10";
  const url = `/api/search?search=${encodeURIComponent(trimmed)}&limit=${MAX_RESULTS}${all}`;
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.detail || "Failed to fetch catalog";
    throw new Error(message);
  }
  return response.json();
}

async function handleOpenPacks() {
  const rawQuery = normalizeText(packQuery.value);
  const selectedClan = normalizeText(packClan?.value || "");
  const selectedNation = normalizeText(packNation?.value || "");
  let query = rawQuery.toLowerCase() === "all" ? "" : rawQuery;
  if (!query && (selectedClan || selectedNation)) {
    query = selectedClan || selectedNation;
  }
  const allowAll = !query;
  if (!query && !allowAll) {
    packStatus.textContent = t("pack.statusSelect");
    return;
  }

  const packCount = Math.max(1, Number(packCountInput.value || 1));
  const packSize = Math.max(1, Number(packSizeInput.value || 5));

  packStatus.textContent = allowAll
    ? t("pack.statusLoadingAll")
    : t("pack.statusLoading");
  packSummary.innerHTML = "";
  packResults.innerHTML =
    `<div class="empty-state">${t("common.building")}</div>`;
  setButtonLoading(openButton, true, t("pack.opening"));

  try {
    let pool = [];
    if (allowAll && Array.isArray(packAllCardsCache) && packAllCardsCache.length) {
      pool = packAllCardsCache;
    } else {
      const data = await fetchCatalog(query);
      pool = data.cards || [];
    }

    if (selectedClan) {
      pool = pool.filter(
        (card) => normalizeText(card.clan) === selectedClan
      );
    }
    if (selectedNation) {
      pool = pool.filter(
        (card) => normalizeText(card.nation) === selectedNation
      );
    }

    if (!pool.length) {
      packStatus.textContent = t("pack.statusNone");
      packResults.innerHTML =
        `<div class="empty-state">${t("pack.statusTry")}</div>`;
      return;
    }

    const packs = openPacks(pool, packCount, packSize);
    lastOpenedPacks = packs;
    packAnimationActive = true;
    packResults.innerHTML = packs
      .map((pack, index) => renderPack(pack, index, true))
      .join("");
    packSummary.innerHTML = renderSummary(summarizePacks(packs));
    const plural = packCount === 1 ? "" : "s";
    const baseStatus = t("pack.statusOpened")
      .replace("{count}", String(packCount))
      .replace("{plural}", plural)
      .replace("{total}", String(pool.length));
    packStatus.textContent = `${baseStatus} ${t("pack.statusSkip")}`;
  } catch (error) {
    packResults.innerHTML = `<div class="empty-state">${t("common.emptyResults")}</div>`;
    packStatus.textContent = error.message || t("common.emptyResults");
  } finally {
    setButtonLoading(openButton, false);
  }
}

function renderCatalog() {
  if (!catalogCards.length) {
    catalogResults.innerHTML =
      `<div class="empty-state">${t("common.emptyResults")}</div>`;
    return;
  }

  const filtered = applyFilters(catalogCards);
  if (!filtered.length) {
    catalogResults.innerHTML =
      `<div class="empty-state">${t("common.emptyResults")}</div>`;
    return;
  }

  catalogResults.innerHTML = `<div class=\"catalog-grid\">${filtered
    .map(renderCardTile)
    .join("")}</div>`;
}

async function handleCatalogLoad() {
  const query = normalizeText(catalogQuery.value);
  const statusLabel = query
    ? t("catalog.statusLoading")
    : t("catalog.statusLoadingAll");

  catalogStatus.textContent = statusLabel;
  catalogResults.innerHTML =
    `<div class="empty-state">${t("common.fetching")}</div>`;
  setButtonLoading(catalogButton, true, t("catalog.statusLoading"));

  try {
    const data = await fetchCatalog(query);
    catalogCards = data.cards || [];
    if (!catalogCards.length) {
      catalogStatus.textContent = t("catalog.statusNone");
      catalogResults.innerHTML =
        `<div class="empty-state">${t("catalog.statusTry")}</div>`;
      return;
    }

    buildFilters(catalogCards);
    renderCatalog();
    catalogStatus.textContent = t("catalog.statusLoaded").replace(
      "{count}",
      String(catalogCards.length)
    );
  } catch (error) {
    catalogStatus.textContent = error.message || t("catalog.statusUnavailable");
      catalogResults.innerHTML =
      `<div class="empty-state">${t("catalog.statusUnavailable")}</div>`;
  } finally {
    setButtonLoading(catalogButton, false);
  }
}

openButton.addEventListener("click", () => {
  handleOpenPacks().catch(() => {
    packStatus.textContent = "Unexpected error.";
  });
});

packResults.addEventListener("click", () => {
  skipPackAnimation();
});

document.addEventListener("click", (event) => {
  const target = event.target;

  if (target && target.closest && target.closest("[data-close='true']")) {
    closeCardModal();
    return;
  }

  const tile = target && target.closest ? target.closest(".card-tile") : null;
  if (!tile) {
    return;
  }

  if (packAnimationActive) {
    skipPackAnimation();
    return;
  }

  const key = tile.getAttribute("data-card-key");
  if (!key) {
    return;
  }

  const card = cardCache.get(key);
  if (!card) {
    return;
  }

  openCardModal(card);
  fetchCardDetails(card).then((updated) => {
    const merged = mergeCardDetails(card, updated);
    cardCache.set(key, merged);
    renderModal(merged);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCardModal();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const storedTheme = localStorage.getItem("cfv-theme");
  const storedLang = localStorage.getItem("cfv-lang");
  applyTheme(storedTheme || "dark");
  applyLanguage(storedLang || "en");

  loadPackOptions().catch(() => {
    setPackOptions([]);
  });
});

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  });
}

if (langToggle) {
  langToggle.addEventListener("click", () => {
    applyLanguage(currentLang === "en" ? "pt" : "en");
  });
}

catalogButton.addEventListener("click", () => {
  handleCatalogLoad().catch(() => {
    catalogStatus.textContent = "Unexpected error.";
  });
});

[filterRarity, filterGrade, filterClan, filterNation, filterFormat, filterOrder].forEach(
  (select) => {
    select.addEventListener("change", renderCatalog);
  }
);
