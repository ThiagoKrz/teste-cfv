const cardQuery = document.getElementById("cardQuery");
const cardButton = document.getElementById("cardButton");
const cardStatus = document.getElementById("cardStatus");
const cardResult = document.getElementById("cardResult");

const batchInput = document.getElementById("batchInput");
const batchButton = document.getElementById("batchButton");
const batchStatus = document.getElementById("batchStatus");
const batchResults = document.getElementById("batchResults");

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

function renderCard(card) {
  const rarityValue = normalizeText(card.rarity) || "UNKNOWN";
  const rarityClass = `rarity-${rarityValue.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  const metaItems = [
    buildMetaItem("Grade", card.grade),
    buildMetaItem("Power", card.power),
    buildMetaItem("Shield", card.shield),
    buildMetaItem("Clan", card.clan),
    buildMetaItem("Nation", card.nation),
    buildMetaItem("Format", card.format),
    buildMetaItem("Set", card.set),
  ]
    .filter(Boolean)
    .join("");

  const mainEffect = formatEffect(card.mainEffect);
  const sourceEffect = formatEffect(card.sourceEffect);

  return `<div class="card-result">
    <div class="card-art">
      <img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.name)}" />
    </div>
    <div class="card-info">
      <div class="card-title">
        <h3>${escapeHtml(card.name)}</h3>
        <span class="chip ${rarityClass}">${escapeHtml(rarityValue)}</span>
      </div>
      <p class="card-sub">ID ${escapeHtml(card.id || "-")} · ${
    escapeHtml(card.set || "Set not listed")
  }</p>
      <div class="card-meta-grid">${metaItems}</div>
      <div class="card-effects">
        ${mainEffect ? `<p>${mainEffect}</p>` : ""}
        ${
          sourceEffect
            ? `<p class="muted">${sourceEffect}</p>`
            : ""
        }
      </div>
      <div class="link-row">
        <a href="${escapeHtml(card.url)}" target="_blank" rel="noopener">View on vanguardcard.io</a>
      </div>
    </div>
  </div>`;
}

function renderMiniCard(card) {
  const rarityValue = normalizeText(card.rarity) || "UNKNOWN";
  const rarityClass = `rarity-${rarityValue.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  return `<div class="batch-card">
    <img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.name)}" />
    <div class="batch-title">${escapeHtml(card.name)}</div>
    <div class="batch-meta">
      <span class="chip ${rarityClass}">${escapeHtml(rarityValue)}</span>
      <span class="batch-id">ID ${escapeHtml(card.id || "-")}</span>
    </div>
  </div>`;
}

async function fetchCard(search) {
  const response = await fetch(`/api/card?search=${encodeURIComponent(search)}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.detail || "Failed to fetch card";
    throw new Error(message);
  }
  return response.json();
}

async function handleLookup() {
  const search = normalizeText(cardQuery.value);
  if (!search) {
    cardStatus.textContent = "Enter a card ID or name first.";
    return;
  }

  cardStatus.textContent = "Fetching card data...";
  cardResult.innerHTML = "<div class=\"empty-state\">Loading card...</div>";
  setButtonLoading(cardButton, true, "Searching...");

  try {
    const card = await fetchCard(search);
    cardResult.innerHTML = renderCard(card);
    cardStatus.textContent = `Found ${card.name}.`;
  } catch (error) {
    cardResult.innerHTML = "<div class=\"empty-state\">No results.</div>";
    cardStatus.textContent = error.message || "Search failed.";
  } finally {
    setButtonLoading(cardButton, false);
  }
}

function parseBatchInput(value) {
  return value
    .split(/[\n,]/g)
    .map((entry) => normalizeText(entry))
    .filter(Boolean)
    .slice(0, 8);
}

async function handleBatchLookup() {
  const ids = parseBatchInput(batchInput.value);
  if (!ids.length) {
    batchStatus.textContent = "Add at least one card ID.";
    return;
  }

  batchStatus.textContent = `Fetching ${ids.length} cards...`;
  batchResults.innerHTML = "<div class=\"empty-state\">Loading cards...</div>";
  setButtonLoading(batchButton, true, "Loading...");

  const cards = [];
  for (const id of ids) {
    try {
      // Fetch sequentially to avoid hammering the upstream site.
      const card = await fetchCard(id);
      cards.push(card);
      batchStatus.textContent = `Fetched ${cards.length} of ${ids.length}.`;
    } catch (error) {
      batchStatus.textContent = `Failed on ${id}: ${error.message}`;
    }
  }

  if (!cards.length) {
    batchResults.innerHTML = "<div class=\"empty-state\">No cards found.</div>";
  } else {
    batchResults.innerHTML = `<div class=\"batch-grid\">${cards
      .map(renderMiniCard)
      .join("")}</div>`;
  }

  setButtonLoading(batchButton, false);
}

cardButton.addEventListener("click", () => {
  handleLookup().catch(() => {
    cardStatus.textContent = "Unexpected error.";
  });
});

batchButton.addEventListener("click", () => {
  handleBatchLookup().catch(() => {
    batchStatus.textContent = "Unexpected error.";
  });
});
