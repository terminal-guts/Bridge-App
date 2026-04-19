import { View, StatusBar, ScrollView, Linking, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { H2, H3, Body, BodySmall, BackHeader } from '../../components/ui';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { TEXT_STYLES, FONTS } from '../../constants/typography';

interface PrivacyPolicyProps {
  navigation: NavigationProp<RootStackParamList>;
}

const StyledSafeAreaView = styled(SafeAreaView);
const StyledView = styled(View);
const StyledScrollView = styled(ScrollView);

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ navigation }) => {
  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      <BackHeader title="Privacy Policy" />

      <StyledScrollView className="flex-1 px-4 py-4">
        <BodySmall className="text-neutral-500 mb-4">
          Last Updated: March 16, 2026
        </BodySmall>

        <Body className="text-neutral-700 mb-6" style={TEXT_STYLES.bodyLg}>
          Bridge is built on trust. Here's exactly what we collect, why we collect it, and how we protect it. No fine print.
        </Body>

        <H3 className="mb-3">1. What We Collect</H3>
        <Body className="text-neutral-700 mb-6" style={TEXT_STYLES.bodySm}>
          When you use Bridge, we collect:
          {'\n'}• Profile information: name, age, gender, photos, job, and city
          {'\n'}• Match preferences (age range, gender, lifestyle, etc.)
          {'\n'}• Your responses to deep questions
          {'\n'}• Your votes on proposals and community participation
          {'\n'}• Messages with your matches
          {'\n'}• Karma score and activity history
          {'\n'}• Device info and basic usage data (for bug fixes and improvements)
          {'\n\n'}We don't collect payment information — Bridge is free.
        </Body>

        <H3 className="mb-3">2. How We Use It</H3>
        <Body className="text-neutral-700 mb-6" style={TEXT_STYLES.bodySm}>
          We use your information to:
          {'\n'}• Generate match proposals using our algorithm
          {'\n'}• Show your profile to other users for community voting
          {'\n'}• Run the karma and leaderboard systems
          {'\n'}• Send you notifications about matches, votes, and activity
          {'\n'}• Fix bugs and improve the app
          {'\n'}• Keep the community safe
        </Body>

        <H3 className="mb-3">3. How Community Matchmaking Works</H3>
        <Body className="text-neutral-700 mb-6" style={TEXT_STYLES.bodySm}>
          Bridge's community-driven model means your profile is shown to other users — including people you don't know — as part of the voting process. Specifically:
          {'\n'}• Your first name, age, photos, and select profile details appear in voting proposals
          {'\n'}• Other users vote yes or no on potential matches
          {'\n'}• Votes are anonymous — neither you nor your potential match ever sees who voted
          {'\n'}• Your full profile is only revealed to someone after you both accept a match
          {'\n\n'}By using Bridge, you consent to your profile appearing in proposals.
        </Body>

        <H3 className="mb-3">4. Information Sharing</H3>
        <Body className="text-neutral-700 mb-6" style={TEXT_STYLES.bodySm}>
          We share your information only in these cases:
          {'\n'}• With matched users (full profile, after both accept)
          {'\n'}• With service providers who help us run the app (cloud hosting, analytics)
          {'\n'}• When required by law or to protect the safety of our users
          {'\n'}• With your explicit consent
          {'\n\n'}We never sell your data. Ever.
        </Body>

        <H3 className="mb-3">5. Data Security</H3>
        <Body className="text-neutral-700 mb-6" style={TEXT_STYLES.bodySm}>
          Your data is stored securely using Supabase, with encryption in transit and at rest. We take security seriously, but no system is 100% foolproof. Use a strong, unique password and keep your device secure.
        </Body>

        <H3 className="mb-3">6. Your Rights</H3>
        <Body className="text-neutral-700 mb-6" style={TEXT_STYLES.bodySm}>
          You can, at any time:
          {'\n'}• Update your profile information in the app
          {'\n'}• Delete your account (Settings → Delete Account) — your data is removed within 90 days
          {'\n'}• Turn off notifications in Settings
          {'\n'}• Control location permissions through your device settings
          {'\n'}• Request a copy of your data by emailing us
        </Body>

        <H3 className="mb-3">7. Data Retention</H3>
        <Body className="text-neutral-700 mb-6" style={TEXT_STYLES.bodySm}>
          We keep your data as long as your account is active. When you delete your account, your personal data is removed within 90 days. Some anonymized aggregate data (like vote counts) may be retained for analytics after deletion.
        </Body>

        <H3 className="mb-3">8. Children's Privacy</H3>
        <Body className="text-neutral-700 mb-6" style={TEXT_STYLES.bodySm}>
          Bridge is for users 18 and older. We don't knowingly collect data from anyone under 18. If we discover we have, we'll delete it immediately.
        </Body>

        <H3 className="mb-3">9. Analytics</H3>
        <Body className="text-neutral-700 mb-6" style={TEXT_STYLES.bodySm}>
          We use mobile analytics tools to understand how people use Bridge and to catch bugs. We don't track you across other apps. You can limit analytics through iOS Settings → Privacy → Tracking.
        </Body>

        <H3 className="mb-3">10. California Privacy Rights</H3>
        <Body className="text-neutral-700 mb-6" style={TEXT_STYLES.bodySm}>
          If you're a California resident, you have rights under the CCPA, including the right to know what data we hold, request deletion, and opt out of data sales. Bridge does not sell personal data.
        </Body>

        <H3 className="mb-3">11. Changes to This Policy</H3>
        <Body className="text-neutral-700 mb-6" style={TEXT_STYLES.bodySm}>
          If we update this policy in a meaningful way, we'll let you know in the app. The "Last Updated" date at the top always reflects the current version.
        </Body>

        <H3 className="mb-3">12. Contact</H3>
        <Body className="text-neutral-700 mb-8" style={TEXT_STYLES.bodySm}>
          Questions about your privacy or your data? We're here.
          {'\n\n'}Bridge Privacy Team
          {'\n'}Email:{' '}
          <Text
            style={{ fontFamily: FONTS.medium, color: '#437FFF' }}
            onPress={() => Linking.openURL('mailto:bridge.date.app@gmail.com')}
          >
            bridge.date.app@gmail.com
          </Text>
          {'\n'}Houston, TX
        </Body>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};
