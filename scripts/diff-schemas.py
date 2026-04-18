#!/usr/bin/env python3
"""
diff-schemas.py — compare two schema-dump JSONs produced by
dump-prod-schema.sh and dump-local-schema.sh, and print a readable
drift report so we know what's out of sync between local and prod.

Usage:
  ./scripts/diff-schemas.py snapshots/prod-schema-2026-04-17.json \
                            snapshots/local-schema-2026-04-17.json
  ./scripts/diff-schemas.py --ignore scripts/schema-diff-ignore.json \
                            <prod> <local>

Exit code 0 = no drift. Exit code 1 = drift detected.
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path


def load(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def group_by(rows: list[dict], key: str) -> dict[str, list[dict]]:
    out = defaultdict(list)
    for r in rows or []:
        out[r.get(key)].append(r)
    return out


def col_signature(c: dict) -> tuple:
    """A column's identity for drift-comparison purposes."""
    return (
        c.get("udt_name"),
        c.get("is_nullable"),
        c.get("column_default"),
        c.get("character_maximum_length"),
    )


def fmt_col(c: dict) -> str:
    n = c.get("column_name")
    udt = c.get("udt_name")
    nullable = "NULL" if c.get("is_nullable") == "YES" else "NOT NULL"
    d = c.get("column_default")
    d_s = f" DEFAULT {d}" if d else ""
    return f"{n} {udt} {nullable}{d_s}"


def diff_tables(a: dict, b: dict) -> tuple[set[str], set[str], set[str]]:
    a_names = {t["table_name"] for t in a.get("tables") or []}
    b_names = {t["table_name"] for t in b.get("tables") or []}
    return a_names - b_names, b_names - a_names, a_names & b_names


def diff_columns(a: dict, b: dict, common: set[str]) -> list[str]:
    a_cols = group_by(a.get("columns") or [], "table_name")
    b_cols = group_by(b.get("columns") or [], "table_name")
    lines = []
    for t in sorted(common):
        ac = {c["column_name"]: c for c in a_cols.get(t, [])}
        bc = {c["column_name"]: c for c in b_cols.get(t, [])}
        only_a = sorted(set(ac) - set(bc))
        only_b = sorted(set(bc) - set(ac))
        drifted = []
        for col in sorted(set(ac) & set(bc)):
            if col_signature(ac[col]) != col_signature(bc[col]):
                drifted.append(col)
        if only_a or only_b or drifted:
            lines.append(f"  TABLE {t}")
            for col in only_a:
                lines.append(f"    - A-only column: {fmt_col(ac[col])}")
            for col in only_b:
                lines.append(f"    - B-only column: {fmt_col(bc[col])}")
            for col in drifted:
                lines.append(f"    - drift on {col}:")
                lines.append(f"        A: {fmt_col(ac[col])}")
                lines.append(f"        B: {fmt_col(bc[col])}")
    return lines


def diff_indexes(a: dict, b: dict, common: set[str]) -> list[str]:
    a_idx = group_by(a.get("indexes") or [], "tablename")
    b_idx = group_by(b.get("indexes") or [], "tablename")
    lines = []
    for t in sorted(common):
        an = {i["indexname"]: i["indexdef"] for i in a_idx.get(t, [])}
        bn = {i["indexname"]: i["indexdef"] for i in b_idx.get(t, [])}
        only_a = sorted(set(an) - set(bn))
        only_b = sorted(set(bn) - set(an))
        drifted = [i for i in sorted(set(an) & set(bn)) if an[i] != bn[i]]
        if only_a or only_b or drifted:
            lines.append(f"  TABLE {t}")
            for i in only_a:
                lines.append(f"    - A-only: {an[i]}")
            for i in only_b:
                lines.append(f"    - B-only: {bn[i]}")
            for i in drifted:
                lines.append(f"    - drift on {i}:")
                lines.append(f"        A: {an[i]}")
                lines.append(f"        B: {bn[i]}")
    return lines


def diff_policies(a: dict, b: dict, common: set[str]) -> list[str]:
    def keyfn(p):
        return (p["tablename"], p["policyname"])

    a_p = {keyfn(p): p for p in a.get("policies") or []}
    b_p = {keyfn(p): p for p in b.get("policies") or []}
    a_keys = {k for k in a_p if k[0] in common}
    b_keys = {k for k in b_p if k[0] in common}
    lines = []
    only_a = sorted(a_keys - b_keys)
    only_b = sorted(b_keys - a_keys)
    drifted = []
    for k in sorted(a_keys & b_keys):
        for f in ("cmd", "roles", "qual", "with_check", "permissive"):
            if a_p[k].get(f) != b_p[k].get(f):
                drifted.append((k, f, a_p[k].get(f), b_p[k].get(f)))
                break
    for (t, n) in only_a:
        lines.append(f"  A-only policy: {t}.{n} ({a_p[(t, n)].get('cmd')})")
    for (t, n) in only_b:
        lines.append(f"  B-only policy: {t}.{n} ({b_p[(t, n)].get('cmd')})")
    for (tn, f, av, bv) in drifted:
        lines.append(f"  drift on {tn[0]}.{tn[1]} field={f}")
        lines.append(f"    A: {av}")
        lines.append(f"    B: {bv}")
    return lines


def diff_functions(a: dict, b: dict) -> list[str]:
    def keyfn(f):
        return (f["function_name"], f["arguments"])

    a_f = {keyfn(f): f for f in a.get("functions") or []}
    b_f = {keyfn(f): f for f in b.get("functions") or []}
    lines = []
    for k in sorted(set(a_f) - set(b_f)):
        lines.append(f"  A-only function: {k[0]}({k[1]}) -> {a_f[k].get('return_type')}")
    for k in sorted(set(b_f) - set(a_f)):
        lines.append(f"  B-only function: {k[0]}({k[1]}) -> {b_f[k].get('return_type')}")
    for k in sorted(set(a_f) & set(b_f)):
        for field in ("return_type", "security_definer", "volatility"):
            if a_f[k].get(field) != b_f[k].get(field):
                lines.append(f"  drift on {k[0]}({k[1]}) field={field}: A={a_f[k].get(field)} B={b_f[k].get(field)}")
                break
    return lines


def diff_triggers(a: dict, b: dict) -> list[str]:
    def keyfn(t):
        return (t["event_object_table"], t["trigger_name"], t["event_manipulation"])

    a_t = {keyfn(t): t for t in a.get("triggers") or []}
    b_t = {keyfn(t): t for t in b.get("triggers") or []}
    lines = []
    for k in sorted(set(a_t) - set(b_t)):
        lines.append(f"  A-only trigger: {k[0]}.{k[1]} on {k[2]}")
    for k in sorted(set(b_t) - set(a_t)):
        lines.append(f"  B-only trigger: {k[0]}.{k[1]} on {k[2]}")
    return lines


def diff_rls(a: dict, b: dict, common: set[str]) -> list[str]:
    a_r = {r["table_name"]: r["rls_enabled"] for r in a.get("rls_status") or []}
    b_r = {r["table_name"]: r["rls_enabled"] for r in b.get("rls_status") or []}
    lines = []
    for t in sorted(common):
        if a_r.get(t) != b_r.get(t):
            lines.append(f"  RLS drift on {t}: A={a_r.get(t)} B={b_r.get(t)}")
    return lines


def main() -> int:
    args = sys.argv[1:]
    ignore: dict = {}
    if args and args[0] == "--ignore":
        if len(args) < 4:
            print(__doc__)
            return 2
        with open(args[1]) as f:
            ignore = json.load(f)
        args = args[2:]
    if len(args) != 2:
        print(__doc__)
        return 2

    a_path, b_path = args[0], args[1]
    a = load(a_path)
    b = load(b_path)

    # Apply ignore list: drop known-legacy A-only functions so they don't count as drift
    ignore_fn_names = set(ignore.get("functions_a_only", []))
    if ignore_fn_names:
        a["functions"] = [f for f in a.get("functions") or []
                          if f.get("function_name") not in ignore_fn_names]
    a_label = a.get("source", Path(a_path).stem)
    b_label = b.get("source", Path(b_path).stem)

    print(f"A = {a_label} ({a.get('dump_date')})  <-  {a_path}")
    print(f"B = {b_label} ({b.get('dump_date')})  <-  {b_path}")
    print()

    only_a, only_b, common = diff_tables(a, b)
    any_drift = False

    print(f"# Tables  (A={len(a.get('tables') or [])}, B={len(b.get('tables') or [])}, shared={len(common)})")
    if only_a:
        any_drift = True
        print(f"  Only in A ({len(only_a)}): {sorted(only_a)}")
    if only_b:
        any_drift = True
        print(f"  Only in B ({len(only_b)}): {sorted(only_b)}")
    print()

    col_lines = diff_columns(a, b, common)
    print(f"# Columns  (drift in {len({l for l in col_lines if l.startswith('  TABLE')})} shared tables)")
    if col_lines:
        any_drift = True
        print("\n".join(col_lines))
    print()

    idx_lines = diff_indexes(a, b, common)
    print(f"# Indexes")
    if idx_lines:
        any_drift = True
        print("\n".join(idx_lines))
    print()

    rls_lines = diff_rls(a, b, common)
    print(f"# RLS status")
    if rls_lines:
        any_drift = True
        print("\n".join(rls_lines))
    print()

    pol_lines = diff_policies(a, b, common)
    print(f"# Policies")
    if pol_lines:
        any_drift = True
        print("\n".join(pol_lines))
    print()

    fn_lines = diff_functions(a, b)
    print(f"# Functions  (A={len(a.get('functions') or [])}, B={len(b.get('functions') or [])})")
    if fn_lines:
        any_drift = True
        print("\n".join(fn_lines))
    print()

    tr_lines = diff_triggers(a, b)
    print(f"# Triggers  (A={len(a.get('triggers') or [])}, B={len(b.get('triggers') or [])})")
    if tr_lines:
        any_drift = True
        print("\n".join(tr_lines))
    print()

    print("====================")
    if any_drift:
        print("RESULT: drift detected.")
        return 1
    print("RESULT: no drift. A and B match.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
