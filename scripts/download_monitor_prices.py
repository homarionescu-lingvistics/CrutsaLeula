#!/usr/bin/env python3
"""Download retail prices from Monitorul Prețurilor and upsert into Supabase."""

from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from supabase import Client, create_client

URL_BASE = "https://monitorulpreturilor.info/pmonsvc/Retail/"
UAT_ID = 179132
CATEGORY_IDS = range(1, 22)
PRODUCT_BATCH_SIZE = 80
REQUEST_TIMEOUT = 60
REQUEST_DELAY_SEC = 0.3

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env.local")


def get_supabase_client() -> Client:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
        )
    return create_client(url, key)


def fetch_json(session: requests.Session, endpoint: str, params: dict[str, Any]) -> Any:
    url = f"{URL_BASE}{endpoint}"
    response = session.get(url, params=params, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response.json()


def extract_product_ids(payload: Any) -> list[int]:
    ids: set[int] = set()

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                key_lower = str(key).lower()
                if key_lower in {"id", "productid", "prodid", "product_id"}:
                    if isinstance(value, int) and value > 0:
                        ids.add(value)
                    elif isinstance(value, str) and value.isdigit():
                        ids.add(int(value))
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(payload)
    return sorted(ids)


def chunked(items: list[int], size: int) -> list[list[int]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def first_present(data: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return None


def normalize_store_records(payload: Any, fetched_at: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    items = payload.get("Items") if isinstance(payload, dict) else payload
    if not isinstance(items, list):
        return records

    for item in items:
        if not isinstance(item, dict):
            continue

        store_id = first_present(item, "StoreId", "storeId", "Id", "id")
        store_name = first_present(item, "StoreName", "storeName", "Name", "name")
        network_name = first_present(
            item,
            "NetworkName",
            "networkName",
            "RetailNetworkName",
            "retailNetworkName",
        )
        address = first_present(item, "Address", "address", "StoreAddress", "storeAddress")

        products = first_present(item, "Products", "products", "Items", "items")
        if not isinstance(products, list):
            products = [item]

        for product in products:
            if not isinstance(product, dict):
                continue

            product_id = first_present(product, "ProductId", "productId", "Id", "id")
            if product_id is None:
                continue

            try:
                product_id_int = int(product_id)
            except (TypeError, ValueError):
                continue

            price = as_float(first_present(product, "Price", "price", "RetailPrice", "retailPrice"))
            if price is None:
                continue

            product_name = first_present(
                product,
                "ProductName",
                "productName",
                "Name",
                "name",
            )

            record: dict[str, Any] = {
                "product_id": product_id_int,
                "product_name": product_name,
                "store_id": int(store_id) if store_id is not None else None,
                "store_name": store_name,
                "network_name": network_name,
                "address": address,
                "price": price,
                "uat_id": UAT_ID,
                "fetched_at": fetched_at,
            }
            records.append(record)

    deduped: dict[tuple[int, int | None], dict[str, Any]] = {}
    for record in records:
        key = (record["product_id"], record["store_id"])
        deduped[key] = record
    return list(deduped.values())


def upsert_records(client: Client, records: list[dict[str, Any]], batch_size: int = 500) -> int:
    total = 0
    for batch in chunked_ids_records(records, batch_size):
        client.table("preturi_monitor").upsert(
            batch,
            on_conflict="product_id,store_id",
        ).execute()
        total += len(batch)
    return total


def chunked_ids_records(records: list[dict[str, Any]], size: int) -> list[list[dict[str, Any]]]:
    return [records[i : i + size] for i in range(0, len(records), size)]


def main() -> int:
    fetched_at = datetime.now(timezone.utc).isoformat()
    session = requests.Session()
    session.headers.update(
        {
            "Accept": "application/json",
            "User-Agent": "CrutsaLeulaPriceSync/1.0",
        }
    )

    all_product_ids: set[int] = set()

    print(f"Fetching product IDs for categories {CATEGORY_IDS.start}..{CATEGORY_IDS.stop - 1}")
    for category_id in CATEGORY_IDS:
        try:
            payload = fetch_json(
                session,
                "GetCatalogProductsByNameNetwork",
                {"CSVcategids": str(category_id)},
            )
            category_ids = extract_product_ids(payload)
            all_product_ids.update(category_ids)
            print(f"  category {category_id}: {len(category_ids)} products")
        except requests.RequestException as exc:
            print(f"  category {category_id}: request failed ({exc})", file=sys.stderr)
        time.sleep(REQUEST_DELAY_SEC)

    product_ids = sorted(all_product_ids)
    print(f"Total unique product IDs: {len(product_ids)}")
    if not product_ids:
        print("No product IDs found. Exiting.")
        return 1

    all_records: list[dict[str, Any]] = []
    batches = chunked(product_ids, PRODUCT_BATCH_SIZE)
    print(f"Fetching store prices in {len(batches)} batches")

    for index, batch in enumerate(batches, start=1):
        params = {
            "uatId": str(UAT_ID),
            "csvprodids": ",".join(str(pid) for pid in batch),
            "csvnetworkids": "",
            "OrderBy": "price",
        }
        try:
            payload = fetch_json(session, "GetStoresForProductsByUat", params)
            batch_records = normalize_store_records(payload, fetched_at)
            all_records.extend(batch_records)
            print(f"  batch {index}/{len(batches)}: {len(batch_records)} price rows")
        except requests.RequestException as exc:
            print(f"  batch {index}/{len(batches)}: request failed ({exc})", file=sys.stderr)
        time.sleep(REQUEST_DELAY_SEC)

    if not all_records:
        print("No price records to upsert. Exiting.")
        return 1

    client = get_supabase_client()
    inserted = upsert_records(client, all_records)
    print(f"Upserted {inserted} rows into preturi_monitor")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
