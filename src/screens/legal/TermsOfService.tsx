import React from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { EvaIcon  } from '../../components/icons';

interface TermsOfServiceProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ navigation }) => {
  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <StyledView className="flex-row items-center px-4 py-3 border-b border-neutral-200">
        <StyledTouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <EvaIcon name="arrow-back" size={24} color="#101828" />
        </StyledTouchableOpacity>
        <H3>Terms of Service</H3>
      </StyledView>

      <StyledScrollView className="flex-1 px-4 py-4">
        <Body className="text-neutral-500 text-sm mb-4">
          Last Updated: March 4, 2026
        </Body>

        <H2 className="mb-3">1. Acceptance of Terms</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          By accessing and using Bridge ("the App"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
        </Body>

        <H2 className="mb-3">2. Use License</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge grants you a revocable, non-exclusive, non-transferable, limited license to download, install and use the App solely for your personal, non-commercial purposes strictly in accordance with the terms of this Agreement.
        </Body>

        <H2 className="mb-3">3. User Accounts</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          You must be at least 18 years old to use Bridge. You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
        </Body>

        <H2 className="mb-3">4. User Content and Conduct</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Users are solely responsible for the content they post on Bridge. You agree not to post content that is illegal, offensive, threatening, defamatory, or violates any third-party rights. Bridge reserves the right to remove any content that violates these terms.
        </Body>

        <H2 className="mb-3">5. Matchmaking Services</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge provides a community-driven matchmaking service. Matches are generated based on community input and our algorithm. Bridge does not guarantee matches or successful relationships. Users participate in the matchmaking process by voting on proposals and participating in community matchmaking at their discretion.
        </Body>

        <H2 className="mb-3">6. Payment Terms</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge is currently free during our beta period. There are no charges, subscriptions, or hidden fees. We will provide advance notice before introducing any paid features.
        </Body>

        <H2 className="mb-3">7. Privacy and Data Protection</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Your use of Bridge is also governed by our Privacy Policy. By using the App, you consent to the collection and use of information as detailed in the Privacy Policy.
        </Body>

        <H2 className="mb-3">8. Enforcement Policy</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge may take enforcement action, including account suspension or permanent removal, for policy violations. Violations include:
          {'\n'}• Providing false information
          {'\n'}• Harassment or inappropriate behavior
          {'\n'}• Sending inappropriate content
          {'\n'}• Violating community guidelines
        </Body>

        <H2 className="mb-3">9. Intellectual Property</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          The App and its original content, features, and functionality are owned by Bridge and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
        </Body>

        <H2 className="mb-3">10. Disclaimer of Warranties</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge is provided "as is" and "as available" without any warranties of any kind, either express or implied. Bridge does not warrant that the service will be uninterrupted, secure, or error-free.
        </Body>

        <H2 className="mb-3">11. Limitation of Liability</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          In no event shall Bridge, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your access to or use of the service.
        </Body>

        <H2 className="mb-3">12. Termination</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
        </Body>

        <H2 className="mb-3">13. Governing Law</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          These Terms shall be governed and construed in accordance with the laws of Texas, United States, without regard to its conflict of law provisions.
        </Body>

        <H2 className="mb-3">14. Changes to Terms</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge reserves the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.
        </Body>

        <H2 className="mb-3">15. Contact Information</H2>
        <Body className="text-neutral-700 mb-8 leading-6">
          If you have any questions about these Terms, please contact us at:
          {'\n\n'}Bridge Support
          {'\n'}Email: bridge.date.app@gmail.com
          {'\n'}Address: Houston, TX
        </Body>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};