const packSelect = document.getElementById("packSelect");
const packCount = document.getElementById("packCount");
const openButton = document.getElementById("openButton");
const openStatus = document.getElementById("openStatus");
const openSummary = document.getElementById("openSummary");
const openResults = document.getElementById("openResults");
const packTotal = document.getElementById("packTotal");

const catalogPack = document.getElementById("catalogPack");
const searchQuery = document.getElementById("searchQuery");
const rarityFilter = document.getElementById("rarityFilter");
const clanFilter = document.getElementById("clanFilter");
const catalogButton = document.getElementById("catalogButton");
const catalogStatus = document.getElementById("catalogStatus");
const catalogResults = document.getElementById("catalogResults");

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

async function loadPacks() {
  const response = await fetch("/api/packs");
  const data = await response.json();
  const packs = data.packs || [];

  packSelect.innerHTML = "";
  catalogPack.innerHTML = "";

  packs.forEach((pack) => {
    const option = document.createElement("option");
    option.value = pack;
    option.textContent = pack;
    packSelect.appendChild(option);

    const optionClone = option.cloneNode(true);
    catalogPack.appendChild(optionClone);
  });

  if (packs.length === 0) {
    openStatus.textContent = "No packs found in /packs";
    catalogStatus.textContent = "No packs found in /packs";
    openResults.innerHTML =
      '<div class="empty-state">Add CSV packs to /packs to start opening.</div>';
  } else {
    openResults.innerHTML =
      '<div class="empty-state">Open packs to see pulls here.</div>';
  }

  if (packTotal) {
    packTotal.textContent = packs.length ? String(packs.length) : "0";
  }
}

function renderCard(card) {
  const rarity = (card.rarity || "UNKNOWN").toUpperCase();
  const rarityClass = `rarity-${rarity.toLowerCase()}`;
  const cardId = card.set ? `${card.set}-${card.id}` : card.id;

  return `<li class="card ${rarityClass}">
    <div class="card-head">
      <strong>${card.name}</strong>
      <span class="chip">${rarity}</span>
    </div>
    <div class="card-meta">${card.clan} | Grade ${card.grade} | ${card.type}</div>
    <div class="card-id">${cardId}</div>
  </li>`;
}

function renderPack(pack, index) {
  const cards = pack.map(renderCard).join("");
  return `<article class="pack-result">
    <header>
      <span>Pack ${index + 1}</span>
      <span>${pack.length} cards</span>
    </header>
    <ul>${cards}</ul>
  </article>`;
}

function renderSummary(summary) {
  if (!summary) {
    return "";
  }

  const byRarity = summary.by_rarity || {};
  const totalCards = summary.total_cards || 0;
  const order = ["SP", "RRR", "RR", "R", "C", "UNKNOWN"];
  const rows = order
    .filter((rarity) => byRarity[rarity])
    .map((rarity) => {
      const count = byRarity[rarity];
      const percent = totalCards
        ? Math.round((count / totalCards) * 100)
        : 0;
      const rarityClass = `rarity-${rarity.toLowerCase()}`;
      return `<div class="rarity-row">
        <span class="chip ${rarityClass}">${rarity}</span>
        <div class="bar"><span style="width: ${percent}%"></span></div>
        <span class="percent">${percent}%</span>
      </div>`;
    })
    .join("");

  return `<div class="summary-grid">
    <div>
      <h3>Total cards</h3>
      <p>${totalCards}</p>
    </div>
    <div>
      <h3>Rarity mix</h3>
      <div class="rarity-rows">${rows}</div>
    </div>
  </div>`;
}

async function openPacks() {
  openStatus.textContent = "Opening packs...";
  openSummary.innerHTML = "";
  openResults.innerHTML =
    '<div class="empty-state">Ripping packs...</div>';
  setButtonLoading(openButton, true, "Opening...");

  const payload = {
    pack: packSelect.value,
    count: Number(packCount.value || 1),
  };

  try {
    const response = await fetch("/api/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      openStatus.textContent = error.detail || "Failed to open packs";
      openResults.innerHTML =
        '<div class="empty-state">No results to show.</div>';
      return;
    }

    const data = await response.json();
    openSummary.innerHTML = renderSummary(data.summary);
    openResults.innerHTML = data.packs.map(renderPack).join("");
    openStatus.textContent = `Opened ${data.count} pack${
      data.count === 1 ? "" : "s"
    }.`;
  } finally {
    setButtonLoading(openButton, false);
  }
}

async function loadCatalog() {
  catalogStatus.textContent = "Loading catalog...";
  catalogResults.innerHTML = "";
  setButtonLoading(catalogButton, true, "Loading...");

  const params = new URLSearchParams();
  if (searchQuery.value.trim()) {
    params.set("q", searchQuery.value.trim());
  }
  if (rarityFilter.value) {
    params.set("rarity", rarityFilter.value);
  }
  if (clanFilter.value.trim()) {
    params.set("clan", clanFilter.value.trim());
  }

  const url = `/api/packs/${catalogPack.value}/cards?${params.toString()}`;
  try {
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      catalogStatus.textContent = error.detail || "Failed to load catalog";
      return;
    }

    const data = await response.json();
    if (!data.cards || data.cards.length === 0) {
      catalogStatus.textContent = "No cards found for this filter";
      catalogResults.innerHTML =
        '<li class="empty-state">No cards found.</li>';
      return;
    }

    catalogResults.innerHTML = data.cards
      .slice(0, 60)
      .map(renderCard)
      .join("");
    catalogStatus.textContent = `Showing ${Math.min(
      60,
      data.cards.length
    )} cards.`;
  } finally {
    setButtonLoading(catalogButton, false);
  }
}

openButton.addEventListener("click", () => {
  openPacks().catch(() => {
    openStatus.textContent = "Unexpected error";
  });
});

catalogButton.addEventListener("click", () => {
  loadCatalog().catch(() => {
    catalogStatus.textContent = "Unexpected error";
  });
});

loadPacks().catch(() => {
  openStatus.textContent = "Failed to load packs";
  catalogStatus.textContent = "Failed to load packs";
  openResults.innerHTML =
    '<div class="empty-state">API not reachable.</div>';
});
