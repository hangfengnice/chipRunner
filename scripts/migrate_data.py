#!/usr/bin/env python3
"""把历史 Markdown 数据整理成前端可直接消费的 JSON。"""

from __future__ import annotations

import json
import re
from pathlib import Path

from tracking_tool import FULL_HEADERS, parse_markdown


ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
CALENDAR_DIR = ROOT / "data" / "calendar"
TRACKING_DIR = ROOT / "data" / "tracking"

CALENDAR_FILES = [
    "2026-remaining-trading-dates.md",
    "2027-estimated-trading-dates.md",
    "2028-estimated-trading-dates.md",
    "2029-estimated-trading-dates.md",
    "2030-estimated-trading-dates.md",
]

TRACKING_FILES = [
    "2026-tracking-total-table.md",
    "2026-2028-tracking-total-table.md",
]

CALENDAR_ROW_RE = re.compile(
    r"^\|\s*(\d+)\s*\|\s*(\d{4}\.\d{2}\.\d{2})\s*\|\s*(\d{4}\.\d{2})\s*\|\s*$"
)
BACKTICK_DATE_RE = re.compile(r"`(\d{4}\.\d{2}\.\d{2})`")


def write_json(file_path: Path, payload: object) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def parse_calendar_file(source_path: Path) -> dict:
    text = source_path.read_text(encoding="utf-8")
    lines = text.splitlines()

    title = ""
    rows = []
    months: dict[str, list[str]] = {}
    holidays_excluded: list[str] = []

    for line in lines:
        if not title and line.startswith("# "):
            title = line.removeprefix("# ").strip()

        row_match = CALENDAR_ROW_RE.match(line.strip())
        if row_match:
            index, date, month = row_match.groups()
            rows.append({
                "index": int(index),
                "date": date,
                "month": month,
            })
            months.setdefault(month, []).append(date)
            continue

        stripped = line.strip()
        if stripped.startswith("-") and "`" in stripped:
            matched_dates = BACKTICK_DATE_RE.findall(stripped)
            if matched_dates and "日期" not in stripped and "月份" not in stripped:
                holidays_excluded.extend(matched_dates)

    dates = [row["date"] for row in rows]
    year = int(dates[0][:4]) if dates else int(source_path.name[:4])

    return {
        "sourceFile": source_path.relative_to(ROOT).as_posix(),
        "title": title,
        "year": year,
        "dateFrom": dates[0] if dates else "",
        "dateTo": dates[-1] if dates else "",
        "totalTradingDays": len(dates),
        "holidaysExcluded": holidays_excluded,
        "dates": dates,
        "months": months,
        "rows": rows,
    }


def to_optional_int(value: str) -> int | None:
    stripped = value.strip()
    return int(stripped) if stripped else None


def to_optional_float(value: str) -> float | None:
    stripped = value.strip()
    return float(stripped) if stripped else None


def parse_tracking_file(source_path: Path) -> dict:
    parsed = parse_markdown(source_path)

    row_payload = []
    for _, cols in parsed.rows:
        row_payload.append(
            {
                "date": cols[0],
                "targetShares": int(cols[1]),
                "tProfit": float(cols[2]),
                "targetCash": float(cols[3]),
                "targetAssets": float(cols[4]),
                "actualShares": to_optional_int(cols[5]),
                "actualCash": to_optional_float(cols[6]),
                "cashDelta": cols[7],
                "closePrice": to_optional_float(cols[8]),
                "actualTotalAssets": to_optional_float(cols[9]),
                "shareDiff": cols[10],
                "assetDiff": cols[11],
                "targetMatchedDate": cols[12],
                "progressDelta": cols[13],
                "totalAssetRatio": cols[14],
            }
        )

    return {
        "sourceFile": source_path.relative_to(ROOT).as_posix(),
        "headers": FULL_HEADERS,
        "params": {
            "startDate": parsed.params.start_date,
            "initialShares": parsed.params.initial_shares,
            "initialCash": parsed.params.initial_cash,
            "price": parsed.params.price,
            "spread": parsed.params.spread,
            "lotCost": parsed.params.lot_cost,
        },
        "dateFrom": row_payload[0]["date"] if row_payload else "",
        "dateTo": row_payload[-1]["date"] if row_payload else "",
        "rowCount": len(row_payload),
        "rows": row_payload,
    }


def main() -> int:
    for file_name in CALENDAR_FILES:
        source_path = DOCS_DIR / file_name
        payload = parse_calendar_file(source_path)
        write_json(CALENDAR_DIR / file_name.replace(".md", ".json"), payload)

    for file_name in TRACKING_FILES:
        source_path = DOCS_DIR / file_name
        payload = parse_tracking_file(source_path)
        write_json(TRACKING_DIR / file_name.replace(".md", ".json"), payload)

    print("数据迁移完成")
    print(f"calendar: {len(CALENDAR_FILES)}")
    print(f"tracking: {len(TRACKING_FILES)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())