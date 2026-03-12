import React from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { EvaIcon } from '../../components/icons';

interface PrivacyPolicyProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ navigation }) => {
  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="flex-row items-center px-4 py-3 border-b border-neutral-200">
        <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <EvaIcon name="arrow-back" size={24} color="#101828" />
        </StyledTouchableOpacity>
        <H3>Privacy Policy</H3>
      </StyledView>

      <StyledScrollView className="flex-1 px-4 py-4">
        <Body className="text-neutral-500 text-sm mb-4">
          Last Updated: March 4, 2026
        </Body>

        <H2 className="mb-3">1. Information We Collect</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge collects information you provide directly to us, including:
          {'\n'}• Profile information (name, age, photos, occupation)
          {'\n'}• Preferences and interests
          {'\n'}• Deep question responses
          {'\n'}• Proposal voting activity and community participation
          {'\n'}• Messages between matched users
          {'\n'}• Location data (with your permission)
          {'\n'}• Device information and usage data
        </Body>

        <H2 className="mb-3">2. How We Use Your Information</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          We use the information we collect to:
          {'\n'}• Provide and improve our matchmaking services
          {'\n'}• Generate compatible matches using our algorithm
          {'\n'}• Facilitate community-driven matchmaking through proposal voting
          {'\n'}• Improve proposal generation and matching quality
          {'\n'}• Communicate with you about your account and matches
          {'\n'}• Ensure safety and prevent fraud
          {'\n'}• Comply with legal obligations
        </Body>

        <H2 className="mb-3">3. Information Sharing</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          We share your information in the following circumstances:
          {'\n'}• With other users as part of the matchmaking process
          {'\n'}• With matched users (full profile after mutual acceptance)
          {'\n'}• With service providers who assist our operations
          {'\n'}• When required by law or to protect rights
          {'\n'}• With your consent
          {'\n\n'}We never sell your personal information to third parties.
        </Body>

        <H2 className="mb-3">4. Community Matchmaking</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge's unique community-driven approach means:
          {'\n'}• Your profile may appear as a proposal for other users to vote on
          {'\n'}• Other users help determine your compatibility matches
          {'\n'}• Your votes on proposals contribute to matching others
          {'\n'}• Partial profiles are shown during the match reveal process
        </Body>

        <H2 className="mb-3">5. Data Security</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
        </Body>

        <H2 className="mb-3">6. Your Rights and Choices</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          You have the right to:
          {'\n'}• Access and update your profile information
          {'\n'}• Delete your account and associated data
          {'\n'}• Opt-out of certain communications
          {'\n'}• Control location sharing permissions
          {'\n'}• Report inappropriate content or behavior
          {'\n'}• Request a copy of your data
        </Body>

        <H2 className="mb-3">7. Data Retention</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          We retain your information for as long as your account is active or as needed to provide services. If you delete your account, we will delete your personal information within 90 days, except where retention is necessary for legal compliance or legitimate business purposes.
        </Body>

        <H2 className="mb-3">8. Children's Privacy</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge is not intended for users under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information.
        </Body>

        <H2 className="mb-3">9. International Data Transfers</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws different from your country. We take appropriate safeguards to ensure your information remains protected.
        </Body>

        <H2 className="mb-3">10. Analytics and Tracking</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge is a mobile app and does not use browser cookies. We may use mobile analytics tools to:
          {'\n'}• Understand how features are used
          {'\n'}• Improve app performance and stability
          {'\n'}• Diagnose crashes and technical issues
          {'\n\n'}You can limit analytics data collection through your device's privacy settings (iOS: Settings → Privacy → Tracking).
        </Body>

        <H2 className="mb-3">11. Third-Party Services</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any information.
        </Body>

        <H2 className="mb-3">12. California Privacy Rights</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know, delete, and opt-out of the sale of personal information. Bridge does not sell personal information.
        </Body>

        <H2 className="mb-3">13. Updates to Privacy Policy</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of Bridge after changes constitutes acceptance of the updated policy.
        </Body>

        <H2 className="mb-3">14. Contact Us</H2>
        <Body className="text-neutral-700 mb-8 leading-6">
          If you have questions about this Privacy Policy or our data practices, please contact us at:
          {'\n\n'}Bridge Privacy Team
          {'\n'}Email: bridge.date.app@gmail.com
          {'\n'}Address: Houston, TX
          {'\n\n'}For data protection inquiries or to exercise your rights, email: bridge.date.app@gmail.com
        </Body>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};