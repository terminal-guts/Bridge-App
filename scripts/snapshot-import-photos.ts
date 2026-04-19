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

type BucketConfig = {
  name: string;
  public: boolean;
  mimeTypes: string[];
  fileSizeLimit: number;
};

const BUCKETS: BucketConfig[] = [
  {
    name: 'profile-photos',
    public: true,
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
    fileSizeLimit: 10 * 1024 * 1024,
  },
  {
    name: 'chat-audio',
    public: false,
    mimeTypes: ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/webm', 'audio/ogg'],
    fileSizeLimit: 25 * 1024 * 1024,
  },
];

const FORCE = process.argv.includes('--force');
// Allow running a single bucket for faster dev loops: --only=profile-photos
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1] : null;

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

async function syncBucket(
  bucket: BucketConfig,
  prod: any,
  local: any,
): Promise<{ copied: number; skipped: number; failed: number; elapsedSecs: number }> {
  console.log(`\n── Bucket: ${bucket.name} ─────────────────────────────`);

  // Ensure local bucket exists matching prod's config
  const { data: localBucket } = await local.storage.getBucket(bucket.name);
  if (!localBucket) {
    console.log(`  Creating local bucket ${bucket.name}...`);
    const { error } = await local.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.mimeTypes,
    });
    if (error && !/already exists/i.test(error.message)) {
      console.error(`  FAIL create bucket ${bucket.name}: ${error.message}`);
      return { copied: 0, skipped: 0, failed: -1, elapsedSecs: 0 };
    }
  }

  console.log(`  Listing prod folders in ${bucket.name}...`);
  const { data: topLevel, error: topErr } = await prod.storage.from(bucket.name).list('', {
    limit: 1000,
  });
  if (topErr) {
    console.error(`  FAIL list prod bucket ${bucket.name}: ${topErr.message}`);
    return { copied: 0, skipped: 0, failed: -1, elapsedSecs: 0 };
  }

  const userFolders = (topLevel ?? []).filter((e: any) => e.id === null);
  console.log(`  Found ${userFolders.length} user folder(s)`);

  const allPaths: string[] = [];
  for (const folder of userFolders) {
    const { data: files } = await prod.storage
      .from(bucket.name)
      .list(folder.name, { limit: 1000 });
    for (const f of files ?? []) {
      if (f.id !== null) allPaths.push(`${folder.name}/${f.name}`);
    }
  }
  console.log(`  Found ${allPaths.length} file(s) in prod`);

  if (allPaths.length === 0) {
    return { copied: 0, skipped: 0, failed: 0, elapsedSecs: 0 };
  }

  let copied = 0;
  let skipped = 0;
  let failed = 0;
  const start = Date.now();

  for (let i = 0; i < allPaths.length; i++) {
    const p = allPaths[i];

    if (!FORCE) {
      const dir = p.substring(0, p.lastIndexOf('/'));
      const name = p.substring(p.lastIndexOf('/') + 1);
      const { data: existing } = await local.storage.from(bucket.name).list(dir, { search: name });
      if (existing?.some((e: any) => e.name === name)) {
        skipped++;
        continue;
      }
    }

    const downloadRes = await prod.storage.from(bucket.name).download(p);
    if (downloadRes.error || !downloadRes.data) {
      console.error(`  [${i + 1}/${allPaths.length}] FAIL download ${p}: ${downloadRes.error?.message}`);
      failed++;
      continue;
    }
    const buffer = await downloadRes.data.arrayBuffer();
    const contentType = downloadRes.data.type || bucket.mimeTypes[0];

    const { error: upErr } = await local.storage.from(bucket.name).upload(p, buffer, {
      contentType,
      upsert: true,
    });
    if (upErr) {
      console.error(`  [${i + 1}/${allPaths.length}] FAIL upload ${p}: ${upErr.message}`);
      failed++;
      continue;
    }

    copied++;
    if (copied % 25 === 0) {
      const secs = ((Date.now() - start) / 1000).toFixed(0);
      process.stdout.write(`  [${i + 1}/${allPaths.length}] copied=${copied} skipped=${skipped} failed=${failed} (${secs}s)\r`);
    }
  }

  const elapsedSecs = Math.round((Date.now() - start) / 1000);
  console.log(`\n  Result: copied=${copied}  skipped=${skipped}  failed=${failed}  elapsed=${elapsedSecs}s`);
  return { copied, skipped, failed, elapsedSecs };
}

async function main() {
  const targets = ONLY ? BUCKETS.filter((b) => b.name === ONLY) : BUCKETS;
  if (targets.length === 0) {
    console.error(`Unknown bucket: ${ONLY}. Known: ${BUCKETS.map((b) => b.name).join(', ')}`);
    process.exit(1);
  }

  console.log('=== Copying storage buckets: prod → local ===');
  console.log(`Source:  ${PROD_URL}`);
  console.log(`Target:  ${LOCAL_URL}`);
  console.log(`Buckets: ${targets.map((b) => b.name).join(', ')}`);
  if (FORCE) console.log('Mode:    --force (will overwrite existing local files)');
  console.log('');

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

  const results: Array<{ bucket: string } & Awaited<ReturnType<typeof syncBucket>>> = [];
  for (const b of targets) {
    const r = await syncBucket(b, prod, local);
    results.push({ bucket: b.name, ...r });
  }

  console.log('\n=== Storage sync summary ===');
  let anyFailed = false;
  for (const r of results) {
    if (r.failed < 0) {
      console.log(`  ${r.bucket}: FAILED to enumerate (see error above)`);
      anyFailed = true;
    } else {
      console.log(`  ${r.bucket}: copied=${r.copied} skipped=${r.skipped} failed=${r.failed} (${r.elapsedSecs}s)`);
      if (r.failed > 0) anyFailed = true;
    }
  }
  console.log('');
  if (anyFailed) {
    console.error('❌ Some files failed to copy. Re-run to retry.');
    process.exit(1);
  } else {
    console.log('✅ All buckets mirrored.');
  }
}

main().catch((e: unknown) => {
  console.error('FATAL:', (e as Error).message);
  process.exit(1);
});
