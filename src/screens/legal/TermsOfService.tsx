import React from 'react';
import { View, SafeAreaView, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { H2, H3, Body } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { EvaIcon } from '../../components/icons';

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
          <EvaIcon name="arrow-back" variant="outline" size={24} color="#101828" />
        </StyledTouchableOpacity>
        <H3>Terms of Service</H3>
      </StyledView>

      <StyledScrollView className="flex-1 px-4 py-4">
        <Body className="text-neutral-500 text-sm mb-4">
          Last Updated: March 16, 2026
        </Body>

        <Body className="text-neutral-700 mb-6 leading-6">
          Welcome to Bridge. Bridge is a community-driven matchmaking app where your friends and community help you find your person. By creating an account or using the app, you agree to these terms. If you have questions, email us at bridge.date.app@gmail.com.
        </Body>

        <H2 className="mb-3">1. Who Can Use Bridge</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          You must be 18 or older to use Bridge. By creating an account, you confirm you meet this requirement. Bridge is currently in beta, available to students at Rice University.
        </Body>

        <H2 className="mb-3">2. Your Account</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          You're responsible for keeping your account secure. Don't share your login or let others use your account. You're responsible for everything that happens under it.
        </Body>

        <H2 className="mb-3">3. How Bridge Works</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge is a community matchmaking platform. Here's what happens:
          {'\n'}• Our algorithm proposes potential matches between users
          {'\n'}• The community — your friends and other Bridge users — votes on proposals
          {'\n'}• Proposals with enough support advance to the two people being matched
          {'\n'}• If both accept, a match is made and a chat opens
          {'\n\n'}We don't guarantee matches or relationships — we just try to make great introductions.
        </Body>

        <H2 className="mb-3">4. How to Behave</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge only works if everyone shows up honestly and respectfully. You agree to:
          {'\n'}• Use your real name, age, and photos
          {'\n'}• Treat other users with respect in messages and interactions
          {'\n'}• Not harass, threaten, or intimidate anyone
          {'\n'}• Not create fake or duplicate accounts
          {'\n'}• Not scrape, copy, or misuse other users' data
          {'\n'}• Not try to game or manipulate the voting system
        </Body>

        <H2 className="mb-3">5. Your Content</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Photos and information you share on Bridge may be shown to other users as part of the matchmaking process — including people voting on proposals. By using Bridge, you consent to this. You own your content; we just have a license to use it to run the service.
        </Body>

        <H2 className="mb-3">6. Karma System</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge uses a karma score to reflect your participation in community matchmaking. You earn karma by voting on proposals, making accurate calls, and helping friends find their matches. Karma scores are visible to others in the community and affect how the app works for you.
        </Body>

        <H2 className="mb-3">7. Free During Beta</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge is completely free right now. No subscriptions, no hidden fees. If we ever introduce paid features, we'll give you at least 30 days' notice.
        </Body>

        <H2 className="mb-3">8. Privacy and Data</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Your use of Bridge is also governed by our Privacy Policy. By using the app, you consent to the collection and use of your information as described there.
        </Body>

        <H2 className="mb-3">9. Enforcement</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          We may suspend or remove accounts that violate these terms. This includes:
          {'\n'}• Fake profiles or false information
          {'\n'}• Harassment or abusive behavior toward other users
          {'\n'}• Sending inappropriate photos or messages
          {'\n'}• Attempting to manipulate the voting or matching system
          {'\n'}• Any behavior that undermines the community's trust
        </Body>

        <H2 className="mb-3">10. Intellectual Property</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge, its name, logo, and software are owned by Bridge. Don't copy, reverse-engineer, or redistribute any part of the app.
        </Body>

        <H2 className="mb-3">11. No Warranties</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          Bridge is provided as-is. We work hard to keep things running smoothly, but we can't guarantee the service will always be uninterrupted or error-free.
        </Body>

        <H2 className="mb-3">12. Limitation of Liability</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          To the extent permitted by law, Bridge and its team are not liable for indirect, incidental, or consequential damages arising from your use of the app.
        </Body>

        <H2 className="mb-3">13. Termination</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          You can delete your account at any time in the app. We can suspend or terminate accounts for violations of these terms, with or without notice.
        </Body>

        <H2 className="mb-3">14. Governing Law</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          These terms are governed by the laws of Texas, United States.
        </Body>

        <H2 className="mb-3">15. Changes to These Terms</H2>
        <Body className="text-neutral-700 mb-6 leading-6">
          If we make significant changes, we'll notify you in the app at least 30 days before they take effect.
        </Body>

        <H2 className="mb-3">16. Contact</H2>
        <Body className="text-neutral-700 mb-8 leading-6">
          Questions? We're here.
          {'\n\n'}Bridge Support
          {'\n'}Email: bridge.date.app@gmail.com
          {'\n'}Houston, TX
        </Body>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};
