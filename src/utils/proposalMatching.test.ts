/**
 * Proposal Matching Utility Tests
 *
 * Run with: npx tsx src/utils/proposalMatching.test.ts
 */

import { matchLifestyleAttribute } from './proposalMatching.ts';

// ============================================================================
// Test Cases
// ============================================================================

function runTests() {
  console.log('='.repeat(60));
  console.log('BRIDGE PROPOSAL MATCHING UTILITY TESTS');
  console.log('='.repeat(60));
  console.log();

  testLifestyleMatching();

  console.log('\n' + '='.repeat(60));
  console.log('ALL TESTS COMPLETE');
  console.log('='.repeat(60));
}

function testLifestyleMatching() {
  console.log('📊 TEST: Lifestyle Matching Logic');

  const cases = [
    {
      name: "Exact match (lowercase)",
      aRoutine: 'socially',
      aPref: ['socially'],
      bRoutine: 'socially',
      bPref: ['socially'],
      expected: 'both_happy'
    },
    {
      name: "Don't care (lowercase)",
      aRoutine: 'socially',
      aPref: ["don't care"],
      bRoutine: 'never',
      bPref: ["don't care"],
      expected: 'both_happy'
    },
    {
      name: "Don't care (mixed case)",
      aRoutine: 'socially',
      aPref: ["Don't Care"],
      bRoutine: 'never',
      bPref: ["DON'T CARE"],
      expected: 'both_happy'
    },
    {
      name: "Irrelevant (lowercase)",
      aRoutine: 'socially',
      aPref: ["irrelevant"],
      bRoutine: 'never',
      bPref: ["irrelevant"],
      expected: 'both_happy'
    },
    {
      name: "Irrelevant (mixed case)",
      aRoutine: 'socially',
      aPref: ["Irrelevant"],
      bRoutine: 'never',
      bPref: ["IRRELEVANT"],
      expected: 'both_happy'
    },
    {
      name: "Case-insensitive routine matching",
      aRoutine: 'Socially',
      aPref: ['socially'],
      bRoutine: 'never',
      bPref: ['Socially'],
      expected: 'right_happy'
    },
    {
      name: "Mismatch",
      aRoutine: 'never',
      aPref: ['never'],
      bRoutine: 'often',
      bPref: ['often'],
      expected: 'neither_happy'
    },
    {
      name: "Safety: null/undefined preferences",
      aRoutine: 'socially',
      aPref: [null, undefined, 'socially'] as any,
      bRoutine: 'socially',
      bPref: [undefined, 'socially'] as any,
      expected: 'both_happy'
    },
    {
      name: "Safety: routine missing (should return unknown)",
      aRoutine: undefined,
      aPref: ['socially'],
      bRoutine: 'socially',
      bPref: ['socially'],
      expected: 'unknown'
    }
  ];

  let passed = 0;
  for (const c of cases) {
    const res = matchLifestyleAttribute(c.aRoutine, c.aPref, c.bRoutine, c.bPref, 'test');
    if (res.status === c.expected) {
      console.log(`✅ [PASS] ${c.name}`);
      passed++;
    } else {
      console.log(`❌ [FAIL] ${c.name}: expected ${c.expected}, got ${res.status}`);
    }
  }

  console.log(`\nResult: ${passed}/${cases.length} tests passed`);
}

runTests();
