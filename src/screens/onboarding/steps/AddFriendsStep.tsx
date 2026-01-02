import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { H1, H2, Body } from '../../../components/ui';
import { OnboardingData } from '../../../types';
import { OnboardingLayout } from '../../../components/OnboardingLayout';
import { Ionicons } from '@expo/vector-icons';

interface AddFriendsStepProps {
  data: Partial<OnboardingData>;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledScrollView = styled(ScrollView);

// Mock contacts for demonstration
const MOCK_CONTACTS = [
  { id: '1', name: 'Alex Johnson', phoneNumber: '+1 (555) 123-4567', onBridge: true },
  { id: '2', name: 'Sarah Chen', phoneNumber: '+1 (555) 234-5678', onBridge: true },
  { id: '3', name: 'Mike Williams', phoneNumber: '+1 (555) 345-6789', onBridge: false },
  { id: '4', name: 'Emily Davis', phoneNumber: '+1 (555) 456-7890', onBridge: true },
  { id: '5', name: 'Chris Martinez', phoneNumber: '+1 (555) 567-8901', onBridge: false },
];

export const AddFriendsStep: React.FC<AddFriendsStepProps> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const toggleContact = (contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleContinue = () => {
    updateData({
      friendsAdded: selectedContacts,
    });
    onNext();
  };

  const handleSkip = () => {
    updateData({
      friendsAdded: [],
    });
    onNext();
  };

  const contactsOnBridge = MOCK_CONTACTS.filter(c => c.onBridge);
  const contactsNotOnBridge = MOCK_CONTACTS.filter(c => !c.onBridge);

  return (
    <OnboardingLayout
      onContinue={handleContinue}
      showBackButton={true}
      hasTextInput={false}
    >
      <H1 className="mb-3">Add friends</H1>
      <Body className="text-neutral-600 mb-6">
        Connect with friends already on Bridge or invite new ones
      </Body>

      <StyledScrollView className="flex-1 mb-4" showsVerticalScrollIndicator={false}>
        {/* Friends on Bridge */}
        {contactsOnBridge.length > 0 && (
          <StyledView className="mb-6">
            <H2 className="text-lg font-semibold mb-3">On Bridge</H2>
            {contactsOnBridge.map(contact => (
              <StyledTouchableOpacity
                key={contact.id}
                onPress={() => toggleContact(contact.id)}
                className="flex-row items-center justify-between bg-white p-4 rounded-lg mb-2 border border-neutral-200"
              >
                <StyledView className="flex-row items-center flex-1">
                  <StyledView className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
                    <Body className="text-primary-600 font-semibold">
                      {contact.name.charAt(0)}
                    </Body>
                  </StyledView>
                  <StyledView className="flex-1">
                    <Body className="font-semibold">{contact.name}</Body>
                    <Body className="text-neutral-500 text-sm">{contact.phoneNumber}</Body>
                  </StyledView>
                </StyledView>
                <StyledView
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    selectedContacts.includes(contact.id)
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-neutral-300'
                  }`}
                >
                  {selectedContacts.includes(contact.id) && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </StyledView>
              </StyledTouchableOpacity>
            ))}
          </StyledView>
        )}

        {/* Friends not on Bridge */}
        {contactsNotOnBridge.length > 0 && (
          <StyledView className="mb-6">
            <H2 className="text-lg font-semibold mb-3">Invite to Bridge</H2>
            {contactsNotOnBridge.map(contact => (
              <StyledTouchableOpacity
                key={contact.id}
                className="flex-row items-center justify-between bg-white p-4 rounded-lg mb-2 border border-neutral-200"
              >
                <StyledView className="flex-row items-center flex-1">
                  <StyledView className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center mr-3">
                    <Body className="text-neutral-600 font-semibold">
                      {contact.name.charAt(0)}
                    </Body>
                  </StyledView>
                  <StyledView className="flex-1">
                    <Body className="font-semibold">{contact.name}</Body>
                    <Body className="text-neutral-500 text-sm">{contact.phoneNumber}</Body>
                  </StyledView>
                </StyledView>
                <StyledTouchableOpacity className="bg-primary-500 px-4 py-2 rounded-lg">
                  <Body className="text-white font-semibold">Invite</Body>
                </StyledTouchableOpacity>
              </StyledTouchableOpacity>
            ))}
          </StyledView>
        )}
      </StyledScrollView>

      {/* Skip button */}
      <StyledTouchableOpacity
        onPress={handleSkip}
        className="items-center py-3"
      >
        <Body className="text-neutral-600">Skip for now</Body>
      </StyledTouchableOpacity>
    </OnboardingLayout>
  );
};
