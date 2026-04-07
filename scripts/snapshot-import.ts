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

// Tables to import in FK-safe order (and clear in reverse order)
const TABLE_ORDER = [
  'user_profiles',
  'user_photos',
  'friend_codes',
  'friends',
  'karma_scores',
  'proposals',
  'proposal_votes',
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
    user_photos: any[];
    friend_codes: any[];
    friends: any[];
    karma_scores: any[];
    proposals: any[];
    proposal_votes: any[];
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

  // Clear auth users via admin API
  console.log('  Clearing auth users...');
  const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (existingUsers?.users) {
    for (const user of existingUsers.users) {
      await supabase.auth.admin.deleteUser(user.id);
    }
    console.log(`  Cleared ${existingUsers.users.length} auth users`);
  }
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

  for (const tableName of TABLE_ORDER) {
    const rows = snapshot.tables[tableName as keyof Snapshot['tables']];
    if (!rows || rows.length === 0) {
      console.log(`  ${tableName}: 0 rows (skipped)`);
      continue;
    }

    // Try inserting the first row to detect schema mismatches
    const columnsToStrip = new Set<string>();
    let testRow = { ...rows[0] };
    let retries = 0;

    while (retries < 5) {
      const { error } = await supabase.from(tableName).upsert(testRow, {
        onConflict: 'id',
        ignoreDuplicates: true,
      });

      if (error?.message.includes('Could not find the')) {
        // Extract the missing column name from the error
        const match = error.message.match(/Could not find the '(\w+)' column/);
        if (match) {
          columnsToStrip.add(match[1]);
          delete testRow[match[1]];
          retries++;
          continue;
        }
      }
      break;
    }

    if (columnsToStrip.size > 0) {
      console.log(`  ${tableName}: stripping columns not in local schema: ${[...columnsToStrip].join(', ')}`);
    }

    // Clean all rows by stripping unknown columns
    const cleanedRows = columnsToStrip.size > 0
      ? rows.map((row: any) => {
          const cleaned = { ...row };
          for (const col of columnsToStrip) {
            delete cleaned[col];
          }
          return cleaned;
        })
      : rows;

    // Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;
    // First row was already inserted during detection, start counting it
    if (retries < 5) inserted = 1;

    for (let i = 1; i < cleanedRows.length; i += batchSize) {
      const batch = cleanedRows.slice(i, i + batchSize);
      const { error } = await supabase.from(tableName).upsert(batch, {
        onConflict: 'id',
        ignoreDuplicates: true,
      });

      if (error) {
        // Fall back to one-by-one insertion for this batch
        for (const row of batch) {
          const { error: singleError } = await supabase.from(tableName).upsert(row, {
            onConflict: 'id',
            ignoreDuplicates: true,
          });
          if (singleError) {
            // Only log non-FK errors (FK errors are expected for orphan references)
            if (!singleError.message.includes('foreign key constraint')) {
              console.log(`    ${tableName} row ${row.id}: ${singleError.message}`);
            }
          } else {
            inserted++;
          }
        }
      } else {
        inserted += batch.length;
      }
    }

    console.log(`  ${tableName}: ${inserted}/${rows.length} rows`);
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

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
