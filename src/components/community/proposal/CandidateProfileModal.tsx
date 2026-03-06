/**
 * CandidateProfileModal Component
 *
 * Full-screen modal showing candidate profile (simplified view - no name, no deep questions).
 */

import React from 'react';
import { UserProfile } from '../../../types';
import { Button } from '../../ui';
import { ProfileView } from '../../profile/ProfileView';

interface CandidateProfileModalProps {
  visible: boolean;
  candidate: UserProfile | null;
  anchor: UserProfile;
  onClose: () => void;
  onPropose: (candidateId: string) => void;
  submitting?: boolean;
  disabled?: boolean;
}

export function CandidateProfileModal({
  visible,
  candidate,
  anchor,
  onClose,
  onPropose,
  submitting = false,
  disabled = false,
}: CandidateProfileModalProps) {
  if (!candidate) return null;

  return (
    <ProfileView
      visible={visible}
      profile={candidate}
      onClose={onClose}
      showName={false}
      showDeepQuestions={false}
      showCompatibility={false}
      actionButton={
        <Button
          onPress={() => onPropose(candidate.id)}
          variant="primary"
          size="lg"
          fullWidth
          disabled={submitting || disabled}
        >
          {submitting ? 'Proposing...' : 'Propose Match'}
        </Button>
      }
    />
  );
}

export default CandidateProfileModal;
