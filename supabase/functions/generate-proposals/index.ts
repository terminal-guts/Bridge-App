/**
 * Generate Proposals - Supabase Edge Function
 *
 * Triggered daily by pg_cron to:
 * 1. Generate new proposals from eligible user pairs
 * 2. Assign 3 proposals to each eligible user for voting
 * 3. Evaluate voting thresholds on existing proposals
 *
 * Also runs threshold evaluation hourly.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// Types
// ============================================================================

interface EligibleUser {
  id: string;
  first_name: string;
  age: number;
  gender: string[];
  location: string;
  height_inches: number | null;
  interests: string[];
  values: string[];
  ethnicity: string;
  religion: string;
  political_leaning: string;
  drinking_frequency: string;
  cannabis_frequency: string;
  tobacco_frequency: string;
  other_drugs_frequency: string;
  has_children: string;
  family_plans: string;
  education_level: string;
  school: string;
  current_job: string;
  company_position: string;
}

interface UserPreferences {
  user_id: string;
  age_min: number;
  age_max: number;
  preferred_gender: string;
  interested_in_genders: string[];
  height_min: number;
  height_max: number;
  distance_miles: number;
  preferred_ethnicities: string[];
  preferred_politics: string[];
  partner_drinking: string[];
  partner_cannabis: string[];
  partner_tobacco: string[];
  partner_other_drugs: string[];
  non_negotiables: any[];
}

// ============================================================================
// Category Weights (matches matchingAlgorithm.ts)
// ============================================================================

const WEIGHTS = {
  age: 0.18,
  distance: 0.15,
  lifestyle: 0.12,
  values: 0.10,
  interests: 0.10,
  family: 0.08,
  religion: 0.06,
  politics: 0.06,
  height: 0.05,
  ethnicity: 0.05,
  education: 0.03,
  career: 0.02,
};

// ============================================================================
// Scoring Functions (ported from matchingAlgorithm.ts)
// ============================================================================

function isViableMatch(
  userA: EligibleUser,
  prefsA: UserPreferences,
  userB: EligibleUser,
  prefsB: UserPreferences
): boolean {
  // Gender compatibility
  const aInterestedIn = prefsA.interested_in_genders || [];
  const bInterestedIn = prefsB.interested_in_genders || [];
  const aGenders = userA.gender || [];
  const bGenders = userB.gender || [];

  const aInterestedInB = aInterestedIn.length === 0 ||
    aInterestedIn.some((g: string) => bGenders.includes(g));
  const bInterestedInA = bInterestedIn.length === 0 ||
    bInterestedIn.some((g: string) => aGenders.includes(g));

  if (!aInterestedInB || !bInterestedInA) return false;

  // Age range check with buffer
  const aAgeMin = (prefsA.age_min ?? 18) - 2;
  const aAgeMax = (prefsA.age_max ?? 99) + 2;
  const bAgeMin = (prefsB.age_min ?? 18) - 2;
  const bAgeMax = (prefsB.age_max ?? 99) + 2;

  if (userB.age < aAgeMin || userB.age > aAgeMax) return false;
  if (userA.age < bAgeMin || userA.age > bAgeMax) return false;

  return true;
}

function calculateMatchScore(
  userA: EligibleUser,
  prefsA: UserPreferences,
  userB: EligibleUser,
  prefsB: UserPreferences
): number {
  let total = 0;

  // Age (18%)
  const ageScoreA = gradientScore(userB.age, prefsA.age_min ?? 18, prefsA.age_max ?? 99);
  const ageScoreB = gradientScore(userA.age, prefsB.age_min ?? 18, prefsB.age_max ?? 99);
  total += ((ageScoreA + ageScoreB) / 2) * WEIGHTS.age;

  // Distance (15%) - default 50% without geocoding
  total += 50 * WEIGHTS.distance;

  // Lifestyle (12%)
  const lifestyleScore = scoreLifestyle(userA, prefsA, userB, prefsB);
  total += lifestyleScore * WEIGHTS.lifestyle;

  // Values (10%)
  total += jaccardSimilarity(userA.values || [], userB.values || []) * 100 * WEIGHTS.values;

  // Interests (10%)
  total += jaccardSimilarity(userA.interests || [], userB.interests || []) * 100 * WEIGHTS.interests;

  // Family (8%)
  total += scoreFamily(userA, userB) * WEIGHTS.family;

  // Religion (6%)
  total += scoreReligion(userA, userB) * WEIGHTS.religion;

  // Politics (6%)
  total += scorePolitics(userA, prefsA, userB, prefsB) * WEIGHTS.politics;

  // Height (5%)
  if (userA.height_inches && userB.height_inches) {
    const hA = gradientScore(userB.height_inches, prefsA.height_min || 48, prefsA.height_max || 96);
    const hB = gradientScore(userA.height_inches, prefsB.height_min || 48, prefsB.height_max || 96);
    total += ((hA + hB) / 2) * WEIGHTS.height;
  } else {
    total += 50 * WEIGHTS.height;
  }

  // Ethnicity (5%)
  total += scoreEthnicity(userA, prefsA, userB, prefsB) * WEIGHTS.ethnicity;

  // Education (3%)
  total += scoreEducation(userA, userB) * WEIGHTS.education;

  // Career (2%)
  total += scoreCareer(userA, userB) * WEIGHTS.career;

  return Math.round(total * 100) / 100;
}

function gradientScore(value: number, min: number, max: number): number {
  if (value < min || value > max) return 0;
  const ideal = (min + max) / 2;
  const range = (max - min) / 2;
  if (range === 0) return value === ideal ? 100 : 0;
  return 100 - (Math.abs(value - ideal) / range) * 50;
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a.map(x => x.toLowerCase()));
  const setB = new Set(b.map(x => x.toLowerCase()));
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function scoreLifestyle(
  userA: EligibleUser, prefsA: UserPreferences,
  userB: EligibleUser, prefsB: UserPreferences
): number {
  const substances = [
    { freq: 'drinking_frequency', pref: 'partner_drinking' },
    { freq: 'cannabis_frequency', pref: 'partner_cannabis' },
    { freq: 'tobacco_frequency', pref: 'partner_tobacco' },
    { freq: 'other_drugs_frequency', pref: 'partner_other_drugs' },
  ] as const;

  let total = 0;
  for (const s of substances) {
    const aFreq = (userA as any)[s.freq] || '';
    const bFreq = (userB as any)[s.freq] || '';
    const aPref: string[] = (prefsA as any)[s.pref] || [];
    const bPref: string[] = (prefsB as any)[s.pref] || [];

    const aAcceptsB = scoreSubstanceMatch(bFreq, aPref);
    const bAcceptsA = scoreSubstanceMatch(aFreq, bPref);
    total += (aAcceptsB + bAcceptsA) / 2;
  }
  return total / 4;
}

function scoreSubstanceMatch(frequency: string, preferences: string[]): number {
  if (!frequency) return 50;
  if (preferences.length === 0 || preferences.includes("don't care") || preferences.includes("dont_care")) return 100;
  if (preferences.includes(frequency)) return 100;
  if (frequency === 'sometimes') {
    const acceptsYes = preferences.some(p => ['yes', 'often', 'regularly'].includes(p));
    const acceptsNo = preferences.some(p => ['no', 'never'].includes(p));
    if ((acceptsYes && !acceptsNo) || (acceptsNo && !acceptsYes)) return 50;
  }
  if (frequency === 'prefer_not_to_say') return 50;
  return 0;
}

function scoreFamily(userA: EligibleUser, userB: EligibleUser): number {
  let childrenScore = 50;
  if (userA.has_children && userB.has_children) {
    if (userA.has_children === userB.has_children) childrenScore = 100;
    else if (userA.has_children === 'prefer_not_to_say' || userB.has_children === 'prefer_not_to_say') childrenScore = 75;
  }

  let plansScore = 50;
  const aPlan = (userA.family_plans || '').toLowerCase();
  const bPlan = (userB.family_plans || '').toLowerCase();
  if (aPlan && bPlan) {
    if (aPlan === bPlan) plansScore = 100;
    else if (aPlan.includes('want') && bPlan.includes('dont')) plansScore = 0;
    else if (aPlan.includes('dont') && bPlan.includes('want')) plansScore = 0;
    else if (aPlan.includes('open') || bPlan.includes('open')) plansScore = 80;
    else plansScore = 60;
  }

  return childrenScore * 0.4 + plansScore * 0.6;
}

function scoreReligion(userA: EligibleUser, userB: EligibleUser): number {
  const a = (userA.religion || '').toLowerCase();
  const b = (userB.religion || '').toLowerCase();
  if (!a || !b) return 50;
  if (a === b) return 100;

  const similar = [['christian', 'spiritual'], ['buddhist', 'spiritual'], ['hindu', 'spiritual'], ['jewish', 'spiritual']];
  if (similar.some(pair => pair.includes(a) && pair.includes(b))) return 75;

  const opposing = [['atheist', 'christian'], ['atheist', 'muslim'], ['atheist', 'jewish'], ['atheist', 'hindu']];
  if (opposing.some(pair => (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a))) return 25;

  return 50;
}

function scorePolitics(
  userA: EligibleUser, prefsA: UserPreferences,
  userB: EligibleUser, prefsB: UserPreferences
): number {
  const aPol = userA.political_leaning || '';
  const bPol = userB.political_leaning || '';
  const aPref = prefsA.preferred_politics || [];
  const bPref = prefsB.preferred_politics || [];

  if (aPref.length === 0 && bPref.length === 0) return 100;
  if (aPol === 'prefer_not_to_say' || bPol === 'prefer_not_to_say') return 50;

  const aAccepts = aPref.length === 0 || aPref.includes(bPol);
  const bAccepts = bPref.length === 0 || bPref.includes(aPol);
  if (aAccepts && bAccepts) return 100;

  const spectrum = ['very_liberal', 'liberal', 'moderate', 'conservative', 'very_conservative'];
  const aIdx = spectrum.indexOf(aPol);
  const bIdx = spectrum.indexOf(bPol);
  if (aIdx === -1 || bIdx === -1) return aPol === 'not_political' || bPol === 'not_political' ? 60 : 50;

  const distance = Math.abs(aIdx - bIdx);
  return [100, 80, 50, 25, 0][distance] ?? 0;
}

function scoreEthnicity(
  userA: EligibleUser, prefsA: UserPreferences,
  userB: EligibleUser, prefsB: UserPreferences
): number {
  const aEth = userA.ethnicity || '';
  const bEth = userB.ethnicity || '';
  const aPref = prefsA.preferred_ethnicities || [];
  const bPref = prefsB.preferred_ethnicities || [];

  const aAccepts = aPref.length === 0 || aPref.some(p => bEth.toLowerCase().includes(p.toLowerCase()));
  const bAccepts = bPref.length === 0 || bPref.some(p => aEth.toLowerCase().includes(p.toLowerCase()));

  if (aAccepts && bAccepts) return 100;
  if (aAccepts || bAccepts) return 50;
  return 0;
}

function scoreEducation(userA: EligibleUser, userB: EligibleUser): number {
  const levels: Record<string, number> = {
    no_high_school: 0, high_school: 1, some_college: 2, trade_school: 2,
    associates: 3, bachelors: 4, masters: 5, phd: 6, beyond_masters: 6, professional: 6, other: 3,
  };
  const aLevel = levels[(userA.education_level || '').toLowerCase()] ?? 3;
  const bLevel = levels[(userB.education_level || '').toLowerCase()] ?? 3;
  const distance = Math.abs(aLevel - bLevel);
  return [100, 80, 60, 40, 20, 20, 20][distance] ?? 20;
}

function scoreCareer(userA: EligibleUser, userB: EligibleUser): number {
  const aJob = (userA.current_job || '').toLowerCase();
  const bJob = (userB.current_job || '').toLowerCase();
  const aSchool = (userA.school || '').toLowerCase();
  const bSchool = (userB.school || '').toLowerCase();

  if (aSchool && aSchool === bSchool) return 100;

  const keywords = ['engineer', 'developer', 'designer', 'manager', 'analyst', 'consultant',
    'director', 'marketing', 'sales', 'finance', 'product', 'data', 'software', 'research'];
  const aK = keywords.filter(k => aJob.includes(k));
  const bK = keywords.filter(k => bJob.includes(k));
  if (aK.some(k => bK.includes(k))) return 75;
  if ((aJob || bJob)) return 50;
  return 50;
}

// ============================================================================
// Main Logic
// ============================================================================

async function generateProposals() {
  console.log('[PROPOSALS] Starting proposal generation');

  // 1. Fetch eligible users
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('*')
    .eq('matchmaking_eligible', true)
    .eq('is_paused', false);

  if (usersError || !users || users.length === 0) {
    console.log('[PROPOSALS] No eligible users found');
    return { generated: 0, assigned: 0 };
  }

  console.log(`[PROPOSALS] Found ${users.length} eligible users`);

  // 2. Fetch preferences for all eligible users
  const userIds = users.map(u => u.id);
  const { data: allPrefs } = await supabase
    .from('user_preferences')
    .select('*')
    .in('user_id', userIds);

  const prefsMap = new Map<string, UserPreferences>();
  for (const p of allPrefs || []) {
    prefsMap.set(p.user_id, p);
  }

  // 3. Fetch existing active proposals and rejected pairs
  const { data: existingProposals } = await supabase
    .from('proposals')
    .select('user_a_id, user_b_id')
    .in('status', ['voting', 'approved']);

  const existingPairs = new Set(
    (existingProposals || []).map(p => `${p.user_a_id}:${p.user_b_id}`)
  );

  const { data: rejectedPairs } = await supabase
    .from('rejected_pairs')
    .select('user_a_id, user_b_id');

  const rejectedSet = new Set(
    (rejectedPairs || []).map(p => `${p.user_a_id}:${p.user_b_id}`)
  );

  // 4. Score all viable pairs
  interface ScoredPair {
    userAId: string;
    userBId: string;
    score: number;
  }

  const scoredPairs: ScoredPair[] = [];

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const userA = users[i];
      const userB = users[j];
      const prefsA = prefsMap.get(userA.id);
      const prefsB = prefsMap.get(userB.id);

      if (!prefsA || !prefsB) continue;

      // Normalize pair order
      const [aId, bId] = userA.id < userB.id
        ? [userA.id, userB.id]
        : [userB.id, userA.id];

      // Skip existing or rejected
      const pairKey = `${aId}:${bId}`;
      if (existingPairs.has(pairKey) || rejectedSet.has(pairKey)) continue;

      // Check viability
      if (!isViableMatch(userA, prefsA, userB, prefsB)) continue;

      // Calculate score
      const score = calculateMatchScore(userA, prefsA, userB, prefsB);
      scoredPairs.push({ userAId: aId, userBId: bId, score });
    }
  }

  // 5. Sort by score, take top pairs
  scoredPairs.sort((a, b) => b.score - a.score);
  const maxProposals = Math.min(scoredPairs.length, users.length * 2); // ~2 proposals per user
  const topPairs = scoredPairs.slice(0, maxProposals);

  console.log(`[PROPOSALS] Creating ${topPairs.length} proposals from ${scoredPairs.length} viable pairs`);

  // 6. Insert proposals
  const now = new Date();
  const votingExpires = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const proposalExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const proposalRows = topPairs.map(p => ({
    user_a_id: p.userAId,
    user_b_id: p.userBId,
    status: 'voting',
    match_score: p.score,
    voting_expires_at: votingExpires,
    proposal_expires_at: proposalExpires,
  }));

  let generatedCount = 0;
  if (proposalRows.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('proposals')
      .insert(proposalRows)
      .select('id, user_a_id, user_b_id');

    if (insertError) {
      console.error('[PROPOSALS] Error inserting proposals:', insertError);
    } else {
      generatedCount = inserted?.length || 0;
    }
  }

  // 7. Assign 3 proposals to each eligible user for voting
  const { data: votingProposals } = await supabase
    .from('proposals')
    .select('id, user_a_id, user_b_id')
    .eq('status', 'voting');

  const today = now.toISOString().split('T')[0];
  const assignmentRows: any[] = [];

  for (const user of users) {
    // Get proposals this user is NOT part of
    const availableProposals = (votingProposals || [])
      .filter(p => p.user_a_id !== user.id && p.user_b_id !== user.id);

    // Shuffle and pick 3
    const shuffled = availableProposals.sort(() => Math.random() - 0.5);
    const assigned = shuffled.slice(0, 3);

    for (const proposal of assigned) {
      assignmentRows.push({
        user_id: user.id,
        proposal_id: proposal.id,
        assignment_date: today,
        has_voted: false,
      });
    }
  }

  let assignedCount = 0;
  if (assignmentRows.length > 0) {
    const { data: assignedData, error: assignError } = await supabase
      .from('daily_proposal_assignments')
      .upsert(assignmentRows, {
        onConflict: 'user_id,proposal_id,assignment_date',
      })
      .select();

    if (assignError) {
      console.error('[PROPOSALS] Error assigning proposals:', assignError);
    } else {
      assignedCount = assignedData?.length || 0;
    }
  }

  return { generated: generatedCount, assigned: assignedCount };
}

async function evaluateThresholds() {
  console.log('[PROPOSALS] Evaluating proposal thresholds');

  // Approve: >= 10 votes AND >= 60% yes
  const { data: toApprove } = await supabase
    .from('proposals')
    .select('id, user_a_id, user_b_id')
    .eq('status', 'voting')
    .gte('total_votes', 10)
    .gte('yes_percentage', 60);

  for (const proposal of toApprove || []) {
    await supabase
      .from('proposals')
      .update({ status: 'approved' })
      .eq('id', proposal.id);
    console.log(`[PROPOSALS] Approved proposal ${proposal.id}`);
  }

  // Reject: >= 10 votes AND < 40% yes
  const { data: toReject } = await supabase
    .from('proposals')
    .select('id, user_a_id, user_b_id')
    .eq('status', 'voting')
    .gte('total_votes', 10)
    .lt('yes_percentage', 40);

  for (const proposal of toReject || []) {
    await supabase
      .from('proposals')
      .update({ status: 'rejected' })
      .eq('id', proposal.id);

    // Add to rejected_pairs
    await supabase.from('rejected_pairs').upsert({
      user_a_id: proposal.user_a_id,
      user_b_id: proposal.user_b_id,
      rejection_source: 'community_vote',
    }, { onConflict: 'user_a_id,user_b_id' });

    console.log(`[PROPOSALS] Rejected proposal ${proposal.id}`);
  }

  // Expire: older than 48 hours still in 'voting'
  const expiryCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: toExpire } = await supabase
    .from('proposals')
    .select('id, user_a_id, user_b_id')
    .eq('status', 'voting')
    .lt('created_at', expiryCutoff);

  for (const proposal of toExpire || []) {
    await supabase
      .from('proposals')
      .update({ status: 'expired' })
      .eq('id', proposal.id);

    await supabase.from('rejected_pairs').upsert({
      user_a_id: proposal.user_a_id,
      user_b_id: proposal.user_b_id,
      rejection_source: 'expired',
    }, { onConflict: 'user_a_id,user_b_id' });

    console.log(`[PROPOSALS] Expired proposal ${proposal.id}`);
  }

  return {
    approved: toApprove?.length || 0,
    rejected: toReject?.length || 0,
    expired: toExpire?.length || 0,
  };
}

// ============================================================================
// HTTP Handler
// ============================================================================

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'full';

    let result: any;

    if (action === 'evaluate') {
      // Threshold evaluation only (for hourly cron)
      result = await evaluateThresholds();
    } else {
      // Full run: generate + evaluate
      const generated = await generateProposals();
      const evaluated = await evaluateThresholds();
      result = { ...generated, ...evaluated };
    }

    console.log('[PROPOSALS] Complete:', result);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[PROPOSALS] Error:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
