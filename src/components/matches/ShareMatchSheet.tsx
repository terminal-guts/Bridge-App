import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import { COLORS } from '../../theme/colors';
import { OVERLAYS } from '../../theme/shadows';
import { EvaIcon } from '../icons';

interface ShareMatchSheetProps {
    visible: boolean;
    imageUri: string | null;
    loading: boolean;
    onShareSnapchat: () => void;
    onShareMessages: () => void;
    onShareMore: () => void;
    onSaveToPhotos: () => void;
    onClose: () => void;
}

const SHARE_TARGETS = [
    { key: 'snapchat', label: 'Snapchat', icon: 'share' as const, color: '#FFFC00', iconColor: '#000000', action: 'onShareSnapchat' },
    { key: 'message', label: 'iMessage', icon: 'message-circle' as const, color: COLORS.primaryButton, iconColor: '#FFFFFF', action: 'onShareMessages' },
    { key: 'more', label: 'More...', icon: 'share' as const, color: '#667085', iconColor: '#FFFFFF', action: 'onShareMore' },
] as const;

export const ShareMatchSheet: React.FC<ShareMatchSheetProps> = ({
    visible,
    imageUri,
    loading,
    onShareSnapchat,
    onShareMessages,
    onShareMore,
    onSaveToPhotos,
    onClose,
}) => {
    const actions: Record<string, () => void> = {
        onShareSnapchat,
        onShareMessages,
        onShareMore,
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity activeOpacity={1} style={styles.sheet}>
                    {/* Drag handle */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <Text style={styles.sheetTitle}>Share your match</Text>
                    <Text style={styles.sheetSubtitle}>Show the world what your friends did</Text>

                    {/* Preview — large enough to see and get excited about */}
                    <View style={styles.previewWrap}>
                        {loading ? (
                            <View style={styles.previewPlaceholder}>
                                <ActivityIndicator size="small" color={COLORS.primaryButton} />
                                <Text style={styles.previewLoadingText}>Creating your card...</Text>
                            </View>
                        ) : imageUri ? (
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.preview}
                                contentFit="contain"
                                transition={200}
                            />
                        ) : null}
                    </View>

                    {/* Share targets — horizontal icon row */}
                    <View style={styles.targetRow}>
                        {SHARE_TARGETS.map(({ key, label, icon, color, iconColor, action }) => (
                            <TouchableOpacity
                                key={key}
                                style={styles.targetItem}
                                activeOpacity={0.7}
                                onPress={actions[action]}
                                disabled={loading || !imageUri}
                            >
                                <View style={[styles.targetIconCircle, { backgroundColor: color }]}>
                                    <EvaIcon name={icon} variant="outline" size={24} color={iconColor} />
                                </View>
                                <Text style={styles.targetLabel} numberOfLines={1}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Save to Photos */}
                    <TouchableOpacity
                        style={styles.saveBtn}
                        activeOpacity={0.7}
                        onPress={onSaveToPhotos}
                        disabled={loading || !imageUri}
                    >
                        <EvaIcon name="download" variant="outline" size={20} color="#2B65F9" />
                        <Text style={styles.saveBtnText}>Save to Photos</Text>
                    </TouchableOpacity>

                    {/* Done */}
                    <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={styles.doneBtnText}>Done</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: OVERLAYS.medium,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 34,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E4E7EC',
        alignSelf: 'center',
        marginBottom: 14,
    },
    sheetTitle: {
        fontFamily: FONTS.bold,
        fontSize: FONT_SIZES['3xl'],
        color: '#101828',
        textAlign: 'center',
        marginBottom: 4,
    },
    sheetSubtitle: {
        fontFamily: FONTS.regular,
        fontSize: FONT_SIZES.base,
        color: '#667085',
        textAlign: 'center',
        marginBottom: 16,
    },
    previewWrap: {
        alignItems: 'center',
        marginBottom: 20,
    },
    preview: {
        width: 180,
        height: 320,
        borderRadius: 16,
    },
    previewPlaceholder: {
        width: 180,
        height: 320,
        borderRadius: 16,
        backgroundColor: COLORS.backgroundProgressTrack,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewLoadingText: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.sm,
        color: '#667085',
        marginTop: 8,
    },
    targetRow: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginBottom: 16,
    },
    targetItem: {
        alignItems: 'center',
        width: 72,
    },
    targetIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    targetLabel: {
        fontFamily: FONTS.medium,
        fontSize: FONT_SIZES.xs,
        color: '#344054',
        textAlign: 'center',
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: COLORS.backgroundFriendActive,
        marginBottom: 10,
    },
    saveBtnText: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.lg,
        color: COLORS.primaryButton,
    },
    doneBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E4E7EC',
        alignItems: 'center',
    },
    doneBtnText: {
        fontFamily: FONTS.semiBold,
        fontSize: FONT_SIZES.xl,
        color: '#667085',
    },
});
