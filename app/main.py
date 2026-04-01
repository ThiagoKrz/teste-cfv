from __future__ import annotations

import csv
import random
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parents[1]
PACKS_DIR = BASE_DIR / "packs"
PUBLIC_DIR = BASE_DIR / "public"
STATIC_DIR = PUBLIC_DIR / "static"

app = FastAPI(title="CFVanguard Pack Simulator", version="0.1.0")

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class OpenRequest(BaseModel):
    pack: str = Field(..., min_length=1)
    count: int = Field(1, ge=1, le=100)


def list_pack_names() -> List[str]:
    if not PACKS_DIR.exists():
        return []
    return sorted(path.stem for path in PACKS_DIR.glob("*.csv"))


def load_pack_cards(pack: str) -> List[Dict[str, str]]:
    path = PACKS_DIR / f"{pack}.csv"
    if not path.exists():
        raise FileNotFoundError(pack)

    with path.open("r", newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        cards = []
        for row in reader:
            cards.append(
                {
                    "set": row.get("set", "").strip(),
                    "id": row.get("id", "").strip(),
                    "name": row.get("name", "").strip(),
                    "grade": row.get("grade", "").strip(),
                    "clan": row.get("clan", "").strip(),
                    "type": row.get("type", "").strip(),
                    "rarity": row.get("rarity", "").strip(),
                }
            )
        return cards


def sample_cards(pool: List[Dict[str, str]], count: int) -> List[Dict[str, str]]:
    if not pool:
        return []
    if len(pool) >= count:
        return random.sample(pool, count)
    return random.choices(pool, k=count)


def roll_rarity() -> str:
    roll = random.randint(1, 100)
    if roll <= 70:
        return "R"
    if roll <= 90:
        return "RR"
    if roll <= 99:
        return "RRR"
    return "SP"


def pick_rare(cards: List[Dict[str, str]]) -> List[Dict[str, str]]:
    rarity = roll_rarity()
    pool = [card for card in cards if card["rarity"] == rarity]
    rare = sample_cards(pool, 1)
    if rare:
        return rare

    for fallback in ["RRR", "RR", "R", "C"]:
        pool = [card for card in cards if card["rarity"] == fallback]
        rare = sample_cards(pool, 1)
        if rare:
            return rare

    return []


def open_single_pack(cards: List[Dict[str, str]]) -> List[Dict[str, str]]:
    commons_pool = [card for card in cards if card["rarity"] == "C"]
    commons = sample_cards(commons_pool, 4)
    rare = pick_rare(cards)
    return commons + rare


def open_many_packs(cards: List[Dict[str, str]], count: int) -> List[List[Dict[str, str]]]:
    return [open_single_pack(cards) for _ in range(count)]


def summarize_packs(packs: List[List[Dict[str, str]]]) -> Dict[str, object]:
    by_rarity: Dict[str, int] = {}
    total_cards = 0
    for opened_pack in packs:
        for card in opened_pack:
            total_cards += 1
            rarity = card.get("rarity", "") or "UNKNOWN"
            by_rarity[rarity] = by_rarity.get(rarity, 0) + 1
    return {"by_rarity": by_rarity, "total_cards": total_cards}


def filter_cards(
    cards: List[Dict[str, str]],
    query: Optional[str],
    rarity: Optional[str],
    clan: Optional[str],
    card_type: Optional[str],
    grade: Optional[str],
) -> List[Dict[str, str]]:
    filtered = cards
    if query:
        query_lower = query.lower()
        filtered = [
            card
            for card in filtered
            if query_lower in card.get("name", "").lower()
            or query_lower in card.get("id", "").lower()
        ]
    if rarity:
        filtered = [card for card in filtered if card.get("rarity") == rarity]
    if clan:
        clan_lower = clan.lower()
        filtered = [card for card in filtered if clan_lower in card.get("clan", "").lower()]
    if card_type:
        type_lower = card_type.lower()
        filtered = [card for card in filtered if type_lower in card.get("type", "").lower()]
    if grade:
        filtered = [card for card in filtered if card.get("grade") == grade]
    return filtered


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    index_path = PUBLIC_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="index.html not found")
    return FileResponse(index_path)


@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/packs")
def get_packs() -> Dict[str, List[str]]:
    return {"packs": list_pack_names()}


@app.get("/api/packs/{pack}/cards")
def get_pack_cards(
    pack: str,
    q: Optional[str] = Query(None, min_length=1),
    rarity: Optional[str] = Query(None, min_length=1),
    clan: Optional[str] = Query(None, min_length=1),
    card_type: Optional[str] = Query(None, min_length=1, alias="type"),
    grade: Optional[str] = Query(None, min_length=1),
) -> Dict[str, List[Dict[str, str]]]:
    try:
        cards = load_pack_cards(pack.upper())
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Pack not found")

    filtered = filter_cards(cards, q, rarity, clan, card_type, grade)
    return {"pack": pack.upper(), "cards": filtered}


@app.post("/api/open")
def open_packs(request: OpenRequest) -> Dict[str, object]:
    pack_name = request.pack.upper()
    try:
        cards = load_pack_cards(pack_name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Pack not found")

    opened = open_many_packs(cards, request.count)
    summary = summarize_packs(opened)

    return {
        "pack": pack_name,
        "count": request.count,
        "packs": opened,
        "summary": summary,
    }
