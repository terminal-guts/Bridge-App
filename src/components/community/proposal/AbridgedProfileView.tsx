/**
 * AbridgedProfileView Component
 *
 * Quick compatibility voting view focused on:
 * - Physical attraction (photo)
 * - Core values alignment
 * - Lifestyle compatibility
 *
 * Optimized for fast scanning and decision-making.
 */

import React from 'react';
import { View, Image } from 'react-native';
import { styled } from 'nativewind';
import { EvaIcon } from '../../icons';
import { UserProfile, Photo } from '../../../types';
import { Body } from '../../ui';
import { CompatibilityResult } from '../../../utils/compatibilityHelpers';
import { valueEmoji, interestEmoji, getValueIconDef, getInterestIconDef } from '../../../utils/emojiMaps';

const StyledView = styled(View);
const StyledImage = styled(Image);

interface AbridgedProfileViewProps {
  user: UserProfile;
  compatibility?: CompatibilityResult;
}

export function AbridgedProfileView({ user, compatibility }: AbridgedProfileViewProps) {
  // Get primary photo
  const mainPhoto = user.photos?.find((p: Photo) => p.isMain) || user.photos?.[0];

  // Helper to capitalize
  const capitalize = (str: string | undefined): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Get frequency level for visual indicator (0-4 scale)
  const getFrequencyLevel = (value: string | undefined): number => {
    if (!value) return 0;
    const lower = value.toLowerCase();
    if (lower.includes('never') || lower.includes('no')) return 0;
    if (lower.includes('rarely') || lower.includes('sometimes')) return 1;
    if (lower.includes('socially') || lower.includes('occasional')) return 2;
    if (lower.includes('often') || lower.includes('regular')) return 3;
    if (lower.includes('daily') || lower.includes('yes') || lower.includes('frequently')) return 4;
    return 2; // Default to middle
  };

  // Generate compatibility messages
  const getCompatibilityMessages = (): string[] => {
    if (!compatibility) return [];
    const messages: string[] = [];

    // Shared values
    if (compatibility.sharedValues.length > 0) {
      messages.push(`Share values: ${compatibility.sharedValues.slice(0, 2).join(', ')}`);
    }

    // Shared interests
    if (compatibility.sharedInterests.length > 0) {
      messages.push(`Share interests: ${compatibility.sharedInterests.slice(0, 2).join(', ')}`);
    }

    // Matching fields
    if (compatibility.matches.includes('religion')) {
      messages.push('Same religion');
    }
    if (compatibility.matches.includes('politics')) {
      messages.push('Same political views');
    }
    if (compatibility.matches.includes('family_plans')) {
      messages.push('Aligned family plans');
    }

    return messages.slice(0, 3);
  };

  // Generate incompatibility messages
  const getIncompatibilityMessages = (): string[] => {
    if (!compatibility) return [];
    const messages: string[] = [];

    // Conflicts
    if (compatibility.conflicts.includes('religion')) {
      messages.push('Different religions');
    }
    if (compatibility.conflicts.includes('politics')) {
      messages.push('Different political views');
    }
    if (compatibility.conflicts.includes('family_plans')) {
      messages.push('Different family plans');
    }

    return messages.slice(0, 3);
  };

  const compatMessages = getCompatibilityMessages();
  const incompatMessages = getIncompatibilityMessages();

  // Visual frequency dots component
  const FrequencyDots = ({ value }: { value: string | undefined }) => {
    if (!value) return null;
    const level = getFrequencyLevel(value);
    const colors = ['#10B981', '#84CC16', '#F59E0B', '#F97316', '#EF4444']; // Green to red

    return (
      <StyledView className="flex-row">
        {[0, 1, 2, 3, 4].map((i) => (
          <StyledView
            key={i}
            className="w-1.5 h-1.5 rounded-full mx-0.5"
            style={{
              backgroundColor: i <= level ? colors[level] : '#E5E7EB',
            }}
          />
        ))}
      </StyledView>
    );
  };

  // Pill tag component for values/interests
  const Pill = ({ label }: { label: string }) => (
    <StyledView className="bg-neutral-100 rounded-full px-2 py-0.5 mr-1 mb-1">
      <Body className="text-[8px] text-neutral-700 font-medium">{label}</Body>
    </StyledView>
  );

  // Clean field component - label: value format
  const Field = ({ label, value }: { label: string; value: string }) => (
    <StyledView className="mb-0.5">
      <Body className="text-[9px] text-neutral-900 leading-tight" numberOfLines={1}>
        <Body className="text-[9px] text-neutral-600">{label}: </Body>
        <Body className="text-[9px] text-neutral-900 font-medium">{value}</Body>
      </Body>
    </StyledView>
  );

  return (
    <StyledView className="flex-1 py-2 px-2">
      {/* Photo - Compact */}
      <StyledView className="items-center mb-1.5">
        <StyledView
          className="rounded-full"
          style={{ padding: 2, backgroundColor: '#F43F5E' }}
        >
          <StyledImage
            source={{ uri: mainPhoto?.url || 'https://via.placeholder.com/85' }}
            className="rounded-full bg-white"
            style={{ width: 85, height: 85 }}
            resizeMode="cover"
          />
        </StyledView>
      </StyledView>

      {/* Age (Prominent) */}
      <StyledView className="items-center mb-0.5">
        <Body className="text-2xl font-bold text-neutral-900">{user.age}</Body>
      </StyledView>


      {/* Core Info Section */}
      <StyledView className="px-1">
        {/* Physical & Background */}
        {user.height && <Field label="Height" value={user.height} />}
        {user.ethnicity && <Field label="Ethnicity" value={user.ethnicity} />}

        {/* Work & Education */}
        {user.currentJob && (
          <Field
            label="Work"
            value={user.company ? `${user.currentJob} at ${user.company}` : user.currentJob}
          />
        )}
        {user.school && <Field label="School" value={user.school} />}

        {/* Compatibility Factors */}
        {user.religion && <Field label="Religion" value={user.religion} />}
        {user.politicalLeaning && <Field label="Politics" value={capitalize(user.politicalLeaning)} />}
        {user.familyPlans && <Field label="Family Plans" value={user.familyPlans} />}
        {user.hasChildren && <Field label="Has Children" value={user.hasChildren} />}

        {/* Lifestyle - Visual Dots */}
        {(user.drinkingFrequency || user.cannabisFrequency) && (
          <StyledView className="mt-1.5 mb-1.5">
            <Body className="text-[8px] text-neutral-600 mb-1">Lifestyle</Body>

            {user.drinkingFrequency && (
              <StyledView className="flex-row items-center justify-between mb-1">
                <Body className="text-[9px] text-neutral-700">Drinking</Body>
                <StyledView className="flex-row items-center">
                  <FrequencyDots value={user.drinkingFrequency} />
                  <Body className="text-[8px] text-neutral-600 ml-1">{capitalize(user.drinkingFrequency)}</Body>
                </StyledView>
              </StyledView>
            )}

            {user.cannabisFrequency && (
              <StyledView className="flex-row items-center justify-between mb-0.5">
                <Body className="text-[9px] text-neutral-700">Cannabis</Body>
                <StyledView className="flex-row items-center">
                  <FrequencyDots value={user.cannabisFrequency} />
                  <Body className="text-[8px] text-neutral-600 ml-1">{capitalize(user.cannabisFrequency)}</Body>
                </StyledView>
              </StyledView>
            )}
          </StyledView>
        )}

        {/* Values - Pills */}
        {user.values && user.values.length > 0 && (
          <StyledView className="mb-1.5">
            <Body className="text-[8px] text-neutral-600 mb-0.5">Values</Body>
            <StyledView className="flex-row flex-wrap">
              {user.values.slice(0, 4).map((value, index) => (
                <Pill key={index} label={value} iconDef={getValueIconDef(value)} />
              ))}
            </StyledView>
          </StyledView>
        )}

        {/* Interests - Pills */}
        {user.interests && user.interests.length > 0 && (
          <StyledView className="mb-1.5">
            <Body className="text-[8px] text-neutral-600 mb-0.5">Interests</Body>
            <StyledView className="flex-row flex-wrap">
              {user.interests.slice(0, 4).map((interest, index) => (
                <Pill key={index} label={interest} iconDef={getInterestIconDef(interest)} />
              ))}
            </StyledView>
          </StyledView>
        )}

        {/* Compatibility Section - Compact */}
        {compatMessages.length > 0 && (
          <StyledView className="mt-2 pt-1.5 border-t border-green-200 bg-green-50/50 -mx-1 px-1.5 py-1.5 rounded">
            <Body className="text-[8px] text-green-800 font-bold mb-0.5">Compatible</Body>
            {compatMessages.map((message, index) => (
              <StyledView key={index} className="flex-row items-center mb-0.5">
                <EvaIcon name="checkmark-circle-2" size={10} color="#10B981" style={{ marginRight: 4 }} />
                <Body className="text-[9px] text-green-700 font-medium" numberOfLines={1}>
                  {message}
                </Body>
              </StyledView>
            ))}
          </StyledView>
        )}

        {/* Incompatibility Section - Compact */}
        {incompatMessages.length > 0 && (
          <StyledView className="mt-1.5 pt-1.5 border-t border-red-200 bg-red-50/50 -mx-1 px-1.5 py-1.5 rounded">
            <Body className="text-[8px] text-red-800 font-bold mb-0.5">Conflicts</Body>
            {incompatMessages.map((message, index) => (
              <StyledView key={index} className="flex-row items-center mb-0.5">
                <EvaIcon name="alert-circle" size={10} color="#EF4444" variant="outline" style={{ marginRight: 4 }} />
                <Body className="text-[9px] text-red-700 font-medium" numberOfLines={1}>
                  {message}
                </Body>
              </StyledView>
            ))}
          </StyledView>
        )}
      </StyledView>
    </StyledView>
  );
}

export default AbridgedProfileView;
