import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { H1, Body } from '../../../components/ui';
import { ProposalReviewView } from '../../../components/community/proposal/ProposalReviewView';
import { OnboardingVotingTutorial } from '../../../components/onboarding/OnboardingVotingTutorial';
import { communityService } from '../../../services/communityServiceIndex';
import { Proposal } from '../../../types/community';
import { createLogger } from '../../../utils/secureLogger';

const logger = createLogger('OnboardingProposalStep');

interface OnboardingProposalStepProps {
  onNext: () => void;
  onBack: () => void;
}

const StyledView = styled(View);
const StyledSafeAreaView = styled(SafeAreaView);

export const OnboardingProposalStep: React.FC<OnboardingProposalStepProps> = ({
  onNext,
  onBack,
}) => {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(true);
  const didSkip = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await communityService.getProposalsToVote();
        logger.info('[OnboardingProposal] getProposalsToVote returned:', result.length, 'proposals');
        if (result.length === 0) {
          // No proposals available — skip this step silently
          logger.info('No proposals available during onboarding, skipping step');
          if (!didSkip.current) {
            didSkip.current = true;
            onNext();
          }
          return;
        }
        // Only show 1 proposal in onboarding — the rest surface in the Community
        // gate so the user has something to engage with on first open.
        setProposals(result.slice(0, 1));
      } catch (error: any) {
        logger.error('[OnboardingProposal] Error loading proposals:', error.message);
        logger.error('Failed to load proposals during onboarding:', error.message);
        // On error, skip gracefully so onboarding isn't blocked
        if (!didSkip.current) {
          didSkip.current = true;
          onNext();
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Loading state
  if (loading || proposals === null) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#437FFF" />
        <Body className="mt-4 text-neutral-500">Searching the community...</Body>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View style={{ height: 8 }} />
      <ProposalReviewView
        initialProposals={proposals}
        showBackButton={false}
        isGateVoting={false}
        onVoteComplete={onNext}
      />
      <OnboardingVotingTutorial
        visible={showTutorial}
        onDismiss={() => setShowTutorial(false)}
      />
    </StyledSafeAreaView>
  );
};
