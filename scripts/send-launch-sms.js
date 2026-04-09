#!/usr/bin/env node
/**
 * Mass SMS sender for Bridge launch announcement.
 *
 * Reads the beta signup CSV, normalizes phone numbers to E.164,
 * deduplicates, and sends via Twilio at 1 message/second.
 *
 * Usage:
 *   # Dry run (no messages sent, just shows what would happen):
 *   node scripts/send-launch-sms.js --dry-run
 *
 *   # Actually send:
 *   TWILIO_ACCOUNT_SID=xxx TWILIO_AUTH_TOKEN=xxx TWILIO_FROM_NUMBER=+1xxx node scripts/send-launch-sms.js
 *
 * Environment variables:
 *   TWILIO_ACCOUNT_SID    — Twilio Account SID
 *   TWILIO_AUTH_TOKEN      — Twilio Auth Token
 *   TWILIO_FROM_NUMBER     — Your Twilio phone number (E.164 format, e.g. +1234567890)
 *   APP_STORE_LINK         — App Store download URL (or set below)
 */

const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const CSV_PATH = path.join(__dirname, '..', '..', 'Downloads', 'bridge beta_rows.csv');
const APP_LINK = process.env.APP_STORE_LINK || 'https://apps.apple.com/us/app/bridge-social-matchmaking/id6759764704';
const MESSAGE = `Bridge just went live 🎉\n\n200+ people have already downloaded it at Rice!\n\nCheck it out here: ${APP_LINK}`;
const RATE_LIMIT_MS = 1000; // 1 message per second
const DRY_RUN = process.argv.includes('--dry-run');

// Schedule support: --send-at "2026-04-05T19:30:00" (Central time)
// The script will wait until that time before sending any messages.
const SEND_AT_ARG = process.argv.find(a => a.startsWith('--send-at='));
const SEND_AT = SEND_AT_ARG ? SEND_AT_ARG.split('=')[1] : null;
// ────────────────────────────────────────────────────────────────────────────

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

if (!DRY_RUN && (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM)) {
  console.error('Missing Twilio env vars. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER');
  console.error('Or run with --dry-run to preview without sending.');
  process.exit(1);
}

/**
 * Parse the multiline CSV format.
 *
 * Each record spans 7 lines:
 *   "              ← opening quote
 *   Name           ← field value
 *   ","            ← field separator
 *   email          ← field value
 *   ","            ← field separator
 *   phone          ← field value
 *   ",             ← record terminator
 *
 * Empty fields have a blank line for the value.
 */
function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const records = [];

  // Skip header
  let i = 1;

  while (i < lines.length) {
    // Find the start of a record: a line that is just `"`
    if (lines[i] && lines[i].trim() === '"') {
      // Next line is the name
      const name = (lines[i + 1] || '').trim();
      // lines[i+2] should be `","`  (field separator)
      // Next line is the email
      const email = (lines[i + 3] || '').trim();
      // lines[i+4] should be `","`  (field separator)
      // Next line is the phone
      const phone = (lines[i + 5] || '').trim();
      // lines[i+6] should be `",`  (record terminator)

      if (name || email || phone) {
        records.push({ name, email, phone });
      }
      i += 7; // Skip to next record
    } else {
      i++;
    }
  }

  return records;
}

/**
 * Normalize a phone string to E.164 format (+1XXXXXXXXXX for US numbers).
 * Returns null if the number can't be parsed.
 */
function normalizePhone(raw) {
  if (!raw || !raw.trim()) return null;

  // Strip all non-digit characters except leading +
  let digits = raw.replace(/[^\d+]/g, '');

  // Remove leading + for digit processing
  const hadPlus = digits.startsWith('+');
  digits = digits.replace(/^\+/, '');

  // Handle various formats
  if (digits.length === 10) {
    // US number without country code
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // US number with country code
    return `+${digits}`;
  } else if (digits.length === 12 && digits.startsWith('1')) {
    // +1 plus 10 digits (sometimes extra 1)
    return `+${digits.slice(0, 11)}`;
  } else if (hadPlus && digits.length >= 10) {
    // International number with +
    return `+${digits}`;
  } else if (digits.length >= 10) {
    // Assume US if 10+ digits
    const last10 = digits.slice(-10);
    return `+1${last10}`;
  }

  return null; // Can't parse
}

/**
 * Send a single SMS via Twilio REST API.
 */
async function sendSms(to, message) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: message }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`Twilio ${response.status}: ${body.message || JSON.stringify(body)}`);
  }

  return body.sid;
}

/**
 * Sleep helper.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📱 Bridge Launch SMS Sender');
  console.log(`${DRY_RUN ? '🏃 DRY RUN — no messages will be sent' : '🚀 LIVE MODE — messages will be sent'}\n`);

  // 1. Parse CSV
  const records = parseCSV(CSV_PATH);
  console.log(`Parsed ${records.length} records from CSV\n`);

  // 2. Normalize and deduplicate
  const seen = new Set();
  const recipients = [];
  const skipped = [];

  for (const rec of records) {
    const phone = normalizePhone(rec.phone);
    if (!phone) {
      skipped.push({ ...rec, reason: 'invalid_phone' });
      continue;
    }
    if (seen.has(phone)) {
      skipped.push({ ...rec, reason: 'duplicate' });
      continue;
    }
    seen.add(phone);
    recipients.push({ name: rec.name, email: rec.email, phone });
  }

  console.log(`✅ ${recipients.length} valid unique phone numbers`);
  console.log(`⏭️  ${skipped.length} skipped (${skipped.filter(s => s.reason === 'duplicate').length} duplicates, ${skipped.filter(s => s.reason === 'invalid_phone').length} invalid)\n`);

  if (skipped.filter(s => s.reason === 'invalid_phone').length > 0) {
    console.log('Skipped (invalid phone):');
    skipped.filter(s => s.reason === 'invalid_phone').forEach(s => {
      console.log(`  - ${s.name || '(no name)'} | ${s.email || '(no email)'} | raw: "${s.phone}"`);
    });
    console.log('');
  }

  console.log(`Message (${MESSAGE.length} chars):`);
  console.log(`  "${MESSAGE}"\n`);

  if (MESSAGE.includes('APP_STORE_LINK_HERE')) {
    console.error('⚠️  Replace APP_STORE_LINK_HERE with your actual App Store URL!');
    console.error('  Set APP_STORE_LINK env var or edit the script.');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('Would send to:');
    recipients.forEach((r, i) => {
      console.log(`  ${(i + 1).toString().padStart(3)}. ${r.phone} — ${r.name || '(no name)'}`);
    });
    console.log(`\nTotal: ${recipients.length} messages`);
    console.log(`Estimated time: ~${Math.ceil(recipients.length / 60)} minutes`);
    if (SEND_AT) {
      console.log(`\nScheduled for: ${SEND_AT} Central`);
    }
    return;
  }

  // 2.5. Wait for scheduled time if --send-at is set
  if (SEND_AT) {
    // Parse as Central time (CDT = UTC-5 in April)
    const targetUTC = new Date(SEND_AT + '-05:00').getTime();
    const now = Date.now();
    const waitMs = targetUTC - now;

    if (waitMs <= 0) {
      console.error(`⚠️  Scheduled time ${SEND_AT} is in the past!`);
      process.exit(1);
    }

    const waitMins = Math.round(waitMs / 60000);
    const targetDate = new Date(targetUTC);
    console.log(`⏰ Scheduled to send at: ${SEND_AT} Central (${targetDate.toLocaleString('en-US', { timeZone: 'America/Chicago' })})`);
    console.log(`   Waiting ${Math.floor(waitMins / 60)}h ${waitMins % 60}m...\n`);
    console.log(`   Leave this terminal open. Messages will send automatically.`);
    console.log(`   Press Ctrl+C to cancel.\n`);

    await sleep(waitMs);

    console.log(`\n⏰ It's time! Starting to send ${recipients.length} messages...\n`);
  }

  // 3. Send with rate limiting
  let sent = 0;
  let failed = 0;
  const failures = [];
  const startTime = Date.now();

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const progress = `[${(i + 1).toString().padStart(3)}/${recipients.length}]`;

    try {
      const sid = await sendSms(r.phone, MESSAGE);
      sent++;
      console.log(`${progress} ✅ ${r.phone} — ${r.name || '(no name)'} (${sid})`);
    } catch (err) {
      failed++;
      failures.push({ ...r, error: err.message });
      console.log(`${progress} ❌ ${r.phone} — ${r.name || '(no name)'} — ${err.message}`);
    }

    // Rate limit: 1 per second
    if (i < recipients.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  // 4. Summary
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('\n─────────────────────────────────');
  console.log(`✅ Sent: ${sent}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`);

  if (failures.length > 0) {
    console.log('\nFailed numbers:');
    failures.forEach(f => {
      console.log(`  ${f.phone} — ${f.name} — ${f.error}`);
    });

    // Write failures to file for retry
    const failPath = path.join(__dirname, 'sms-failures.json');
    fs.writeFileSync(failPath, JSON.stringify(failures, null, 2));
    console.log(`\nFailures saved to: ${failPath}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
