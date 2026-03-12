import React from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body, Card } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { EvaIcon  } from '../../components/icons';

interface HelpSupportScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

const SUPPORT_EMAIL = 'bridge.date.app@gmail.com';

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ navigation }) => {
  const handleEmailSupport = () => {
    const subject = encodeURIComponent('Bridge App Support Request');
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;

    Linking.canOpenURL(mailtoUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(mailtoUrl);
        } else {
          Alert.alert(
            'Email Not Available',
            `Please email us at ${SUPPORT_EMAIL}`,
            [{ text: 'OK' }]
          );
        }
      })
      .catch(() => {
        Alert.alert(
          'Error',
          `Please email us at ${SUPPORT_EMAIL}`,
          [{ text: 'OK' }]
        );
      });
  };

  const FAQItem = ({ question, answer }: { question: string; answer: string }) => (
    <StyledView className="mb-4">
      <StyledView className="flex-row items-start mb-2">
        <StyledView className="w-5 h-5 bg-primary-100 rounded-full items-center justify-center mr-2 mt-0.5">
          <EvaIcon name="question-mark-circle-outline" size={14} color="#437FFF" />
        </StyledView>
        <Body className="flex-1 text-neutral-900 font-semibold text-sm">{question}</Body>
      </StyledView>
      <StyledView className="flex-row items-start ml-7">
        <Body className="flex-1 text-neutral-600 text-sm leading-5">{answer}</Body>
      </StyledView>
    </StyledView>
  );

  return (
    <StyledSafeAreaView className="flex-1 bg-neutral-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="bg-white border-b border-neutral-200 px-4 py-3 flex-row items-center">
        <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <EvaIcon name="arrow-back" size={24} color="#101828" />
        </StyledTouchableOpacity>
        <H3>Help & Support</H3>
      </StyledView>

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-4">
          {/* Main Contact Card */}
          <Card className="mb-4 bg-gradient-to-br from-primary-50 to-white border border-primary-200">
            <StyledView className="items-center py-2">
              <StyledView className="w-16 h-16 bg-primary-500 rounded-full items-center justify-center mb-3">
                <EvaIcon name="mail" size={28} color="white" />
              </StyledView>
              <H2 className="text-lg mb-2 text-center">We're Here to Help</H2>
              <Body className="text-neutral-600 text-center text-sm mb-4 px-4">
                Have questions, feedback, or need assistance? Our team is ready to support you.
              </Body>

              <StyledView className="bg-white rounded-lg px-4 py-3 mb-4 border border-neutral-200">
                <Body className="text-neutral-500 text-xs mb-1 text-center">Email us at</Body>
                <Body className="text-primary-600 font-semibold text-center">{SUPPORT_EMAIL}</Body>
              </StyledView>

              <StyledTouchableOpacity
                onPress={handleEmailSupport}
                className="bg-primary-500 px-6 py-3 rounded-lg flex-row items-center"
                style={{
                  shadowColor: '#437FFF',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <EvaIcon name="send" size={18} color="white" />
                <Body className="text-white font-semibold ml-2">Send Email</Body>
              </StyledTouchableOpacity>
            </StyledView>
          </Card>

          {/* Quick Help Options */}
          <Card className="mb-4">
            <H3 className="mb-4">What Can We Help With?</H3>
            <StyledView className="space-y-3">
              <StyledView className="flex-row items-start">
                <StyledView className="w-10 h-10 bg-success/10 rounded-lg items-center justify-center mr-3">
                  <EvaIcon name="question-mark-circle" size={20} color="#12B981" />
                </StyledView>
                <StyledView className="flex-1">
                  <Body className="text-neutral-900 font-medium mb-1">General Questions</Body>
                  <Body className="text-neutral-600 text-sm">
                    Learn how Bridge works, matching process, and features
                  </Body>
                </StyledView>
              </StyledView>

              <StyledView className="flex-row items-start">
                <StyledView className="w-10 h-10 bg-error/10 rounded-lg items-center justify-center mr-3">
                  <EvaIcon name="alert-triangle" size={20} color="#EF4444" />
                </StyledView>
                <StyledView className="flex-1">
                  <Body className="text-neutral-900 font-medium mb-1">Report a Problem</Body>
                  <Body className="text-neutral-600 text-sm">
                    Experiencing technical issues or unexpected behavior
                  </Body>
                </StyledView>
              </StyledView>

              <StyledTouchableOpacity
                className="flex-row items-start"
                onPress={() => {
                  const subject = encodeURIComponent('Bridge Safety Report');
                  const body = encodeURIComponent('I would like to report the following safety concern:\n\nType of issue: [harassment / fake profile / inappropriate content / other]\n\nDetails:\n\n');
                  const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
                  Linking.openURL(url).catch(() => {
                    Alert.alert('Email Not Available', `Please email your report to ${SUPPORT_EMAIL}`);
                  });
                }}
              >
                <StyledView className="w-10 h-10 bg-warning/10 rounded-lg items-center justify-center mr-3">
                  <EvaIcon name="flag" size={20} color="#F59E0B" />
                </StyledView>
                <StyledView className="flex-1">
                  <Body className="text-neutral-900 font-medium mb-1">Safety & Reporting</Body>
                  <Body className="text-neutral-600 text-sm">
                    Report inappropriate behavior or content
                  </Body>
                </StyledView>
                <EvaIcon name="chevron-right" size={16} color="#98A2B3" style={{ marginTop: 4 }} />
              </StyledTouchableOpacity>

              <StyledView className="flex-row items-start">
                <StyledView className="w-10 h-10 bg-primary-100 rounded-lg items-center justify-center mr-3">
                  <EvaIcon name="message-circle" size={20} color="#437FFF" />
                </StyledView>
                <StyledView className="flex-1">
                  <Body className="text-neutral-900 font-medium mb-1">Feedback & Suggestions</Body>
                  <Body className="text-neutral-600 text-sm">
                    Share your ideas to help us improve Bridge
                  </Body>
                </StyledView>
              </StyledView>
            </StyledView>
          </Card>

          {/* FAQ Section */}
          <Card className="mb-4">
            <H3 className="mb-4">Frequently Asked Questions</H3>

            <FAQItem
              question="How does Bridge matchmaking work?"
              answer="Each day, you vote on proposals for other users. Vote on 3 community proposals to unlock the Friends Area, where you can vote on your friends' specific proposals."
            />

            <FAQItem
              question="When do I get charged?"
              answer="Bridge is completely free! There are no charges, subscriptions, or hidden fees during our beta period."
            />

            <FAQItem
              question="What are Deep Questions?"
              answer="Deep Questions help potential matches understand you on a meaningful level. Answering them makes your profile more engaging and contributes to your profile completion score."
            />

            <FAQItem
              question="How long do I have to accept a match?"
              answer="When a proposal passes community voting, both users get 48 hours to decide. If both accept, you're matched and can start chatting!"
            />

            <FAQItem
              question="Can I change my preferences?"
              answer="Yes! Go to Settings → Match Preferences to adjust your age range, distance, gender preference, and relationship goals at any time."
            />
          </Card>

          {/* Response Time */}
          <Card className="bg-primary-50 border border-primary-100">
            <StyledView className="flex-row items-start">
              <EvaIcon name="clock" size={20} color="#437FFF" />
              <StyledView className="flex-1 ml-3">
                <Body className="text-primary-900 font-semibold text-sm mb-1">
                  Response Time
                </Body>
                <Body className="text-primary-700 text-sm">
                  We typically respond within 24-48 hours. For urgent safety concerns, we prioritize those reports.
                </Body>
              </StyledView>
            </StyledView>
          </Card>
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};
