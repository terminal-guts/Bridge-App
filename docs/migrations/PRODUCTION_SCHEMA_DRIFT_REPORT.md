# PRODUCTION_SCHEMA.md Drift Report

Generated: 2026-04-17
Doc audited: `docs/migrations/PRODUCTION_SCHEMA.md` (last updated 2026-04-14)
Ground truth: `snapshots/prod-schema-2026-04-17.json` (authoritative prod dump, read-only)

---

## Overall Staleness: 4 / 10

The doc is **mostly accurate but meaningfully incomplete**. It is NOT a full rewrite candidate — it matches prod on the majority of tables, columns, policies, indexes (by omission — doc doesn't list indexes), and triggers. Drift is concentrated in three buckets:

1. One brand-new table is missing (`email_unsubscribes`).
2. One table gained two columns in a post-doc migration (`email_verification_codes`).
3. Fourteen functions (mostly trigger helpers + mock-data helpers + `get_user_by_email`) are not listed in the RPC table.

Counts: doc claims "37 tables" — prod has **38**. Doc lists 74 RPCs — prod has **88** app functions.

---

## 1. Tables

### 1a. Tables in doc but MISSING from prod JSON
None. All 37 tables in the doc exist in prod.

### 1b. Tables in prod but NOT mentioned in doc
| Table | Columns | Notes |
|---|---|---|
| `email_unsubscribes` | 3 (`id`, `email`, `created_at`) | Not in doc at all. RLS enabled. Indexed on `email` (unique) and `idx_unsub_email`. Recently added — matches the email deliverability work. |

### 1c. Tables with column-list mismatches
| Table | Doc says | Prod reality | Drift |
|---|---|---|---|
| `email_verification_codes` | 9 columns | **11 columns** | Prod has two extra columns not in doc: `code_hash text` (nullable) and `used boolean NOT NULL default false`. Doc also shows `code` as `NOT NULL`, but prod has `code` as nullable with default `''::text`. |
| `user_profiles` | 55 columns | 55 columns | Count matches, but doc says `first_name` / `last_name text NOT NULL` without defaults. Prod has both `NOT NULL` with default `''::text`. Minor but relevant for local-vs-prod parity. Also `bio` in prod defaults to `''::text`; doc just lists `bio text`. |
| `user_reports` | 8 columns | 8 columns | Doc says `details text`; prod has `details text` default `''::text`. Minor. |
| `waitlist_signups` | 16 columns | 16 columns | Doc correctly lists 16, but `email` shown as `citext`; prod reports the data_type as `USER-DEFINED` (same thing — citext is a user-defined type; note only). |
| `proposals` | 32 columns | 32 columns | All columns present. Note: `status` default in prod is `'pending'`; doc correctly says `pending | voting | deciding | confirmed | rejected | expired | declined` — no CHECK constraint is surfaced in the JSON, so this is descriptive only. |
| `karma_scores` | 13 columns | 13 columns | Match. |
| All other tables | — | — | Column counts and names verified to match one-for-one. |

> Table-level summary: 1 missing table, 1 table with 2 missing columns, several cosmetic default-value gaps. No removed tables, no renamed tables.

---

## 2. RPCs / Functions

**Doc lists 74 app-specific RPCs. Prod has 88 app-specific functions** (after excluding citext / regexp / generic string internals). Net: **14 functions exist in prod that are not listed in the doc**. No doc-only ghost RPCs — every RPC the doc claims is really in prod.

### 2a. In prod, MISSING from doc (14)
Grouped by category:

**Trigger functions (not truly "RPCs" but documented as such for other triggers — doc is inconsistent):**
- `auto_suspend_on_reports` — backs `trg_auto_suspend_on_report` on `user_reports`
- `update_deep_question_answers_updated_at` — backs `update_deep_question_answers_updated_at` trigger
- `update_friend_badges_updated_at` — backs `trigger_friend_badges_updated_at`
- `update_friend_codes_updated_at` — exists in prod but no matching trigger in the trigger list (likely legacy/unused)
- `handle_new_user_friend_code` — auth.users handler (probably on `auth.users`, not in the public triggers list)
- `trigger_update_streak` — likely obsolete; not wired to any visible trigger
- `notify_new_match` — backs `trg_notify_new_match` on `matches`
- `notify_new_message` — backs `trg_notify_new_message` on `messages`
- `notify_proposal_deciding` — backs `trg_notify_proposal_deciding` on `proposals`

**Dev / mock helpers (should NOT be in production — possible cleanup target):**
- `ensure_mock_profiles`
- `generate_mock_surveys`
- `regenerate_mock_surveys`
- `should_generate_mock_surveys`

**Utility:**
- `get_user_by_email` — lookup helper (not mentioned in doc)

### 2b. In doc, MISSING from prod
None. All 74 doc-listed RPCs exist in prod.

### 2c. Signature / overload notes
- Doc correctly notes `validate_match_preferences` has 2 overloads. Prod confirms `(p_age_min, p_age_max, p_preferred_gender)` and `(…, p_max_distance_miles)`. Accurate.
- No other function overloads in app-level code.

---

## 3. RLS / Policies

**Doc lists 85 policy rows across 37 tables. Prod has 85 policy rows across 37 tables.** After line-by-line audit, every policy name, command (`SELECT/INSERT/UPDATE/DELETE/ALL`) and permissive/restrictive flag matches exactly.

### Gaps
- The new `email_unsubscribes` table (see §1b) has RLS enabled but **no policies** were visible in the prod JSON. The doc simply doesn't list the table, so this is a silent omission — something to flag for the doc author (is access intended to be service-role-only? Policies-absent means no anon/authenticated access, which may be intentional).

No policy-name drift, no cmd drift, no missing policies on documented tables.

---

## 4. Indexes

**The doc does not list indexes at all.** Prod has 145 indexes across all tables. This is a structural gap, not a drift — but should be called out because index presence often matters for migration reproducibility.

Highlights of what's present in prod but undocumented:
- `proposals`: 10 indexes including `one_active_proposal_per_user_a`, `one_active_proposal_per_user_b`, `unique_proposal_pair`, `unique_proposal_pair_permanent` (important uniqueness constraints driving the algorithm).
- `friends`: 9 indexes including `idx_friends_friend_accepted`, `idx_friends_user_accepted`, `idx_friends_pending_recipient` (hot-path lookups).
- `proposal_votes`: 6 indexes including `unique_vote_per_proposal` AND `unique_proposal_vote` (two uniqueness indexes — investigate redundancy).
- `waitlist_signups`: 8 indexes (heavy query surface).

Recommendation: the doc should either (a) add a high-level "index highlights" section for non-trivial uniqueness / partial-index constraints, or (b) keep indexes out but add a note that they are tracked in migrations only.

---

## 5. Triggers

Doc lists 19 trigger rows. Prod has 21 rows in `triggers` but **19 unique trigger+table pairs** (two triggers — `trigger_max_featured_badges` and `trg_compute_karma_tier` — fire on both INSERT and UPDATE, producing duplicate rows). All 19 trigger names and their backing functions match between doc and prod. No drift.

---

## 6. Recommended Fix List (prioritized)

### P0 — Structural gaps (fix first)
1. **Add `email_unsubscribes` table section** (3 cols: `id`, `email`, `created_at`; RLS enabled; no policies). This is a live table driving email deliverability.
2. **Update `email_verification_codes` from 9 → 11 columns**: add `code_hash text` and `used boolean NOT NULL default false`. Change `code` nullability note from `NOT NULL` → nullable with default `''::text`.
3. **Bump "37 tables total" → "38 tables total"** in the header summary.

### P1 — RPC table completeness
4. **Add missing trigger-backing functions** to the RPC list (or split trigger functions into a separate subsection): `auto_suspend_on_reports`, `update_deep_question_answers_updated_at`, `update_friend_badges_updated_at`, `update_friend_codes_updated_at`, `handle_new_user_friend_code`, `notify_new_match`, `notify_new_message`, `notify_proposal_deciding`, `trigger_update_streak`.
5. **Flag mock-data functions** (`ensure_mock_profiles`, `generate_mock_surveys`, `regenerate_mock_surveys`, `should_generate_mock_surveys`) — decide whether to document them or drop them from prod via a cleanup migration.
6. **Add `get_user_by_email`** to the RPC list.

### P2 — Accuracy polish
7. Clean up column-default drift for `user_profiles.first_name`, `user_profiles.last_name`, `user_profiles.bio` (`''::text` defaults) and `user_reports.details` (`''::text` default) so local reset matches prod.
8. Add a brief "Indexes" section noting the 145 total, with a callout for non-obvious uniqueness indexes on `proposals` (4) and `proposal_votes` (2 overlapping uniques — worth investigating dead index).

### P3 — Housekeeping
9. Update the "Last updated" header from 2026-04-14 → the date of the next revision.
10. Add a note in §Notes about `email_unsubscribes` being RLS-on but policy-free (intentional service-role-only access?).

---

## Recommended action

**Patch, do not rewrite.** The doc's backbone (37 tables → 38, policies, triggers) is accurate. A targeted update covering the three P0 items and the P1 RPC additions brings it fully in sync in ~30 minutes of editing.
