import React, { useEffect, useState, useRef } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { H1, Body, ProposalReviewSkeleton } from '../../../components/ui';
import { EvaIcon } from '../../../components/icons';
import { COLORS } from '../../../theme/colors';
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
const StyledTouchableOpacity = styled(TouchableOpacity);

export const OnboardingProposalStep: React.FC<OnboardingProposalStepProps> = ({
  onNext,
  onBack,
}) => {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [noProposals, setNoProposals] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await communityService.getProposalsToVote();
        logger.info('[OnboardingProposal] getProposalsToVote returned:', result.length, 'proposals');
        if (result.length === 0) {
          // No proposals available — show explainer instead of silent skip
          logger.info('No proposals available during onboarding, showing explainer');
          setNoProposals(true);
          return;
        }
        setProposals(result.slice(0, 1));
      } catch (error: any) {
        logger.error('[OnboardingProposal] Error loading proposals:', error.message);
        // On error, show explainer so onboarding isn't blocked
        setNoProposals(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Loading state
  if (loading && !noProposals) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBackground }}>
        <ProposalReviewSkeleton />
      </SafeAreaView>
    );
  }

  // No proposals available — show an explainer about how Bridge works
  if (noProposals || proposals === null) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <StyledView className="flex-1 px-6 justify-center items-center">
          <StyledView className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-6">
            <EvaIcon name="people" variant="outline" size={32} color={COLORS.primaryAccent} />
          </StyledView>
          <H1 className="text-center mb-3">Here's how Bridge works</H1>
          <Body className="text-neutral-600 text-center mb-2" style={{ lineHeight: 22 }}>
            Your friends vote on potential matches for you — and you do the same for them.
          </Body>
          <Body className="text-neutral-500 text-center text-sm mb-8" style={{ lineHeight: 20 }}>
            Once you're set up, you'll see proposals to vote on every day. For now, let's finish building your profile.
          </Body>
          <StyledTouchableOpacity
            onPress={onNext}
            className="bg-primary-500 rounded-xl px-8 py-4 w-full"
          >
            <Body className="text-white font-semibold text-center">Continue</Body>
          </StyledTouchableOpacity>
        </StyledView>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View style={{ height: 32 }} />
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
