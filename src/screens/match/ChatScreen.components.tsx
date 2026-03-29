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
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { OVERLAYS, SHADOWS } from '../../theme/shadows';

// ── Constants ─────────────────────────────────────────────────────────────────

export const END_MATCH_REASONS = [
  'Conversation fizzled',
  'No connection',
  'Not on same page',
  'Felt uncomfortable',
  'Bad timing',
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
        <TouchableOpacity style={cs.menuItem} onPress={onProposeDate} accessibilityRole="button" accessibilityLabel="Propose a date">
          <EvaIcon name="calendar" variant="outline" size={18} color={COLORS.textDarkHeading} />
          <Text style={cs.menuItemText}>Propose a Date</Text>
        </TouchableOpacity>
        <View style={cs.menuDivider} />
        <TouchableOpacity style={cs.menuItem} onPress={onEndMatch} accessibilityRole="button" accessibilityLabel="End match">
          <EvaIcon name="close-circle" variant="outline" size={18} color={COLORS.textDarkHeading} />
          <Text style={cs.menuItemText}>End Match</Text>
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
        <Text style={ts.title}>Propose a Date</Text>
        <Text style={ts.subtitle}>Suggest something fun with {recipientName}</Text>
        <TextInput
          style={[ts.textArea, { minHeight: 80 }]}
          placeholder={`e.g. Coffee at Blue Bottle on Saturday at 2pm?`}
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
          <Text style={ts.submitBtnText}>Send Proposal</Text>
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
          <EvaIcon name="close-square" variant="outline" size={26} color="#F97316" />
        </View>
        <Text style={ts.title}>End this match?</Text>
        <Text style={ts.subtitle}>You'll re-enter the matchmaking pool.{'\n'}Your reason will be shared with them.</Text>
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
          <Text style={ts.submitBtnText}>{submitting ? 'Ending...' : 'End Match'}</Text>
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
}) => (
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
        <Text style={ts.subtitle}>Our team reviews all reports within 24 hours</Text>
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
          style={ts.textArea}
          placeholder="Additional details (optional)"
          placeholderTextColor={COLORS.text.placeholder}
          value={reportDetails}
          onChangeText={onChangeDetails}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[ts.submitBtn, !reportReason && ts.submitBtnDisabled]}
          onPress={onConfirm}
          disabled={!reportReason}
        >
          <Text style={ts.submitBtnText}>Submit Report</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={onClose} />
    </KeyboardAvoidingView>
  </Modal>
);

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
    lineHeight: 22,
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
    backgroundColor: COLORS.backgroundProgressTrack,
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
    lineHeight: 20,
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
