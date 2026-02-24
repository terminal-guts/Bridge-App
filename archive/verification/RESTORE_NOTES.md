# Verification Feature — Archive

Archived on removal. Re-integrate when ready to ship the verification badge feature.

---

## Files archived here
- `ProfileVerificationScreen.tsx` — the full verification screen (email + selfie steps)

---

## Snippets removed from other files

### src/screens/profile/SettingsScreen.tsx
**Location:** Inside the "Account" Card, after the "Match Preferences" SettingRow

```jsx
<SettingRow
  icon="shield-checkmark-outline"
  title="Verification"
  subtitle="Verify your profile"
  onPress={() => navigation.navigate('ProfileVerification')}
/>
```

---

### src/screens/main/ProfileScreen.tsx

**1. State (line ~198):**
```ts
const [showVerificationModal, setShowVerificationModal] = useState(false);
```

**2. Animation ref (line ~236):**
```ts
const verificationModalAnim = useRef(new Animated.Value(0)).current;
```

**3. useEffect for animation (lines ~585–594):**
```ts
useEffect(() => {
  const animation = Animated.spring(verificationModalAnim, {
    toValue: showVerificationModal ? 1 : 0,
    useNativeDriver: true,
    tension: 65,
    friction: 11,
  });
  animation.start();
  return () => animation.stop();
}, [showVerificationModal, verificationModalAnim]);
```

**4. Verification encouragement card in renderAboutTab (lines ~652–700):**
```jsx
{/* Verification Encouragement Card - Show if not verified */}
{!profile?.isVerified && (
  <StyledTouchableOpacity
    onPress={() => {
      lightHaptic();
      navigation.navigate('ProfileVerification');
    }}
    className="mb-4"
    activeOpacity={0.7}
  >
    <Card
      elevation={2}
      variant="default"
      className="bg-gradient-to-r from-blue-50 to-primary-50 border border-primary-200/60"
      style={{
        shadowColor: '#2952CC',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <StyledView className="flex-row items-center">
        <StyledView
          className="w-14 h-14 bg-primary-500 rounded-xl items-center justify-center mr-3"
          style={{
            shadowColor: '#1E40AF',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <Ionicons name="shield-checkmark" size={28} color="white" />
        </StyledView>
        <StyledView className="flex-1">
          <Body className="text-neutral-900 font-bold text-base mb-1">
            Get Verified
          </Body>
          <Body className="text-neutral-600 text-sm leading-5">
            Stand out with a verified badge.{'\n'}
            <Body className="font-bold text-neutral-900">3x</Body> more engagement!
          </Body>
        </StyledView>
        <Ionicons name="chevron-forward" size={20} color="#437FFF" />
      </StyledView>
    </Card>
  </StyledTouchableOpacity>
)}
```

**5. Verification badge button next to name in header (lines ~1352–1372):**
Replace the simplified `<H2 className="text-xl">{profile.firstName}</H2>` back with:
```jsx
{/* Name with Verification Badge */}
<StyledView className="flex-row items-center mb-4">
  <H2 className="text-xl">{profile.firstName}</H2>
  <StyledTouchableOpacity
    onPress={() => {
      lightHaptic();
      if (profile.isVerified) {
        setShowVerificationModal(true);
      } else {
        navigation.navigate('ProfileVerification');
      }
    }}
    className="ml-2"
    accessibilityLabel={profile.isVerified ? "Verified profile" : "Get verified"}
    accessibilityRole="button"
  >
    {profile.isVerified ? (
      <Ionicons name="checkmark-circle" size={22} color="#437FFF" />
    ) : (
      <Ionicons name="checkmark-circle-outline" size={22} color="#D0D5DD" />
    )}
  </StyledTouchableOpacity>
</StyledView>
```

**6. Verification Modal (lines ~1494–1634) — insert before the Profile Visibility Settings Modal:**
```jsx
<Modal
  visible={showVerificationModal}
  animationType="none"
  transparent
  onRequestClose={() => setShowVerificationModal(false)}
>
  <StyledAnimatedView
    className="flex-1 bg-black/50 justify-end"
    style={{ opacity: verificationModalAnim }}
  >
    <StyledAnimatedView
      className="bg-white rounded-t-3xl px-4 py-6"
      style={{
        transform: [{
          translateY: verificationModalAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [300, 0],
          }),
        }],
      }}
    >
      <StyledView className="flex-row items-center justify-between mb-4">
        <StyledView className="flex-row items-center">
          <Ionicons
            name="checkmark-circle"
            size={28}
            color={profile?.isVerified ? "#437FFF" : "#98A2B3"}
          />
          <H3 className="ml-3">
            {profile?.isVerified ? 'Verified Profile' : 'Get Verified'}
          </H3>
        </StyledView>
        <StyledTouchableOpacity
          onPress={() => setShowVerificationModal(false)}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color="#101828" />
        </StyledTouchableOpacity>
      </StyledView>

      {profile?.isVerified ? (
        <>
          <StyledView className="bg-success/10 rounded-xl p-4 mb-4">
            <StyledView className="flex-row items-start">
              <Ionicons name="shield-checkmark" size={24} color="#12B981" />
              <StyledView className="flex-1 ml-3">
                <Body className="text-success font-semibold mb-1">Your profile is verified</Body>
                <Body className="text-neutral-600 text-sm">
                  You've completed the verification process, which helps build trust with potential matches.
                </Body>
              </StyledView>
            </StyledView>
          </StyledView>
          <Body className="text-neutral-900 font-semibold mb-3">Verification Benefits:</Body>
          <StyledView className="space-y-3 mb-5">
            {['Increased trust from potential matches','Higher visibility in match suggestions','Stands out with verified badge'].map(b => (
              <StyledView key={b} className="flex-row items-start">
                <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                <Body className="flex-1 text-neutral-700 text-sm ml-3">{b}</Body>
              </StyledView>
            ))}
          </StyledView>
        </>
      ) : (
        <>
          <Body className="text-neutral-700 text-sm mb-4 leading-5">
            Verify your profile to increase trust and improve your chances of making meaningful connections.
            Verified profiles get 3x more engagement.
          </Body>
          <Body className="text-neutral-900 font-semibold mb-3">Verification Benefits:</Body>
          <StyledView className="space-y-3 mb-5">
            {['Increased trust from potential matches','Higher visibility in match suggestions','Stand out with verified badge','Access to premium matching features'].map(b => (
              <StyledView key={b} className="flex-row items-start">
                <Ionicons name="checkmark-circle" size={20} color="#437FFF" />
                <Body className="flex-1 text-neutral-700 text-sm ml-3">{b}</Body>
              </StyledView>
            ))}
          </StyledView>
          <StyledView className="bg-primary-50 rounded-xl p-4 mb-5 border border-primary-200">
            <Body className="text-neutral-900 font-semibold mb-2">How to get verified:</Body>
            <Body className="text-neutral-700 text-sm leading-5">
              1. Complete your profile (100%){'\n'}
              2. Add at least 3 clear photos{'\n'}
              3. Verify your phone number{'\n'}
              4. Submit verification request in Settings
            </Body>
          </StyledView>
          <Button
            onPress={() => { setShowVerificationModal(false); navigation.navigate('Settings'); }}
            variant="primary"
            fullWidth
          >
            Start Verification
          </Button>
        </>
      )}
    </StyledAnimatedView>
  </StyledAnimatedView>
</Modal>
```

---

### src/navigation/AppNavigator.tsx

**Import to restore:**
```ts
import { ProfileVerificationScreen } from '../screens/profile/ProfileVerificationScreen';
```

**Stack.Screen to restore (inside the Match Screens section):**
```jsx
<Stack.Screen name="ProfileVerification" component={ProfileVerificationScreen} />
```

---

### src/types/index.ts

**In `RootStackParamList`:**
```ts
ProfileVerification: undefined;
```

**In `Profile` type:**
```ts
isVerified?: boolean; // Verification status
```
