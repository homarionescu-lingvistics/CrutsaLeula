#!/usr/bin/env python3
"""
Scrape live brand data from urmarestebanii.ro and upsert into Supabase.

Install:
  pip install requests beautifulsoup4 supabase pandas python-dotenv json5

Env (.env or .env.local):
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
"""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import json5
import pandas as pd
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import Client, create_client

BASE_URL = "https://urmarestebanii.ro"
DEFAULT_BARCODE_PREFIX = "594"
BATCH_SIZE = 100
SUPERMARKET_KEYWORDS = (
    "lidl",
    "kaufland",
    "mega image",
    "auchan",
    "profi",
    "penny",
    "carrefour",
    "metro",
    "selgros",
)


def load_env() -> None:
    root = Path(__file__).resolve().parents[1]
    load_dotenv(root / ".env")
    load_dotenv(root / ".env.local")


def get_supabase() -> Client:
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError(
            "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
        )
    return create_client(url, key)


def discover_data_url(session: requests.Session) -> str:
    response = session.get(BASE_URL, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    for script in soup.find_all("script", src=True):
        src = script["src"]
        if "date.js" in src:
            return urljoin(BASE_URL, src)
    return f"{BASE_URL}/date.js"


def fetch_brand_dataset(session: requests.Session) -> dict[str, Any]:
    data_url = discover_data_url(session)
    print(f"Fetching dataset: {data_url}")
    response = session.get(data_url, timeout=30)
    response.raise_for_status()
    response.encoding = "utf-8"
    body = re.sub(r"^[\s\S]*?const DATE = ", "", response.text).strip().rstrip(";")
    return json5.loads(body)


def is_supermarket_brand(name: str, category_id: str) -> bool:
    lowered = name.lower()
    if category_id == "supermarketuri":
        return True
    return any(keyword in lowered for keyword in SUPERMARKET_KEYWORDS)


def map_brand(section: str, brand_name: str, category_id: str) -> tuple[int, int]:
    if section == "romanesti":
        return 5, 100
    if is_supermarket_brand(brand_name, category_id):
        return 2, 0
    return 2, 0


def extract_rows(dataset: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for category in dataset.get("categorii", []):
        category_id = category.get("id", "general")
        category_name = category.get("nume", category_id)

        for section in ("straine", "romanesti"):
            for entry in category.get(section, []) or []:
                brand_name = str(entry.get("brand", "")).strip()
                if not brand_name:
                    continue
                tip, retention = map_brand(section, brand_name, category_id)
                rows.append(
                    {
                        "nume_brand": brand_name,
                        "cod_bare_prefix": DEFAULT_BARCODE_PREFIX,
                        "cui": None,
                        "categorie_tip": tip,
                        "procent_retentie_ron": retention,
                        "brand_alternativ_id": None,
                        "_category_id": category_id,
                        "_category_name": category_name,
                        "_section": section,
                    }
                )

    if not rows:
        return []

    df = pd.DataFrame(rows)
    duplicate_names = df["nume_brand"].duplicated(keep=False)
    df.loc[duplicate_names, "nume_brand"] = (
        df.loc[duplicate_names, "nume_brand"]
        + " — "
        + df.loc[duplicate_names, "_category_name"]
    )
    return df.to_dict(orient="records")


def fetch_existing_ids(client: Client, names: list[str]) -> dict[str, str]:
    existing: dict[str, str] = {}
    for i in range(0, len(names), BATCH_SIZE):
        chunk = names[i : i + BATCH_SIZE]
        result = (
            client.table("branduri_romanitate")
            .select("id, nume_brand")
            .in_("nume_brand", chunk)
            .execute()
        )
        for row in result.data or []:
            existing[row["nume_brand"]] = row["id"]
    return existing


def upsert_brands(client: Client, rows: list[dict[str, Any]]) -> dict[str, str]:
    payload = [
        {
            "nume_brand": row["nume_brand"],
            "cod_bare_prefix": row["cod_bare_prefix"],
            "cui": row["cui"],
            "categorie_tip": row["categorie_tip"],
            "procent_retentie_ron": row["procent_retentie_ron"],
        }
        for row in rows
    ]

    names = [row["nume_brand"] for row in rows]
    existing = fetch_existing_ids(client, names)
    to_insert = [item for item in payload if item["nume_brand"] not in existing]
    to_update = [item for item in payload if item["nume_brand"] in existing]

    for i in range(0, len(to_insert), BATCH_SIZE):
        chunk = to_insert[i : i + BATCH_SIZE]
        if chunk:
            client.table("branduri_romanitate").insert(chunk).execute()

    for item in to_update:
        brand_id = existing[item["nume_brand"]]
        client.table("branduri_romanitate").update(
            {
                "cod_bare_prefix": item["cod_bare_prefix"],
                "cui": item["cui"],
                "categorie_tip": item["categorie_tip"],
                "procent_retentie_ron": item["procent_retentie_ron"],
            }
        ).eq("id", brand_id).execute()

    return fetch_existing_ids(client, names)


def attach_alternatives(
    client: Client, rows: list[dict[str, Any]], id_by_name: dict[str, str]
) -> int:
    romanian_by_category: dict[str, list[str]] = {}
    for row in rows:
        if row["categorie_tip"] != 5:
            continue
        romanian_by_category.setdefault(row["_category_id"], []).append(row["nume_brand"])

    updates = 0
    for row in rows:
        if row["categorie_tip"] != 2:
            continue
        alternatives = romanian_by_category.get(row["_category_id"], [])
        if not alternatives:
            continue
        alt_name = alternatives[0]
        alt_id = id_by_name.get(alt_name)
        brand_id = id_by_name.get(row["nume_brand"])
        if not alt_id or not brand_id or alt_id == brand_id:
            continue
        client.table("branduri_romanitate").update(
            {"brand_alternativ_id": alt_id}
        ).eq("id", brand_id).execute()
        updates += 1
    return updates


def main() -> int:
    load_env()
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (compatible; CrutsaLeulaBrandScraper/1.0)"
            )
        }
    )

    try:
        dataset = fetch_brand_dataset(session)
        rows = extract_rows(dataset)
        if not rows:
            print("No brands extracted.", file=sys.stderr)
            return 1

        client = get_supabase()
        id_by_name = upsert_brands(client, rows)
        linked = attach_alternatives(client, rows, id_by_name)

        tip5 = sum(1 for row in rows if row["categorie_tip"] == 5)
        tip2 = sum(1 for row in rows if row["categorie_tip"] == 2)
        print(f"Extracted: {len(rows)} brands (tip 5: {tip5}, tip 2: {tip2})")
        print(f"Alternatives linked: {linked}")
        print("Done.")
        return 0
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
