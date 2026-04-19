/**
 * Tests for imageModerationService — the frontend wrapper around the
 * moderate-image edge function. Covers approval, rejection, and all three
 * fail-open paths (edge function error, null data, thrown exception).
 */

const mockInvoke = jest.fn();

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

jest.mock('../../src/utils/secureLogger', () => ({
  createLogger: () => ({
    info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
  }),
}));

import { moderateImage } from '../../src/services/imageModerationService';

beforeEach(() => {
  mockInvoke.mockReset();
});

describe('moderateImage — approval path', () => {
  it('returns approved=true when edge function approves with face + clean SafeSearch', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        approved: true,
        hasFace: true,
        faceConfidence: 0.94,
        safeSearch: { adult: 'VERY_UNLIKELY', violence: 'VERY_UNLIKELY', racy: 'UNLIKELY', medical: 'UNLIKELY' },
        reasons: [],
      },
      error: null,
    });

    const result = await moderateImage('user-1/photo_abc.jpg', true);

    expect(result).toEqual({ approved: true, hasFace: true, reasons: [] });
    expect(mockInvoke).toHaveBeenCalledWith('moderate-image', {
      body: { storagePath: 'user-1/photo_abc.jpg', isMain: true },
    });
  });

  it('passes isMain=false through for secondary photos', async () => {
    mockInvoke.mockResolvedValue({ data: { approved: true, hasFace: null, reasons: [] }, error: null });

    await moderateImage('user-1/photo_secondary.jpg', false);

    expect(mockInvoke).toHaveBeenCalledWith('moderate-image', {
      body: { storagePath: 'user-1/photo_secondary.jpg', isMain: false },
    });
  });
});

describe('moderateImage — rejection path', () => {
  it('returns approved=false with the edge-function reason when main photo has no face', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        approved: false,
        hasFace: false,
        faceConfidence: null,
        safeSearch: { adult: 'VERY_UNLIKELY', violence: 'VERY_UNLIKELY', racy: 'VERY_UNLIKELY', medical: 'VERY_UNLIKELY' },
        reasons: ['Your main photo needs to clearly show your face.'],
      },
      error: null,
    });

    const result = await moderateImage('user-1/photo_landscape.jpg', true);

    expect(result.approved).toBe(false);
    expect(result.hasFace).toBe(false);
    expect(result.reasons).toEqual(['Your main photo needs to clearly show your face.']);
  });

  it('returns approved=false for SafeSearch violations', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        approved: false,
        hasFace: true,
        reasons: ['This photo may contain inappropriate content.'],
      },
      error: null,
    });

    const result = await moderateImage('user-1/photo_nsfw.jpg', true);

    expect(result.approved).toBe(false);
    expect(result.reasons[0]).toContain('inappropriate');
  });
});

describe('moderateImage — fail-open paths', () => {
  it('fails open when the edge function returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Edge runtime crashed' } });

    const result = await moderateImage('user-1/photo.jpg', true);

    expect(result).toEqual({ approved: true, hasFace: null, reasons: [] });
  });

  it('fails open when the edge function returns null data', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: null });

    const result = await moderateImage('user-1/photo.jpg', true);

    expect(result).toEqual({ approved: true, hasFace: null, reasons: [] });
  });

  it('fails open when invoke throws (network failure)', async () => {
    mockInvoke.mockRejectedValue(new Error('Network unreachable'));

    const result = await moderateImage('user-1/photo.jpg', true);

    expect(result).toEqual({ approved: true, hasFace: null, reasons: [] });
  });

  it('fails open on malformed edge response (no approved field) — defaults to true', async () => {
    mockInvoke.mockResolvedValue({ data: { hasFace: true /* missing approved */ }, error: null });

    const result = await moderateImage('user-1/photo.jpg', true);

    expect(result.approved).toBe(true);
  });
});
