/**
 * Tests for deepQuestions utility
 */

import {
  DEEP_QUESTIONS,
  TOTAL_QUESTIONS,
  MAX_DISPLAYED_QUESTIONS,
  getQuestionById,
  getUnansweredQuestions,
  DeepQuestion,
} from '../../src/utils/deepQuestions';

// IDs that were removed per the module header comment
const REMOVED_IDS = [3, 4, 7, 8, 11, 17, 18, 19, 20];

describe('deepQuestions', () => {
  // ── Constants ───────────────────────────────────────────────────────────
  describe('constants', () => {
    it('TOTAL_QUESTIONS matches the actual array length', () => {
      expect(TOTAL_QUESTIONS).toBe(DEEP_QUESTIONS.length);
    });

    it('MAX_DISPLAYED_QUESTIONS is 3', () => {
      expect(MAX_DISPLAYED_QUESTIONS).toBe(3);
    });
  });

  // ── Question shape validation ───────────────────────────────────────────
  describe('question structure', () => {
    it.each(DEEP_QUESTIONS)('question id=$id has required fields', (q: DeepQuestion) => {
      expect(typeof q.id).toBe('number');
      expect(typeof q.question).toBe('string');
      expect(q.question.length).toBeGreaterThan(0);
    });

    it('all IDs are unique', () => {
      const ids = DEEP_QUESTIONS.map(q => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('does not contain any removed question IDs', () => {
      const ids = DEEP_QUESTIONS.map(q => q.id);
      for (const removedId of REMOVED_IDS) {
        expect(ids).not.toContain(removedId);
      }
    });
  });

  // ── getQuestionById ─────────────────────────────────────────────────────
  describe('getQuestionById', () => {
    it('returns the correct question for a valid ID', () => {
      const q = getQuestionById(1);
      expect(q).toBeDefined();
      expect(q!.id).toBe(1);
      expect(q!.question).toContain('dinner guest');
    });

    it('returns a question for every ID in the array', () => {
      for (const question of DEEP_QUESTIONS) {
        expect(getQuestionById(question.id)).toBe(question);
      }
    });

    it('returns undefined for an ID that was never used', () => {
      expect(getQuestionById(9999)).toBeUndefined();
    });

    it('returns undefined for a removed question ID', () => {
      for (const removedId of REMOVED_IDS) {
        expect(getQuestionById(removedId)).toBeUndefined();
      }
    });

    it('returns undefined for negative IDs', () => {
      expect(getQuestionById(-1)).toBeUndefined();
    });

    it('returns undefined for zero', () => {
      expect(getQuestionById(0)).toBeUndefined();
    });
  });

  // ── getUnansweredQuestions ───────────────────────────────────────────────
  describe('getUnansweredQuestions', () => {
    it('returns all questions when no IDs have been answered', () => {
      const result = getUnansweredQuestions([]);
      expect(result).toHaveLength(DEEP_QUESTIONS.length);
    });

    it('excludes answered questions', () => {
      const answeredIds = [1, 2, 5];
      const result = getUnansweredQuestions(answeredIds);
      expect(result).toHaveLength(DEEP_QUESTIONS.length - 3);
      const resultIds = result.map(q => q.id);
      for (const id of answeredIds) {
        expect(resultIds).not.toContain(id);
      }
    });

    it('returns empty array when all questions are answered', () => {
      const allIds = DEEP_QUESTIONS.map(q => q.id);
      expect(getUnansweredQuestions(allIds)).toHaveLength(0);
    });

    it('ignores answered IDs that do not exist in the array (e.g. removed questions)', () => {
      const result = getUnansweredQuestions(REMOVED_IDS);
      expect(result).toHaveLength(DEEP_QUESTIONS.length);
    });

    it('handles a mix of valid and removed answered IDs', () => {
      const mixed = [1, 3, 4]; // 1 is valid, 3 and 4 are removed
      const result = getUnansweredQuestions(mixed);
      expect(result).toHaveLength(DEEP_QUESTIONS.length - 1);
      expect(result.map(q => q.id)).not.toContain(1);
    });
  });
});
