/**
 * Import a production snapshot into local Supabase for development.
 *
 * SAFETY: This script ONLY writes to local Supabase (127.0.0.1).
 * It refuses to run if the target URL points anywhere else.
 *
 * Usage:
 *   npx tsx scripts/snapshot-import.ts                           # imports latest snapshot
 *   npx tsx scripts/snapshot-import.ts snapshots/snapshot-2026-04-07.json  # specific file
 *
 * After import, log in as any user:
 *   Email: their real @rice.edu email
 *   Password: localdev123
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// SAFETY: Hardcoded local-only targets — never change these
// ============================================================
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const LOCAL_DEV_PASSWORD = 'localdev123';

// Tables to import in FK-safe order (and clear in reverse order).
// user_preferences → user_profiles (FK)
// deep_question_answers → user_profiles (FK)
// blocked_users → auth.users (FK)
// friend_suggestions → auth.users (FK)
// pool_vote_assignments → proposals + auth.users (FK) — must come after proposals
const TABLE_ORDER = [
  'user_profiles',
  'user_preferences',
  'deep_question_answers',
  'user_photos',
  'friend_codes',
  'friends',
  'friend_suggestions',
  'blocked_users',
  'karma_scores',
  'proposals',
  'proposal_votes',
  'pool_vote_assignments',
  'matches',
  'messages',
  'match_exits',
] as const;

interface Snapshot {
  exported_at: string;
  source: string;
  tables: {
    auth_users: any[];
    user_profiles: any[];
    user_preferences?: any[];
    deep_question_answers?: any[];
    user_photos: any[];
    friend_codes: any[];
    friends: any[];
    friend_suggestions?: any[];
    blocked_users?: any[];
    karma_scores: any[];
    proposals: any[];
    proposal_votes: any[];
    pool_vote_assignments?: any[];
    matches: any[];
    messages: any[];
    match_exits: any[];
  };
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log('');
  console.log('=== Bridge Snapshot Import ===');
  console.log('=== LOCAL SUPABASE ONLY ===');
  console.log('');

  // --- Safety check: verify local Supabase is running ---
  console.log(`Target: ${LOCAL_SUPABASE_URL}`);
  try {
    const healthRes = await fetch(`${LOCAL_SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: LOCAL_SERVICE_ROLE_KEY },
    });
    if (!healthRes.ok) throw new Error(`HTTP ${healthRes.status}`);
    console.log('Local Supabase: RUNNING\n');
  } catch (err: any) {
    console.error('FATAL: Local Supabase is not running at', LOCAL_SUPABASE_URL);
    console.error('Start it with: supabase start');
    process.exit(1);
  }

  // --- Find snapshot file ---
  const snapshotPath = findSnapshotFile();
  console.log(`Snapshot: ${snapshotPath}`);

  const snapshot: Snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  console.log(`Exported at: ${snapshot.exported_at}`);
  console.log('');

  // Print record counts
  for (const [table, rows] of Object.entries(snapshot.tables)) {
    console.log(`  ${table}: ${(rows as any[])?.length ?? 0} rows`);
  }
  console.log('');

  // --- Create Supabase client (local only) ---
  const supabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Step 1: Clear existing local data (reverse FK order) ---
  console.log('Step 1: Clearing existing local data...');
  for (const table of [...TABLE_ORDER].reverse()) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      // Some tables may be empty or have different PK names — that's okay
      console.log(`  Warning clearing ${table}: ${error.message}`);
    } else {
      console.log(`  Cleared ${table}`);
    }
  }

  // Clear auth users via admin API — raw fetch, always page=1 since the list
  // shrinks as we delete (paginating would skip users).
  console.log('  Clearing auth users...');
  let authCleared = 0;
  for (let safety = 0; safety < 50; safety++) {
    const res = await fetch(`${LOCAL_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`, {
      headers: {
        apikey: LOCAL_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
      },
    });
    if (!res.ok) break;
    const body: any = await res.json();
    const users: any[] = body.users ?? [];
    if (users.length === 0) break;
    for (const u of users) {
      await supabase.auth.admin.deleteUser(u.id);
      authCleared++;
    }
  }
  console.log(`  Cleared ${authCleared} auth users`);
  console.log('');

  // --- Step 2: Import auth users ---
  console.log(`Step 2: Importing ${snapshot.tables.auth_users?.length ?? 0} auth users...`);
  let authSuccessCount = 0;
  let authSkipCount = 0;

  for (const user of snapshot.tables.auth_users ?? []) {
    try {
      const { error } = await supabase.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password: LOCAL_DEV_PASSWORD,
        email_confirm: true,
        user_metadata: user.raw_user_meta_data || {},
        app_metadata: user.raw_app_meta_data || {},
      });

      if (error) {
        if (error.message.includes('already') || error.message.includes('exists') || error.message.includes('duplicate')) {
          authSkipCount++;
        } else {
          console.log(`  Warning: ${user.email}: ${error.message}`);
        }
      } else {
        authSuccessCount++;
      }
    } catch (err: any) {
      console.log(`  Error: ${user.email}: ${err.message}`);
    }
  }
  console.log(`  Created: ${authSuccessCount}, Skipped (existing): ${authSkipCount}`);
  console.log('');

  // --- Step 3: Disable friend_code auto-generation trigger ---
  // The trigger auto-creates friend codes on auth.users insert,
  // but we want to import the production friend codes instead.
  // We'll delete the auto-generated ones and insert production ones.
  console.log('Step 3: Replacing auto-generated friend codes with production values...');
  await supabase.from('friend_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // --- Step 4: Import public tables in FK order ---
  console.log('Step 4: Importing tables...');

  // Prune orphaned rows from the snapshot BEFORE attempting insert.
  // These are rows in prod whose FK targets were deleted — they'd always fail.
  // Typical offender: pool_vote_assignments rows for deleted proposals.
  const snapshotProposalIds = new Set(
    (snapshot.tables.proposals ?? []).map((p: any) => p.id)
  );
  const pruneStats: Record<string, { orphans: number; kept: number }> = {};

  if (snapshot.tables.pool_vote_assignments) {
    const before = snapshot.tables.pool_vote_assignments.length;
    snapshot.tables.pool_vote_assignments = snapshot.tables.pool_vote_assignments.filter(
      (row: any) => snapshotProposalIds.has(row.proposal_id)
    );
    const after = snapshot.tables.pool_vote_assignments.length;
    if (before !== after) {
      pruneStats.pool_vote_assignments = { orphans: before - after, kept: after };
      console.log(`  pre-prune: pool_vote_assignments dropped ${before - after} orphan row(s) referencing deleted proposals`);
    }
  }
  if (snapshot.tables.proposal_votes) {
    const before = snapshot.tables.proposal_votes.length;
    snapshot.tables.proposal_votes = snapshot.tables.proposal_votes.filter(
      (row: any) => snapshotProposalIds.has(row.proposal_id)
    );
    const after = snapshot.tables.proposal_votes.length;
    if (before !== after) {
      pruneStats.proposal_votes = { orphans: before - after, kept: after };
      console.log(`  pre-prune: proposal_votes dropped ${before - after} orphan row(s) referencing deleted proposals`);
    }
  }

  // Track what fell through the cracks so we can retry + report
  type FailedRow = { row: any; error: string };
  const failuresByTable: Record<string, FailedRow[]> = {};
  const strippedByTable: Record<string, string[]> = {};
  const snapshotCounts: Record<string, number> = {};

  for (const tableName of TABLE_ORDER) {
    const rows = snapshot.tables[tableName as keyof Snapshot['tables']];
    snapshotCounts[tableName] = rows?.length ?? 0;
    if (!rows || rows.length === 0) {
      console.log(`  ${tableName}: 0 rows (skipped)`);
      continue;
    }

    // Detect schema mismatches by probing the first row. Strip unknown columns.
    const columnsToStrip = new Set<string>();
    let testRow = { ...rows[0] };
    let firstRowInserted = false;

    for (let attempt = 0; attempt < 20; attempt++) {
      const { error } = await supabase.from(tableName).upsert(testRow, {
        onConflict: 'id',
        ignoreDuplicates: true,
      });

      if (!error) {
        firstRowInserted = true;
        break;
      }
      const missing = error.message.match(/Could not find the '(\w+)' column/);
      if (missing) {
        columnsToStrip.add(missing[1]);
        delete testRow[missing[1]];
        continue;
      }
      // Non-schema error on first row — defer to retry pass
      break;
    }

    if (columnsToStrip.size > 0) {
      strippedByTable[tableName] = [...columnsToStrip];
      console.log(`  ${tableName}: stripping ${columnsToStrip.size} col(s) not in local schema: ${[...columnsToStrip].join(', ')}`);
    }

    const cleanedRows = columnsToStrip.size > 0
      ? rows.map((row: any) => {
          const cleaned = { ...row };
          for (const col of columnsToStrip) delete cleaned[col];
          return cleaned;
        })
      : rows;

    const batchSize = 50;
    let inserted = firstRowInserted ? 1 : 0;
    if (!firstRowInserted) {
      failuresByTable[tableName] ??= [];
      failuresByTable[tableName].push({ row: cleanedRows[0], error: 'first-row-probe-failed' });
    }

    for (let i = 1; i < cleanedRows.length; i += batchSize) {
      const batch = cleanedRows.slice(i, i + batchSize);
      const { error } = await supabase.from(tableName).upsert(batch, {
        onConflict: 'id',
        ignoreDuplicates: true,
      });

      if (!error) {
        inserted += batch.length;
        continue;
      }
      // Batch failed — fall back to one-by-one so we can isolate bad rows.
      for (const row of batch) {
        const { error: singleError } = await supabase.from(tableName).upsert(row, {
          onConflict: 'id',
          ignoreDuplicates: true,
        });
        if (singleError) {
          failuresByTable[tableName] ??= [];
          failuresByTable[tableName].push({ row, error: singleError.message });
        } else {
          inserted++;
        }
      }
    }

    const failed = failuresByTable[tableName]?.length ?? 0;
    const flag = failed > 0 ? ` (${failed} failed)` : '';
    console.log(`  ${tableName}: ${inserted}/${rows.length} rows${flag}`);
  }

  // --- Step 5: Retry pass — FK errors often resolve once dependent tables are populated ---
  const tablesWithFailures = Object.keys(failuresByTable).filter((t) => failuresByTable[t].length > 0);
  if (tablesWithFailures.length > 0) {
    console.log('');
    console.log(`Step 5: Retrying ${tablesWithFailures.reduce((n, t) => n + failuresByTable[t].length, 0)} failed row(s) now that all tables have their initial data...`);
    for (const tableName of TABLE_ORDER) {
      const failures = failuresByTable[tableName];
      if (!failures || failures.length === 0) continue;
      const stillFailing: FailedRow[] = [];
      let recovered = 0;
      for (const f of failures) {
        const { error } = await supabase.from(tableName).upsert(f.row, {
          onConflict: 'id',
          ignoreDuplicates: true,
        });
        if (error) stillFailing.push({ row: f.row, error: error.message });
        else recovered++;
      }
      failuresByTable[tableName] = stillFailing;
      console.log(`  ${tableName}: recovered ${recovered}, still failing ${stillFailing.length}`);
    }
  }

  // --- Step 6: Verify — query every table and compare to snapshot ---
  console.log('');
  console.log('Step 6: Verifying row counts (snapshot vs local)...');
  console.log('');
  console.log('  Table                           Snapshot    Local    Delta   Status');
  console.log('  ──────────────────────────────  ────────  ───────  ───────  ──────');

  let anyDelta = false;
  for (const tableName of TABLE_ORDER) {
    const expected = snapshotCounts[tableName] ?? 0;
    const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ${pad(tableName, 30)}  ${pad(String(expected), 8)}  ERR      —        ${error.message}`);
      continue;
    }
    const local = count ?? 0;
    const delta = local - expected;
    const status = delta === 0 ? 'OK' : delta > 0 ? `+${delta}` : `${delta}`;
    const flag = delta === 0 ? 'OK' : 'DRIFT';
    if (delta !== 0) anyDelta = true;
    console.log(`  ${pad(tableName, 30)}  ${pad(String(expected), 8)}  ${pad(String(local), 7)}  ${pad(status, 7)}  ${flag}`);
  }

  // Auth users: GoTrue's admin list endpoint returns 500 past certain offsets
  // on our dataset, so we count via the local exec_sql RPC (service-role only,
  // added by migration #78).
  {
    const expected = snapshot.tables.auth_users?.length ?? 0;
    let local = -1;
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'SELECT json_build_array(json_build_object(\'n\', COUNT(*))) FROM auth.users',
    });
    if (!error && Array.isArray(data) && data[0]?.n !== undefined) {
      local = Number(data[0].n);
    }
    const missing = expected - local;
    const delta = local - expected;
    const status = local < 0 ? 'ERR' : delta === 0 ? 'OK' : delta > 0 ? `+${delta}` : `${delta}`;
    const flag = local < 0 ? 'ERR' : missing > 0 ? 'DRIFT' : 'OK';
    if (missing > 0) anyDelta = true;
    console.log(`  ${pad('auth.users', 30)}  ${pad(String(expected), 8)}  ${pad(String(local), 7)}  ${pad(status, 7)}  ${flag}${delta > 0 ? ' (seed users)' : ''}`);
  }

  console.log('');

  // Print failure sample
  const totalFailures = Object.values(failuresByTable).reduce((n, arr) => n + arr.length, 0);
  if (totalFailures > 0) {
    console.log(`⚠ ${totalFailures} row(s) did not import. Sample of errors (first 5 per table):`);
    for (const [t, failures] of Object.entries(failuresByTable)) {
      if (failures.length === 0) continue;
      console.log(`  ${t}: ${failures.length} failed`);
      // Dedupe error messages
      const seen = new Map<string, number>();
      for (const f of failures) seen.set(f.error, (seen.get(f.error) ?? 0) + 1);
      for (const [msg, n] of [...seen.entries()].slice(0, 5)) {
        console.log(`    ×${n}: ${msg}`);
      }
    }
    console.log('');
  }

  if (anyDelta) {
    console.error('❌ FAIL: local row counts do not match snapshot. See table above for deltas.');
    console.error('   Common causes: FK references to auth users that weren\'t in the snapshot, or unique-constraint conflicts.');
    console.error('   The --force-continue flag suppresses this exit code if a partial import is acceptable.');
    if (!process.argv.includes('--force-continue')) process.exit(1);
  } else {
    console.log('✅ All row counts match snapshot exactly.');
  }

  console.log('');
  console.log('=== Import Complete ===');
  console.log('');
  console.log('To test the app:');
  console.log('  1. npx expo start -c');
  console.log(`  2. Log in with any @rice.edu email + password "${LOCAL_DEV_PASSWORD}"`);
  console.log('  3. Open local Studio: http://127.0.0.1:54323');
  console.log('');
  console.log('Photos will show placeholders (storage files are not copied).');
  console.log('Cron jobs do not run locally — trigger edge functions manually if needed.');
  console.log('');
}

// ============================================================
// Helpers
// ============================================================

function findSnapshotFile(): string {
  // Check for explicit argument
  const arg = process.argv[2];
  if (arg) {
    const resolved = path.resolve(arg);
    if (!fs.existsSync(resolved)) {
      console.error(`Snapshot file not found: ${resolved}`);
      process.exit(1);
    }
    return resolved;
  }

  // Find the latest snapshot file
  const snapshotDir = path.join(__dirname, '..', 'snapshots');
  if (!fs.existsSync(snapshotDir)) {
    console.error('No snapshots/ directory found. Run snapshot-export.sh first.');
    process.exit(1);
  }

  const files = fs.readdirSync(snapshotDir)
    .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error('No snapshot files found. Run snapshot-export.sh first.');
    process.exit(1);
  }

  return path.join(snapshotDir, files[0]);
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
