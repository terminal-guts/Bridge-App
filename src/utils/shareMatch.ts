import { Share, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { showToast } from './toast';

/**
 * Share a match card image via the native Messages / SMS share target.
 * Uses the RN Share API which shows the standard share sheet with iMessage as the default.
 */
export async function shareToMessages(imageUri: string): Promise<void> {
    try {
        if (Platform.OS === 'ios') {
            // On iOS, Share.share with a url opens the share sheet with the file attached
            await Share.share({ url: imageUri });
        } else {
            await Sharing.shareAsync(imageUri, { mimeType: 'image/png' });
        }
    } catch (error: any) {
        // User cancellation is not an error
        if (error?.message?.includes('cancel') || error?.code === 'ERR_SHARING_CANCELLED') return;
        showToast.error('Could not share', 'Something went wrong — try again');
    }
}

/**
 * Open the system share sheet with the match card image.
 */
export async function shareGeneric(imageUri: string): Promise<void> {
    try {
        const available = await Sharing.isAvailableAsync();
        if (!available) {
            showToast.error('Sharing unavailable', 'Your device does not support sharing');
            return;
        }
        await Sharing.shareAsync(imageUri, {
            mimeType: 'image/png',
            UTI: 'public.png',
        });
    } catch (error: any) {
        if (error?.message?.includes('cancel') || error?.code === 'ERR_SHARING_CANCELLED') return;
        showToast.error('Could not share', 'Something went wrong — try again');
    }
}
