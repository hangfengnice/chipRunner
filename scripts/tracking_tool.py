#!/usr/bin/env python3
"""跟踪总表工具：支持一键重算、区间提取、分页查看与进度定位。"""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple


FULL_HEADERS = [
    "日期",
    "目标股",
    "做T利润",
    "目标现",
    "目标资产",
    "实盘股",
    "实盘现",
    "做T差额",
    "收盘价",
    "实盘总资产",
    "股数差额",
    "资产差额",
    "目标对应日期",
    "进度差",
    "总资产百分比",
]

FULL_ALIGN = [
    "---",
    "---:",
    "---:",
    "---:",
    "---:",
    "---:",
    "---:",
    "---",
    "---:",
    "---:",
    "---",
    "---",
    "---",
    "---",
    "---",
    "---",
]

CORE_HEADERS = ["日期", "目标股", "做T利润", "目标现", "目标资产"]
CORE_ALIGN = ["---", "---:", "---:", "---:", "---:"]


PARAM_LABELS = {
    "起始交易日": "start_date",
    "初始持股": "initial_shares",
    "初始现金": "initial_cash",
    "固定价格": "price",
    "每股每日可获取差价": "spread",
    "每手成本": "lot_cost",
}


@dataclass
class ModelParams:
    start_date: str
    initial_shares: int
    initial_cash: float
    price: float
    spread: float
    lot_cost: float


@dataclass
class ParsedTable:
    lines: List[str]
    params: ModelParams
    param_line_map: dict
    data_start_idx: int
    rows: List[Tuple[int, List[str]]]
    had_trailing_newline: bool


def parse_markdown(file_path: Path) -> ParsedTable:
    text = file_path.read_text(encoding="utf-8")
    had_trailing_newline = text.endswith("\n")
    lines = text.splitlines()

    params = {}
    param_line_map = {}
    for idx, line in enumerate(lines):
        m = re.match(r"^\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$", line)
        if not m:
            continue
        key, value = m.group(1), m.group(2)
        if key in PARAM_LABELS:
            params[PARAM_LABELS[key]] = value
            param_line_map[key] = idx

    missing = [k for k in PARAM_LABELS.values() if k not in params]
    if missing:
        raise ValueError(f"模型参数缺失: {missing}")

    model = ModelParams(
        start_date=params["start_date"],
        initial_shares=int(float(params["initial_shares"])),
        initial_cash=float(params["initial_cash"]),
        price=float(params["price"]),
        spread=float(params["spread"]),
        lot_cost=float(params["lot_cost"]),
    )

    header_idx = -1
    sep_idx = -1
    for i, line in enumerate(lines):
        if line.strip().startswith("| 日期 |"):
            header_idx = i
            if i + 1 < len(lines) and lines[i + 1].strip().startswith("| ---"):
                sep_idx = i + 1
            break
    if header_idx == -1 or sep_idx == -1:
        raise ValueError("未找到跨年总表的表头")

    rows = []
    for i in range(sep_idx + 1, len(lines)):
        line = lines[i]
        if not line.strip().startswith("|"):
            continue
        cols = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cols) == 14:
            cols = cols[:12] + ["", "", cols[13]]
        elif len(cols) != 15:
            continue
        if not re.match(r"^\d{4}\.\d{2}\.\d{2}$", cols[0]):
            continue
        rows.append((i, cols))

    if not rows:
        raise ValueError("未解析到数据行")

    return ParsedTable(
        lines=lines,
        params=model,
        param_line_map=param_line_map,
        data_start_idx=sep_idx + 1,
        rows=rows,
        had_trailing_newline=had_trailing_newline,
    )


def fmt_float(v: float) -> str:
    return f"{v:.2f}"


def find_row_index_by_date(parsed: ParsedTable, date: str) -> int | None:
    for idx, (_, cols) in enumerate(parsed.rows):
        if cols[0] == date:
            return idx
    return None


def find_target_date_by_assets(parsed: ParsedTable, total_assets: float) -> int | None:
    for idx, (_, cols) in enumerate(parsed.rows):
        if float(cols[4]) >= total_assets:
            return idx
    return None


def recalc_rows(parsed: ParsedTable, pre_days: int | None = None) -> None:
    params = parsed.params
    first_date = parsed.rows[0][1][0]
    if pre_days is None:
        pre_days = 0 if first_date == params.start_date else 1

    shares = int(params.initial_shares)
    cash = float(params.initial_cash)

    for _ in range(max(pre_days, 0)):
        t_profit = shares * params.spread
        cash += t_profit
        lots = int(cash // params.lot_cost)
        if lots > 0:
            shares += lots * 100
            cash -= lots * params.lot_cost

    for line_idx, cols in parsed.rows:
        t_profit = shares * params.spread
        cash += t_profit
        lots = int(cash // params.lot_cost)
        if lots > 0:
            shares += lots * 100
            cash -= lots * params.lot_cost
        assets = shares * params.price + cash

        cols[1] = str(shares)
        cols[2] = fmt_float(t_profit)
        cols[3] = fmt_float(cash)
        cols[4] = fmt_float(assets)

        parsed.lines[line_idx] = "| " + " | ".join(cols) + " |"


def update_params_in_text(parsed: ParsedTable) -> None:
    reverse_map = {v: k for k, v in PARAM_LABELS.items()}
    values = {
        "start_date": parsed.params.start_date,
        "initial_shares": str(parsed.params.initial_shares),
        "initial_cash": str(int(parsed.params.initial_cash) if parsed.params.initial_cash.is_integer() else parsed.params.initial_cash),
        "price": str(parsed.params.price),
        "spread": str(parsed.params.spread),
        "lot_cost": str(int(parsed.params.lot_cost) if parsed.params.lot_cost.is_integer() else parsed.params.lot_cost),
    }

    for field, key_cn in reverse_map.items():
        idx = parsed.param_line_map[key_cn]
        parsed.lines[idx] = f"| {key_cn} | {values[field]} |"


def cmd_recalc(args: argparse.Namespace) -> int:
    file_path = Path(args.file)
    parsed = parse_markdown(file_path)

    if args.start_date:
        parsed.params.start_date = args.start_date
    if args.initial_shares is not None:
        parsed.params.initial_shares = args.initial_shares
    if args.initial_cash is not None:
        parsed.params.initial_cash = args.initial_cash
    if args.price is not None:
        parsed.params.price = args.price
    if args.spread is not None:
        parsed.params.spread = args.spread
    if args.lot_cost is not None:
        parsed.params.lot_cost = args.lot_cost

    recalc_rows(parsed, pre_days=args.pre_days)
    update_params_in_text(parsed)

    output = "\n".join(parsed.lines)
    if parsed.had_trailing_newline:
        output += "\n"
    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
    else:
        file_path.write_text(output, encoding="utf-8")

    print("重算完成")
    print(f"文件: {args.output or args.file}")
    print(
        "参数:",
        parsed.params.start_date,
        parsed.params.initial_shares,
        parsed.params.initial_cash,
        parsed.params.price,
        parsed.params.spread,
        parsed.params.lot_cost,
    )
    return 0


def cmd_range(args: argparse.Namespace) -> int:
    parsed = parse_markdown(Path(args.file))
    date_from = args.date_from or parsed.rows[0][1][0]
    date_to = args.date_to or parsed.rows[-1][1][0]

    out_rows = []
    for _, cols in parsed.rows:
        d = cols[0]
        if date_from <= d <= date_to:
            out_rows.append(cols)

    total_in_range = len(out_rows)

    if args.page_size is not None:
        if args.page_size <= 0:
            raise ValueError("--page-size 必须大于 0")
        if args.page <= 0:
            raise ValueError("--page 必须大于 0")

        start = (args.page - 1) * args.page_size
        end = start + args.page_size
        out_rows = out_rows[start:end]

    if args.limit is not None:
        out_rows = out_rows[: args.limit]

    if not out_rows:
        if total_in_range == 0:
            print("该区间无数据")
            return 0
        if args.page_size is not None:
            total_pages = (total_in_range + args.page_size - 1) // args.page_size
            print(f"页码超出范围：第 {args.page} 页，总页数 {total_pages}")
            return 0
        print("该区间无数据")
        return 0

    if args.view == "core":
        headers = CORE_HEADERS
        aligns = CORE_ALIGN
        indexes = [0, 1, 2, 3, 4]
    else:
        headers = FULL_HEADERS
        aligns = FULL_ALIGN
        indexes = list(range(15))

    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(aligns) + " |",
    ]
    for cols in out_rows:
        lines.append("| " + " | ".join(cols[i] for i in indexes) + " |")

    if not args.no_summary:
        lines.append("")
        summary = f"返回 {len(out_rows)} 行，区间总计 {total_in_range} 行，区间: {date_from} ~ {date_to}"
        if args.page_size is not None:
            total_pages = (total_in_range + args.page_size - 1) // args.page_size
            summary += f"，分页: 第 {args.page}/{total_pages} 页，每页 {args.page_size} 行"
        lines.append(summary)

    output = "\n".join(lines)
    if args.output:
        Path(args.output).write_text(output + "\n", encoding="utf-8")
        print(f"已输出到: {args.output}")
    else:
        print(output)

    return 0


def cmd_progress(args: argparse.Namespace) -> int:
    parsed = parse_markdown(Path(args.file))
    current_idx = find_row_index_by_date(parsed, args.date)
    if current_idx is None:
        raise ValueError(f"未找到日期: {args.date}")

    target_idx = find_target_date_by_assets(parsed, args.total_assets)
    if target_idx is None:
        last_date = parsed.rows[-1][1][0]
        print("| 当前日期 | 当前总资产 | 目标对应日期 | 进度差 |")
        print("| --- | ---: | --- | --- |")
        print(f"| {args.date} | {fmt_float(args.total_assets)} | 超出总表范围（最后日期 {last_date}） | 超前超出范围 |")
        return 0

    target_date = parsed.rows[target_idx][1][0]
    day_diff = target_idx - current_idx
    if day_diff > 0:
        progress = f"提前{day_diff}天"
    elif day_diff < 0:
        progress = f"落后{-day_diff}天"
    else:
        progress = "正好当天"

    print("| 当前日期 | 当前总资产 | 目标对应日期 | 进度差 |")
    print("| --- | ---: | --- | --- |")
    print(f"| {args.date} | {fmt_float(args.total_assets)} | {target_date} | {progress} |")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="跟踪总表工具")
    sub = parser.add_subparsers(dest="command", required=True)

    p_recalc = sub.add_parser("recalc", help="重算全表目标数据")
    p_recalc.add_argument("--file", default="docs/2026-2028-tracking-total-table.md")
    p_recalc.add_argument("--output", default=None)
    p_recalc.add_argument("--start-date", default=None)
    p_recalc.add_argument("--initial-shares", type=int, default=None)
    p_recalc.add_argument("--initial-cash", type=float, default=None)
    p_recalc.add_argument("--price", type=float, default=None)
    p_recalc.add_argument("--spread", type=float, default=None)
    p_recalc.add_argument("--lot-cost", type=float, default=None)
    p_recalc.add_argument(
        "--pre-days",
        type=int,
        default=None,
        help="重算前先执行若干个未展示交易日循环；默认自动判断。",
    )
    p_recalc.set_defaults(func=cmd_recalc)

    p_range = sub.add_parser("range", help="提取区间数据")
    p_range.add_argument("--file", default="docs/2026-2028-tracking-total-table.md")
    p_range.add_argument("--date-from", default=None)
    p_range.add_argument("--date-to", default=None)
    p_range.add_argument("--limit", type=int, default=None)
    p_range.add_argument("--page-size", type=int, default=None)
    p_range.add_argument("--page", type=int, default=1)
    p_range.add_argument("--view", choices=["full", "core"], default="full")
    p_range.add_argument("--output", default=None)
    p_range.add_argument("--no-summary", action="store_true")
    p_range.set_defaults(func=cmd_range)

    p_progress = sub.add_parser("progress", help="按当前总资产定位目标日期与提前/落后天数")
    p_progress.add_argument("--file", default="docs/2026-2028-tracking-total-table.md")
    p_progress.add_argument("--date", required=True)
    p_progress.add_argument("--total-assets", type=float, required=True)
    p_progress.set_defaults(func=cmd_progress)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
