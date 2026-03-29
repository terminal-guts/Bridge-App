/**
 * ChatScreen sub-components — modals, styles
 * Extracted from ChatScreen.tsx for maintainability.
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { EvaIcon } from '../../components/icons';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { OVERLAYS, SHADOWS } from '../../theme/shadows';

// ── Constants ─────────────────────────────────────────────────────────────────

export const END_MATCH_REASONS = [
  'Conversation fizzled',
  'Didn\'t feel a spark',
  'Looking for something different',
  'Felt uncomfortable',
  'Timing wasn\'t right',
  'Other',
];

export const REPORT_REASONS = [
  'Inappropriate messages',
  'Fake profile',
  'Harassment',
  'Spam',
  'Other',
];

export const formatMessageDate = (date: Date): string => {
  const today = new Date();
  const messageDate = new Date(date);
  if (
    messageDate.getDate() === today.getDate() &&
    messageDate.getMonth() === today.getMonth() &&
    messageDate.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    messageDate.getDate() === yesterday.getDate() &&
    messageDate.getMonth() === yesterday.getMonth() &&
    messageDate.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }
  return messageDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// ── Dropdown Menu Modal ───────────────────────────────────────────────────────

interface DropdownMenuProps {
  visible: boolean;
  onClose: () => void;
  onProposeDate: () => void;
  onEndMatch: () => void;
  onReport: () => void;
  recipientName: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  visible, onClose, onProposeDate, onEndMatch, onReport, recipientName,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={cs.menuOverlay} activeOpacity={1} onPress={onClose}>
      <View style={cs.menuCard}>
        <TouchableOpacity style={cs.menuItem} onPress={onProposeDate} accessibilityRole="button" accessibilityLabel="Ask them out">
          <EvaIcon name="calendar" variant="outline" size={18} color={COLORS.textDarkHeading} />
          <Text style={cs.menuItemText}>Ask them out</Text>
        </TouchableOpacity>
        <View style={cs.menuDivider} />
        <TouchableOpacity style={cs.menuItem} onPress={onEndMatch} accessibilityRole="button" accessibilityLabel="Move on from match">
          <EvaIcon name="close-circle" variant="outline" size={18} color={COLORS.textDarkHeading} />
          <Text style={cs.menuItemText}>Move on</Text>
        </TouchableOpacity>
        <View style={cs.menuDivider} />
        <TouchableOpacity style={cs.menuItem} onPress={onReport} accessibilityRole="button" accessibilityLabel={`Report ${recipientName}`}>
          <EvaIcon name="flag" variant="outline" size={18} color={COLORS.danger} />
          <Text style={[cs.menuItemText, { color: COLORS.danger }]}>Report</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ── Propose a Date Modal ──────────────────────────────────────────────────────

interface ProposeDateModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipientName: string;
  dateProposalText: string;
  onChangeText: (text: string) => void;
}

export const ProposeDateModal: React.FC<ProposeDateModalProps> = ({
  visible, onClose, onConfirm, recipientName, dateProposalText, onChangeText,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={ts.overlay}>
      <View style={ts.card}>
        <TouchableOpacity style={ts.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <EvaIcon name="close" variant="outline" size={22} color={COLORS.navInactiveIcon} />
        </TouchableOpacity>
        <View style={[ts.iconWrap, { backgroundColor: COLORS.backgroundFriendActive }]}>
          <EvaIcon name="calendar" variant="outline" size={26} color={COLORS.primaryAccent} />
        </View>
        <Text style={ts.title}>Ask {recipientName} out</Text>
        <Text style={ts.subtitle}>Suggest a time and place to meet up</Text>
        <TextInput
          style={[ts.textArea, { minHeight: 80 }]}
          placeholder={`e.g. Coffee at Brochstein on Saturday at 2pm?`}
          placeholderTextColor={COLORS.text.placeholder}
          value={dateProposalText}
          onChangeText={onChangeText}
          multiline
          maxLength={300}
          autoFocus
        />
        <TouchableOpacity
          style={[ts.submitBtn, !dateProposalText.trim() && ts.submitBtnDisabled]}
          onPress={onConfirm}
          disabled={!dateProposalText.trim()}
        >
          <Text style={ts.submitBtnText}>Send it</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={onClose} />
    </KeyboardAvoidingView>
  </Modal>
);

// ── End Match Modal ───────────────────────────────────────────────────────────

interface EndMatchModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  endMatchReason: string;
  onSelectReason: (reason: string) => void;
  endMatchCustomReason: string;
  onChangeCustomReason: (text: string) => void;
  submitting: boolean;
}

export const EndMatchModal: React.FC<EndMatchModalProps> = ({
  visible, onClose, onConfirm, endMatchReason, onSelectReason,
  endMatchCustomReason, onChangeCustomReason, submitting,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={ts.overlay}>
      <View style={ts.card}>
        <TouchableOpacity style={ts.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <EvaIcon name="close" variant="outline" size={22} color={COLORS.navInactiveIcon} />
        </TouchableOpacity>
        <View style={[ts.iconWrap, { backgroundColor: COLORS.backgroundWarmPeach }]}>
          <EvaIcon name="close-square" variant="outline" size={26} color={COLORS.warmOrange} />
        </View>
        <Text style={ts.title}>Ready to move on?</Text>
        <Text style={ts.subtitle}>No worries — you'll be back in the mix for a new match.{'\n'}Let us know what happened so we can do better.</Text>
        <View style={ts.pillRow}>
          {END_MATCH_REASONS.map(reason => (
            <TouchableOpacity
              key={reason}
              style={[ts.pill, endMatchReason === reason && ts.pillActive]}
              onPress={() => onSelectReason(reason)}
            >
              <Text style={[ts.pillText, endMatchReason === reason && ts.pillTextActive]}>
                {reason}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={ts.textArea}
          placeholder={endMatchReason === 'Other' ? 'Tell us a bit more...' : 'Additional details (optional)'}
          placeholderTextColor={COLORS.text.placeholder}
          value={endMatchCustomReason}
          onChangeText={onChangeCustomReason}
          multiline
          maxLength={300}
        />
        <TouchableOpacity
          style={[ts.submitBtn, (!endMatchReason || submitting) && ts.submitBtnDisabled]}
          onPress={onConfirm}
          disabled={!endMatchReason || submitting}
        >
          <Text style={ts.submitBtnText}>{submitting ? 'On it...' : 'Move on'}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={onClose} />
    </KeyboardAvoidingView>
  </Modal>
);

// ── Report Modal ──────────────────────────────────────────────────────────────

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recipientName: string;
  reportReason: string;
  onSelectReason: (reason: string) => void;
  reportDetails: string;
  onChangeDetails: (text: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  visible, onClose, onConfirm, recipientName, reportReason,
  onSelectReason, reportDetails, onChangeDetails,
}) => {
  const isOther = reportReason === 'Other';
  const canSubmit = reportReason && (!isOther || reportDetails.trim().length > 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={ts.overlay}>
        <View style={ts.card}>
          <TouchableOpacity style={ts.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <EvaIcon name="close" variant="outline" size={22} color={COLORS.navInactiveIcon} />
          </TouchableOpacity>
          <View style={[ts.iconWrap, { backgroundColor: COLORS.backgroundSoftRed }]}>
            <EvaIcon name="flag" variant="outline" size={26} color={COLORS.danger} />
          </View>
          <Text style={ts.title}>Report {recipientName}</Text>
          <Text style={ts.subtitle}>We take this seriously — our team looks into every report within 24 hours</Text>
          <View style={ts.pillRow}>
            {REPORT_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                style={[ts.pill, reportReason === reason && ts.pillActive]}
                onPress={() => onSelectReason(reason)}
              >
                <Text style={[ts.pillText, reportReason === reason && ts.pillTextActive]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[ts.textArea, isOther && ts.textAreaRequired]}
            placeholder={isOther ? 'Please describe the issue...' : 'Anything else we should know? (optional)'}
            placeholderTextColor={COLORS.text.placeholder}
            value={reportDetails}
            onChangeText={(text) => onChangeDetails(text.slice(0, 300))}
            multiline
            maxLength={300}
            autoFocus={isOther}
            textAlignVertical="top"
          />
          {isOther && (
            <Text style={ts.charCount}>{reportDetails.length}/300</Text>
          )}
          <TouchableOpacity
            style={[ts.submitBtn, !canSubmit && ts.submitBtnDisabled]}
            onPress={onConfirm}
            disabled={!canSubmit}
          >
            <Text style={ts.submitBtnText}>Submit Report</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={onClose} />
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── Date proposal message card styles ─────────────────────────────────────────

export const dateProposalStyles = StyleSheet.create({
  card: {
    maxWidth: '85%',
    borderWidth: 1.5,
    borderColor: COLORS.borderMediumBlue,
    backgroundColor: COLORS.backgroundLightBlue,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  headerText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.base,
    color: COLORS.primaryAccent,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textDarkHeading,
    lineHeight: LINE_HEIGHTS.xl,
  },
});

// ── Styles for menus ──────────────────────────────────────────────────────────

const cs = StyleSheet.create({
  menuOverlay: {
    flex: 1,
    backgroundColor: OVERLAYS.light,
  },
  menuCard: {
    position: 'absolute',
    top: 96,
    right: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    width: 220,
    ...SHADOWS.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  menuItemText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.medium,
    color: COLORS.textDarkHeading,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 16,
  },
});

// ── Top-sheet modal styles ──────────────────────────────────────────────────

export const ts = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: OVERLAYS.medium,
    justifyContent: 'flex-start',
  },
  card: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 28,
    ...SHADOWS.xxl,
  },
  closeBtn: {
    position: 'absolute',
    top: 58,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundProgressTrack,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES['3xl'],
    color: COLORS.textDarkHeading,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.base,
    color: COLORS.navInactiveIcon,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: LINE_HEIGHTS.lg,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.borderNeutral,
    backgroundColor: COLORS.card,
  },
  pillActive: {
    borderColor: COLORS.primaryAccent,
    backgroundColor: COLORS.backgroundFriendActive,
  },
  pillText: {
    fontFamily: FONTS.medium,
    fontSize: FONT_SIZES.md,
    color: COLORS.navInactiveIcon,
  },
  pillTextActive: {
    fontFamily: FONTS.semiBold,
    color: COLORS.primaryAccent,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: COLORS.borderNeutral,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textDarkHeading,
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: COLORS.backgroundOffWhite,
  },
  textAreaRequired: {
    borderColor: COLORS.border,
    minHeight: 100,
    marginBottom: 4,
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text.light,
    textAlign: 'right' as const,
    marginBottom: 16,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.primaryAccent,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.35,
  },
  submitBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.card,
  },
});
