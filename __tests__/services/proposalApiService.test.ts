/**
 * Tests for proposalApiService (src/services/proposalApiService.ts)
 *
 * Covers: transformBackendProposal field mapping, default values,
 * vote total computation, error propagation from edge functions
 */

// Mock supabase
const mockInvoke = jest.fn();
const mockFrom = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
    from: mockFrom,
  },
}));

import {
  transformBackendProposal,
  generateProposals,
  castProposalVote,
  decideOnProposal,
  triggerLifecycleCheck,
  getProposalsForVoting,
  submitFriendRecommendation,
  generateProposalForUser,
  assignNewUserProposals,
} from '../../src/services/proposalApiService';

beforeEach(() => {
  mockInvoke.mockReset();
  mockFrom.mockReset();
});

// ============================================================================
// transformBackendProposal
// ============================================================================

describe('transformBackendProposal', () => {
  it('maps all fields from backend format to frontend format', () => {
    const raw = {
      id: 'proposal-123',
      status: 'voting',
      pool_yes_votes: 5,
      pool_no_votes: 2,
      friend_yes_votes: 3,
      friend_no_votes: 1,
      pool_eligible: true,
      compatibility_score: 85,
      category_scores: { values: 90, interests: 80 },
      voting_started_at: '2026-03-01T12:00:00Z',
      confirmed_at: null,
      rejected_at: null,
      expired_at: null,
      sent_to_users_at: null,
      decision_deadline_at: '2026-03-06T12:00:00Z',
      user_a_decision: null,
      user_b_decision: null,
      user_a_decided_at: null,
      user_b_decided_at: null,
      created_at: '2026-03-01T12:00:00Z',
      updated_at: '2026-03-02T12:00:00Z',
      vote_context: 'pool',
      is_friend_vote: false,
      user_a_profile: { name: 'Alice' },
      user_b_profile: { name: 'Bob' },
    };

    const result = transformBackendProposal(raw);

    expect(result.id).toBe('proposal-123');
    expect(result.status).toBe('voting');
    expect(result.poolYesVotes).toBe(5);
    expect(result.poolNoVotes).toBe(2);
    expect(result.friendYesVotes).toBe(3);
    expect(result.friendNoVotes).toBe(1);
    expect(result.yesVotes).toBe(8); // 5 + 3
    expect(result.noVotes).toBe(3); // 2 + 1
    expect(result.totalVotes).toBe(11); // 5 + 2 + 3 + 1
    expect(result.compatibilityScore).toBe(85);
    expect(result.categoryScores).toEqual({ values: 90, interests: 80 });
    expect(result.votingStartedAt).toBe('2026-03-01T12:00:00Z');
    expect(result.confirmedAt).toBeNull();
    expect(result.decisionDeadlineAt).toBe('2026-03-06T12:00:00Z');
    expect(result.userAProfile).toEqual({ name: 'Alice' });
    expect(result.userBProfile).toEqual({ name: 'Bob' });
    expect(result.voteContext).toBe('pool');
    expect(result.isFriendVote).toBe(false);
  });

  it('defaults null vote counts to 0', () => {
    const raw = {
      id: 'proposal-empty',
      status: 'voting',
      pool_yes_votes: null,
      pool_no_votes: null,
      friend_yes_votes: null,
      friend_no_votes: null,
      compatibility_score: null,
    };

    const result = transformBackendProposal(raw);

    expect(result.poolYesVotes).toBe(0);
    expect(result.poolNoVotes).toBe(0);
    expect(result.friendYesVotes).toBe(0);
    expect(result.friendNoVotes).toBe(0);
    expect(result.yesVotes).toBe(0);
    expect(result.noVotes).toBe(0);
    expect(result.totalVotes).toBe(0);
    expect(result.compatibilityScore).toBe(0);
  });

  it('defaults undefined vote counts to 0', () => {
    const raw = {
      id: 'proposal-minimal',
      status: 'pending',
    };

    const result = transformBackendProposal(raw);

    expect(result.poolYesVotes).toBe(0);
    expect(result.poolNoVotes).toBe(0);
    expect(result.friendYesVotes).toBe(0);
    expect(result.friendNoVotes).toBe(0);
    expect(result.totalVotes).toBe(0);
  });

  // poolEligible was removed from Proposal type — no longer tested
});

// ============================================================================
// Edge function calls — error propagation
// ============================================================================

describe('generateProposals', () => {
  it('calls generate-proposals edge function', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        status: 'ok',
        eligible_users: 10,
        proposals_created: 5,
        pool_voters_assigned: 25,
      },
      error: null,
    });

    const result = await generateProposals(50);

    expect(mockInvoke).toHaveBeenCalledWith('generate-proposals', {
      body: { max_proposals: 50 },
    });
    expect(result.proposals_created).toBe(5);
  });

  it('throws on edge function error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Internal server error' },
    });

    await expect(generateProposals()).rejects.toThrow('Generate proposals failed: Internal server error');
  });
});

describe('castProposalVote', () => {
  it('calls process-vote edge function with correct body', async () => {
    mockInvoke.mockResolvedValue({
      data: { status: 'ok', vote_recorded: true },
      error: null,
    });

    await castProposalVote('proposal-1', 'voter-1', 'yes' as any);

    expect(mockInvoke).toHaveBeenCalledWith('process-vote', {
      body: {
        proposal_id: 'proposal-1',
        vote_type: 'yes',
      },
    });
  });

  it('throws on error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Vote failed' },
    });

    await expect(castProposalVote('p1', 'v1', 'yes' as any)).rejects.toThrow('Cast vote failed');
  });
});

describe('getProposalsForVoting', () => {
  it('calls get-proposals-for-voting without passing userId', async () => {
    mockInvoke.mockResolvedValue({
      data: { proposals: [], pool_count: 0, friend_count: 0 },
      error: null,
    });

    const result = await getProposalsForVoting('user-1');

    expect(mockInvoke).toHaveBeenCalledWith('get-proposals-for-voting');
    expect(result.proposals).toEqual([]);
  });

  it('throws on error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Fetch error' },
    });

    await expect(getProposalsForVoting('u1')).rejects.toThrow('Fetch proposals failed');
  });
});

describe('decideOnProposal', () => {
  it('calls process-decision with correct body', async () => {
    mockInvoke.mockResolvedValue({
      data: { status: 'ok', proposal_status: 'passed_to_match', your_decision: 'accepted' },
      error: null,
    });

    const result = await decideOnProposal('prop-1', 'user-1', 'accepted');

    expect(mockInvoke).toHaveBeenCalledWith('process-decision', {
      body: { proposal_id: 'prop-1', decision: 'accepted' },
    });
    expect(result.your_decision).toBe('accepted');
  });

  it('throws on error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Decision error' },
    });

    await expect(decideOnProposal('p1', 'u1', 'declined')).rejects.toThrow('Decision failed');
  });
});

describe('submitFriendRecommendation', () => {
  it('calls submit-recommendation with correct body', async () => {
    mockInvoke.mockResolvedValue({
      data: { status: 'ok' },
      error: null,
    });

    await submitFriendRecommendation('person-1', 'friend-1', 'source-prop');

    expect(mockInvoke).toHaveBeenCalledWith('submit-recommendation', {
      body: {
        recommended_person_id: 'person-1',
        recommended_to_friend_id: 'friend-1',
        source_proposal_id: 'source-prop',
      },
    });
  });

  it('sends null when no source proposal', async () => {
    mockInvoke.mockResolvedValue({ data: { status: 'ok' }, error: null });

    await submitFriendRecommendation('person-1', 'friend-1');

    expect(mockInvoke).toHaveBeenCalledWith('submit-recommendation', {
      body: {
        recommended_person_id: 'person-1',
        recommended_to_friend_id: 'friend-1',
        source_proposal_id: null,
      },
    });
  });

  it('throws on error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Rec failed' },
    });

    await expect(submitFriendRecommendation('p', 'f')).rejects.toThrow('Recommendation failed');
  });
});

describe('triggerLifecycleCheck', () => {
  it('calls proposal-lifecycle edge function', async () => {
    mockInvoke.mockResolvedValue({
      data: { status: 'ok', proposals_checked: 10, confirmed: 2, rejected: 1, expired_sent: 0 },
      error: null,
    });

    const result = await triggerLifecycleCheck();
    expect(mockInvoke).toHaveBeenCalledWith('proposal-lifecycle');
    expect(result.proposals_checked).toBe(10);
  });

  it('throws on error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Lifecycle error' } });
    await expect(triggerLifecycleCheck()).rejects.toThrow('Lifecycle check failed');
  });
});

describe('generateProposalForUser', () => {
  it('calls generate-proposal-for-user', async () => {
    mockInvoke.mockResolvedValue({
      data: { status: 'ok', proposal_created: true, compatibility_score: 75, voters_backfilled: 5 },
      error: null,
    });

    const result = await generateProposalForUser();
    expect(mockInvoke).toHaveBeenCalledWith('generate-proposal-for-user');
    expect(result.proposal_created).toBe(true);
  });

  it('throws on error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Gen error' } });
    await expect(generateProposalForUser()).rejects.toThrow('Generate proposal for user failed');
  });
});

describe('assignNewUserProposals', () => {
  it('calls assign-new-user-proposals', async () => {
    mockInvoke.mockResolvedValue({ data: { assigned: 3 }, error: null });

    const result = await assignNewUserProposals();
    expect(mockInvoke).toHaveBeenCalledWith('assign-new-user-proposals');
    expect(result.assigned).toBe(3);
  });

  it('throws on error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Assign error' } });
    await expect(assignNewUserProposals()).rejects.toThrow('Assign new user proposals failed');
  });
});
