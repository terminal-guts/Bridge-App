/**
 * Copy profile photos from prod Storage → local Storage so imported users
 * show their real avatars. Complements snapshot-import.ts, which copies
 * row data only.
 *
 * SAFETY: Reads from prod (public bucket, no mutation). Writes to local
 * only (127.0.0.1 hardcoded). Re-runnable — skips files that already
 * exist locally unless --force is passed.
 *
 * Usage:
 *   npx tsx scripts/snapshot-import-photos.ts
 *   npx tsx scripts/snapshot-import-photos.ts --force   # overwrite local copies
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ────────────────────────────────────────────────────────────
// SAFETY: Hardcoded local target. Prod URL comes from .env.
// ────────────────────────────────────────────────────────────
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const PROD_URL = 'https://ikyiwnydgedwbmcdzgbe.supabase.co';
const BUCKET = 'profile-photos';

const FORCE = process.argv.includes('--force');

// ────────────────────────────────────────────────────────────
// Load prod service role key from .env (read-only use)
// ────────────────────────────────────────────────────────────
function loadProdKey(): string {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env not found at ${envPath}`);
  }
  const env = fs.readFileSync(envPath, 'utf-8');
  const match = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
  if (!match) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing from .env');
  return match[1].trim();
}

// ────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Copying profile photos: prod → local ===');
  console.log(`Source: ${PROD_URL}  (bucket: ${BUCKET})`);
  console.log(`Target: ${LOCAL_URL}  (bucket: ${BUCKET})`);
  if (FORCE) console.log('Mode:   --force (will overwrite existing local files)');
  console.log('');

  // Health check: local must be up
  try {
    const res = await fetch(`${LOCAL_URL}/rest/v1/`, {
      headers: { apikey: LOCAL_SERVICE_ROLE_KEY },
    });
    if (!res.ok && res.status !== 404) throw new Error(`status ${res.status}`);
  } catch (e: unknown) {
    console.error('FATAL: local Supabase is not reachable at', LOCAL_URL);
    console.error((e as Error).message);
    console.error('Run: supabase start');
    process.exit(1);
  }

  const prodKey = loadProdKey();
  const prod = createClient(PROD_URL, prodKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const local = createClient(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Ensure local bucket exists with prod's config
  const { data: localBucket } = await local.storage.getBucket(BUCKET);
  if (!localBucket) {
    console.log(`Creating local bucket ${BUCKET}...`);
    const { error } = await local.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
    });
    if (error && !/already exists/i.test(error.message)) {
      console.error('Failed to create local bucket:', error.message);
      process.exit(1);
    }
  }

  // Enumerate every photo in prod. Storage's .list() is paginated per prefix,
  // but since our layout is {user_id}/{file}, we list top-level dirs then list each.
  console.log('Listing prod folders...');
  const { data: topLevel, error: topErr } = await prod.storage.from(BUCKET).list('', {
    limit: 1000,
  });
  if (topErr) {
    console.error('FATAL: could not list prod bucket:', topErr.message);
    process.exit(1);
  }

  const userFolders = (topLevel ?? []).filter((e) => e.id === null); // folders have id=null
  console.log(`Found ${userFolders.length} user folders`);

  // Collect every path
  const allPaths: string[] = [];
  for (const folder of userFolders) {
    const { data: files } = await prod.storage
      .from(BUCKET)
      .list(folder.name, { limit: 1000 });
    for (const f of files ?? []) {
      if (f.id !== null) allPaths.push(`${folder.name}/${f.name}`);
    }
  }
  console.log(`Found ${allPaths.length} photo files in prod\n`);

  // Copy each one
  let copied = 0;
  let skipped = 0;
  let failed = 0;
  const start = Date.now();

  for (let i = 0; i < allPaths.length; i++) {
    const p = allPaths[i];
    const progress = `[${i + 1}/${allPaths.length}]`;

    // Skip if local already has it (unless --force)
    if (!FORCE) {
      const dir = p.substring(0, p.lastIndexOf('/'));
      const name = p.substring(p.lastIndexOf('/') + 1);
      const { data: existing } = await local.storage.from(BUCKET).list(dir, { search: name });
      if (existing?.some((e) => e.name === name)) {
        skipped++;
        if (i % 50 === 0) process.stdout.write(`${progress} skip (exists)\r`);
        continue;
      }
    }

    // Download from prod (public URL works; use the CDN path)
    const downloadRes = await prod.storage.from(BUCKET).download(p);
    if (downloadRes.error || !downloadRes.data) {
      console.error(`${progress} FAIL download ${p}: ${downloadRes.error?.message}`);
      failed++;
      continue;
    }

    const buffer = await downloadRes.data.arrayBuffer();
    const contentType = downloadRes.data.type || 'image/jpeg';

    // Upload to local
    const { error: upErr } = await local.storage.from(BUCKET).upload(p, buffer, {
      contentType,
      upsert: true,
    });
    if (upErr) {
      console.error(`${progress} FAIL upload ${p}: ${upErr.message}`);
      failed++;
      continue;
    }

    copied++;
    if (copied % 25 === 0) {
      const secs = ((Date.now() - start) / 1000).toFixed(0);
      process.stdout.write(`${progress} copied=${copied} skipped=${skipped} failed=${failed} (${secs}s)\r`);
    }
  }

  const totalSecs = ((Date.now() - start) / 1000).toFixed(0);
  console.log('\n');
  console.log('=== Photo import complete ===');
  console.log(`  Copied:  ${copied}`);
  console.log(`  Skipped: ${skipped} (already existed locally — use --force to overwrite)`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Elapsed: ${totalSecs}s`);
}

main().catch((e: unknown) => {
  console.error('FATAL:', (e as Error).message);
  process.exit(1);
});
