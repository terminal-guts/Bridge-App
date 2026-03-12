import { Share, Linking, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { showToast } from './toast';

/**
 * Share a match card image to Instagram Stories via deep link.
 * Falls back to the system share sheet if Instagram is not installed.
 */
export async function shareToInstagramStories(imageUri: string): Promise<void> {
    try {
        const url = 'instagram-stories://share';
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            // Instagram Stories deep link — the image is passed via the pasteboard on iOS
            // For full sticker support, react-native-share would be needed, but per constraints
            // we use the system share sheet as the reliable path
            await Sharing.shareAsync(imageUri, {
                mimeType: 'image/png',
                UTI: 'public.png',
            });
        } else {
            // Instagram not installed — fall back to generic share
            await shareGeneric(imageUri);
            showToast.info('Instagram not found', 'Opened system share instead');
        }
    } catch (error) {
        showToast.error('Could not share', 'Something went wrong — try again');
    }
}

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
