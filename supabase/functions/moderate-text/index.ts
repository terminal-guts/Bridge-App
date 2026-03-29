import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ── Banned phrases (from banned_phrases.txt) ───────────────────────────────
const BANNED_PHRASES = [
  'date', 'go out', 'hang out', 'hanging out', 'get a drink',
  'grab a coffee', 'meet up', 'scam', 'password', 'crypto',
  'whatsapp', 'telegram', 'wire transfer', 'money', 'venmo',
  'cashapp', 'payment',
];

// ── Asking-out phrases (from asking_out_detector.py) ──────────────────────
const ASKING_OUT_PHRASES = [
  // Direct date asks
  'go out', 'go on a date', 'on a date', 'take you out', 'ask you out',
  'asking you out', 'go out with me', 'go out with you', 'go out sometime',
  'want to date', 'be my date', 'be my girlfriend', 'be my boyfriend',
  // Coffee / drinks
  'grab coffee', 'get coffee', 'grab a coffee', 'get a coffee', 'coffee sometime',
  'coffee with me', 'get drinks', 'grab drinks', 'grab a drink', 'get a drink',
  'buy you a drink', 'buy you a coffee', 'drinks sometime', 'drinks after work',
  'drinks together', 'happy hour',
  // Meals
  'get dinner', 'grab dinner', 'dinner sometime', 'dinner with me',
  'dinner together', 'take you to dinner', 'get lunch', 'grab lunch',
  'lunch together', 'lunch sometime', 'grab a bite', 'get a bite',
  'take you to eat', 'cook for you', 'cook you dinner', 'come over for dinner',
  // Availability probes
  'are you free', 'are you busy', 'are you doing anything', 'are you available',
  'what are you doing tonight', 'what are you doing this weekend',
  'what are you doing friday', 'what are you doing saturday',
  'got plans tonight', 'got plans this weekend', 'any plans tonight',
  'any plans this weekend', 'free this weekend', 'free tonight',
  'free friday', 'free saturday',
  // Activities
  'go to a movie', 'see a movie', 'watch a movie', 'movie together', 'movie with me',
  'go hiking', 'go for a walk', 'walk together', 'walk with me', 'go bowling',
  'go dancing', 'go swimming', 'go stargazing', 'come with me', 'hang out',
  'hang sometime', 'chill sometime', 'chill together', 'spend time together',
  'spend time with you', 'do something together', 'do something fun',
  'check it out together', 'go together', 'come along', 'join me', 'be my plus one',
  'plus one', 'my place', 'come over', 'come to my place', 'your place',
  'go to your place', 'picnic', 'road trip', 'weekend getaway',
  // Romantic / escalation
  'get to know you', 'get to know you better', 'see you outside', 'see you again',
  'want to see you', 'meet up', 'meet in person', 'meet me', 'pick you up',
  'let me pick you up', 'plan something', 'somewhere special', 'somewhere nice',
  'take you somewhere', 'show you around', 'give me your number',
  'can i get your number', 'text me', 'call me', 'dm me', 'hit me up',
  'snap me', 'add me on', 'follow me on',
  // Compliments
  "you're cute", "you're beautiful", "you're gorgeous", "you're hot",
  "you're pretty", "you're attractive", "you're handsome", 'you look amazing',
  'i like you', 'i have feelings', 'i have a crush', 'crush on you',
];

// ── Anti-evasion normalization (port of asking_out_detector.py) ───────────
const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g',
  '@': 'a', '$': 's', '!': 'i', '(': 'c', '|': 'l', '+': 't',
  '€': 'e', '¢': 'c', '£': 'l', '¥': 'y', 'ß': 'b', 'ø': 'o', 'å': 'a', 'æ': 'ae',
  'ð': 'd', 'þ': 'th', 'ñ': 'n', 'ü': 'u', 'ö': 'o', 'ä': 'a', 'ë': 'e',
  'ï': 'i', 'ÿ': 'y', 'ç': 'c', 'š': 's', 'ž': 'z', 'đ': 'd',
};
const HOMOGLYPH_MAP: Record<string, string> = {
  '\u0430': 'a', '\u0435': 'e', '\u043e': 'o', '\u0440': 'p', '\u0441': 'c',
  '\u0443': 'y', '\u0445': 'x', '\u0456': 'i', '\u0458': 'j', '\u044a': 'b',
  '\u03b1': 'a', '\u03b5': 'e', '\u03bf': 'o', '\u03c1': 'p', '\u03c4': 't',
  '\u03b9': 'i', '\u03ba': 'k', '\u03bd': 'v',
};
const FULL_MAP: Record<string, string> = { ...LEET_MAP, ...HOMOGLYPH_MAP };

function normalizeText(text: string): [string, string, string] {
  // Pass 1: Remove zero-width / invisible Unicode
  let t = text.toLowerCase().replace(/[\u200b\u200c\u200d\u200e\u200f\ufeff\u00ad\u034f\u2060-\u2064]/g, ' ');
  // Pass 2: NFKD normalize + strip combining chars (strips accents: café → cafe)
  t = t.normalize('NFKD').replace(/\p{M}/gu, '');
  // Pass 3: Homoglyph + leet substitution (char by char)
  t = [...t].map(ch => FULL_MAP[ch] ?? ch).join('');
  // Pass 4: Inserted separators between letters → space (grab.coffee → grab coffee)
  t = t.replace(/(?<=[a-z])[.\-_*~`|/\\]+(?=[a-z])/g, ' ');
  // Pass 5: Collapse spaced-out letters (g r a b → grab)
  t = t.replace(/(?<![a-z])([a-z] )+[a-z](?![a-z])/g, (m) => {
    const parts = m.split(/  +/);
    if (parts.length > 1) return parts.map(p => p.replace(/[^a-z]/g, '')).join(' ');
    return m.replace(/[^a-z]/g, '');
  });
  // Pass 6a: t2 — 3+ same chars → keep 2 (goooout → goout)
  let t2 = t.replace(/(.)\1{2,}/g, '$1$1');
  // Pass 6b: t1 — 3+ same chars → keep 1 (goooout → gout)
  const t1 = t.replace(/(.)\1{2,}/g, '$1');
  // Pass 6c: tFull — iteratively collapse doubles until stable (graab → grab)
  let tFull = t2;
  for (let i = 0; i < 3; i++) {
    const next = tFull.replace(/(.)\1/g, '$1');
    if (next === tFull) break;
    tFull = next;
  }
  // Pass 7: Normalize whitespace in all three
  t2 = t2.replace(/\s+/g, ' ').trim();
  const t1Clean = t1.replace(/\s+/g, ' ').trim();
  tFull = tFull.replace(/\s+/g, ' ').trim();
  return [t2, t1Clean, tFull];
}

// ── PII regex (replaces AWS Comprehend) ───────────────────────────────────
const PHONE_RE = /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

// ── Main handler ──────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate user JWT — supabase.functions.invoke() sends it automatically
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing authorization' }, { status: 401, headers: corsHeaders });
    }
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const text: unknown = body?.text;
    if (!text || typeof text !== 'string') {
      return Response.json({ is_safe: true }, { headers: corsHeaders });
    }

    const lower = text.toLowerCase();
    const [t2, t1, tFull] = normalizeText(text);

    // Banned phrases: word-boundary regex on lowercased original
    const bannedMatch = BANNED_PHRASES.find(p =>
      new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(lower)
    );

    // Asking-out phrases: check all 3 normalized variants + original
    const allVariants = [lower, t2, t1, tFull];
    const askingOutMatch = ASKING_OUT_PHRASES.find(p =>
      allVariants.some(v => v.includes(p))
    );

    // PII: phone numbers and email addresses
    const piiDetected = PHONE_RE.test(text) || EMAIL_RE.test(text);

    const isSafe = !bannedMatch && !askingOutMatch && !piiDetected;

    return Response.json({
      is_safe: isSafe,
      pii: { pii_detected: piiDetected },
      banned_check: { flagged: !!bannedMatch, matched_phrases: bannedMatch ? [bannedMatch] : [] },
      asking_out: { is_asking_out: !!askingOutMatch, matched_phrases: askingOutMatch ? [askingOutMatch] : [] },
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('[moderate-text] error:', err);
    // Fail open — same behavior as when Railway is unreachable
    return Response.json({ is_safe: true }, { headers: corsHeaders });
  }
});
