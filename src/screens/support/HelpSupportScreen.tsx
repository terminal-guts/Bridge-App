import React from 'react';
import { View, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body, Card, ScreenWrapper, BackHeader } from '../../components/ui';
import { COLORS } from '../../theme/colors';
import { SHADOWS } from '../../theme/shadows';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { EvaIcon } from '../../components/icons';

interface HelpSupportScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

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
            'No Email App Found',
            `No worries — you can reach us directly at ${SUPPORT_EMAIL}`,
            [{ text: 'Got It' }]
          );
        }
      })
      .catch(() => {
        Alert.alert(
          'Couldn\u2019t Open Email',
          `No worries — you can reach us directly at ${SUPPORT_EMAIL}`,
          [{ text: 'Got It' }]
        );
      });
  };

  const FAQItem = ({ question, answer }: { question: string; answer: string }) => (
    <StyledView className="mb-4">
      <StyledView className="flex-row items-start mb-2">
        <StyledView className="w-5 h-5 bg-primary-100 rounded-full items-center justify-center mr-2 mt-0.5">
          <EvaIcon name="question-mark-circle" variant="outline" size={14} color={COLORS.primaryAccent} />
        </StyledView>
        <Body className="flex-1 text-neutral-900 font-semibold text-sm">{question}</Body>
      </StyledView>
      <StyledView className="flex-row items-start ml-7">
        <Body className="flex-1 text-neutral-600 text-sm leading-5">{answer}</Body>
      </StyledView>
    </StyledView>
  );

  return (
    <ScreenWrapper>

      <BackHeader title="Help & Support" />

      <StyledScrollView className="flex-1">
        <StyledView className="px-4 py-4">
          {/* Main Contact Card */}
          <Card className="mb-4 bg-gradient-to-br from-primary-50 to-white border border-primary-200">
            <StyledView className="items-center py-2">
              <StyledView className="w-16 h-16 bg-primary-500 rounded-full items-center justify-center mb-3">
                <EvaIcon name="email" variant="outline" size={28} color="white" />
              </StyledView>
              <H2 className="text-lg mb-2 text-center">We're Here for You</H2>
              <Body className="text-neutral-600 text-center text-sm mb-4 px-4">
                Questions, ideas, or something not working right? Drop us a line — we'd love to hear from you.
              </Body>

              <StyledView className="bg-white rounded-lg px-4 py-3 mb-4 border border-neutral-200">
                <Body className="text-neutral-500 text-xs mb-1 text-center">Reach us at</Body>
                <Body className="text-primary-600 font-semibold text-center">{SUPPORT_EMAIL}</Body>
              </StyledView>

              <StyledTouchableOpacity
                onPress={handleEmailSupport}
                className="bg-primary-500 rounded-lg flex-row items-center justify-center"
                style={[SHADOWS.accentBlue, { minHeight: 48, paddingHorizontal: 24 }]}
                accessibilityRole="button"
                accessibilityLabel="Send us an email"
              >
                <EvaIcon name="paper-plane" variant="outline" size={18} color="white" />
                <Body className="text-white font-semibold ml-2">Send Us an Email</Body>
              </StyledTouchableOpacity>
            </StyledView>
          </Card>

          {/* Quick Help Options */}
          <Card className="mb-4">
            <H3 className="mb-4">What Can We Help With?</H3>
            <StyledView className="space-y-3">
              <StyledView className="flex-row items-start" style={{ minHeight: 44 }}>
                <StyledView className="w-10 h-10 bg-success/10 rounded-lg items-center justify-center mr-3">
                  <EvaIcon name="question-mark-circle" variant="outline" size={20} color={COLORS.emerald} />
                </StyledView>
                <StyledView className="flex-1">
                  <Body className="text-neutral-900 font-medium mb-1">General Questions</Body>
                  <Body className="text-neutral-600 text-sm">
                    Curious how Bridge works? We'll walk you through it.
                  </Body>
                </StyledView>
              </StyledView>

              <StyledView className="flex-row items-start" style={{ minHeight: 44 }}>
                <StyledView className="w-10 h-10 bg-error/10 rounded-lg items-center justify-center mr-3">
                  <EvaIcon name="alert-circle" variant="outline" size={20} color={COLORS.error} />
                </StyledView>
                <StyledView className="flex-1">
                  <Body className="text-neutral-900 font-medium mb-1">Report a Problem</Body>
                  <Body className="text-neutral-600 text-sm">
                    Something not working right? Let us know and we'll look into it.
                  </Body>
                </StyledView>
              </StyledView>

              <StyledTouchableOpacity
                className="flex-row items-start"
                style={{ minHeight: 44 }}
                accessibilityRole="button"
                accessibilityLabel="Report a safety concern"
                onPress={() => {
                  const subject = encodeURIComponent('Bridge Safety Report');
                  const body = encodeURIComponent('I would like to report the following concern:\n\nType of issue: [harassment / fake profile / inappropriate content / other]\n\nDetails:\n\n');
                  const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
                  Linking.openURL(url).catch(() => {
                    Alert.alert('Couldn\u2019t Open Email', `No worries — send your report directly to ${SUPPORT_EMAIL}`);
                  });
                }}
              >
                <StyledView className="w-10 h-10 bg-warning/10 rounded-lg items-center justify-center mr-3">
                  <EvaIcon name="flag" variant="outline" size={20} color={COLORS.warning.icon} />
                </StyledView>
                <StyledView className="flex-1">
                  <Body className="text-neutral-900 font-medium mb-1">Safety & Reporting</Body>
                  <Body className="text-neutral-600 text-sm">
                    Something feel off? Report it — your safety comes first.
                  </Body>
                </StyledView>
                <EvaIcon name="arrow-ios-forward" variant="outline" size={16} color={COLORS.text.placeholder} style={{ marginTop: 4 }} />
              </StyledTouchableOpacity>

              <StyledView className="flex-row items-start" style={{ minHeight: 44 }}>
                <StyledView className="w-10 h-10 bg-primary-100 rounded-lg items-center justify-center mr-3">
                  <EvaIcon name="message-circle" variant="outline" size={20} color={COLORS.primaryAccent} />
                </StyledView>
                <StyledView className="flex-1">
                  <Body className="text-neutral-900 font-medium mb-1">Feedback & Suggestions</Body>
                  <Body className="text-neutral-600 text-sm">
                    Got an idea that would make Bridge better? We're all ears.
                  </Body>
                </StyledView>
              </StyledView>
            </StyledView>
          </Card>

          {/* FAQ Section */}
          <Card className="mb-4">
            <H3 className="mb-4">Common Questions</H3>

            <FAQItem
              question="How does matching on Bridge work?"
              answer="Your friends propose matches for you, and the community votes on them. Once enough people think it's a good fit, you both get the chance to connect. It's matching powered by the people who know you best."
            />

            <FAQItem
              question="Is Bridge free?"
              answer="Yep, completely free! No subscriptions, no hidden fees, no in-app purchases. We're focused on building something great for our community."
            />

            <FAQItem
              question="What are Deep Questions?"
              answer="They're thoughtful prompts that help people get to know the real you — beyond photos and bios. Answering them makes your profile stand out and helps your friends make better matches for you."
            />

            <FAQItem
              question="How long do I have to accept a match?"
              answer="Once a proposal passes the community vote, both people get 48 hours to decide. If you both say yes, you're matched and can start chatting!"
            />

            <FAQItem
              question="Can I update my preferences later?"
              answer="Absolutely! Head to Settings, then Match Preferences. You can change your age range, distance, and other preferences whenever you want."
            />
          </Card>

          {/* Response Time */}
          <Card className="bg-primary-50 border border-primary-100">
            <StyledView className="flex-row items-start">
              <EvaIcon name="clock" variant="outline" size={20} color={COLORS.primaryAccent} />
              <StyledView className="flex-1 ml-3">
                <Body className="text-primary-900 font-semibold text-sm mb-1">
                  We'll Get Back to You
                </Body>
                <Body className="text-primary-700 text-sm">
                  Most messages get a reply within 24 to 48 hours. If it's a safety concern, we'll prioritize it right away.
                </Body>
              </StyledView>
            </StyledView>
          </Card>
        </StyledView>
      </StyledScrollView>
    </ScreenWrapper>
  );
};
