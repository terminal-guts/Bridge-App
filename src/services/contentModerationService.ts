import { ApiResponse } from '../types';
import { createLogger } from '../utils/secureLogger';

const logger = createLogger('ContentModerationService');

/**
 * Azure Content Safety Service
 *
 * Integrates with Microsoft Azure Content Safety API to moderate text content.
 * Requires AZURE_CONTENT_SAFETY_ENDPOINT and AZURE_CONTENT_SAFETY_KEY to be set.
 */

const API_VERSION = '2023-10-01';

interface AnalyzeTextRequest {
    text: string;
    categories?: string[];
    blocklistNames?: string[];
    haltOnBlocklistHit?: boolean;
    outputType?: 'FourSeverityLevels' | 'EightSeverityLevels';
}

interface AnalyzeTextResponse {
    blocklistsMatch: any[];
    categoriesAnalysis: {
        category: 'Hate' | 'SelfHarm' | 'Sexual' | 'Violence';
        severity: number; // 0 (Safe) to 6 (High) usually, depending on outputType
    }[];
}

export const contentModerationService = {
    /**
     * Analyze text for harmful content using Azure Content Safety
     */
    analyzeText: async (text: string): Promise<{ isSafe: boolean; reason?: string }> => {
        const endpoint = process.env.EXPO_PUBLIC_AZURE_CONTENT_SAFETY_ENDPOINT;
        const key = process.env.EXPO_PUBLIC_AZURE_CONTENT_SAFETY_KEY;

        if (!endpoint || !key) {
            logger.warn('[CONTENT MODERATION] Missing Azure credentials. Skipping moderation.');
            return { isSafe: true };
        }

        try {
            logger.info('[CONTENT MODERATION] Analyzing text...');

            // Azure resource endpoints usually need /contentsafety/text:analyze
            // If the user provided the full resource URL (e.g. https://name.cognitiveservices.azure.com/), we append path.
            // If they provided the full URL to the endpoint, we use it as is? 
            // Safest is to handle the base URL.
            const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
            const url = `${baseUrl}/contentsafety/text:analyze?api-version=${API_VERSION}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': key,
                },
                body: JSON.stringify({
                    text,
                    categories: ['Hate', 'SelfHarm', 'Sexual', 'Violence'],
                    outputType: 'FourSeverityLevels', // 0, 2, 4, 6
                } as AnalyzeTextRequest),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error('[CONTENT MODERATION] API Error:', response.status, errorText);
                // Fail open or closed? For a mock/demo, failing open (allowing text) is less annoying if config is bad.
                return { isSafe: true };
            }

            const data: AnalyzeTextResponse = await response.json();

            // Check for violations
            // Severity: 0 (Safe), 2 (Low), 4 (Medium), 6 (High)
            // We can decide the threshold. Let's block Medium and High (>= 4).
            const violations = data.categoriesAnalysis.filter(c => c.severity >= 2); // Strict: Block Low+

            if (violations.length > 0) {
                const categories = violations.map(v => v.category).join(', ');
                logger.warn(`[CONTENT MODERATION] Text blocked: ${categories}`);
                return {
                    isSafe: false,
                    reason: `Content flagged as inappropriate (${categories})`
                };
            }

            return { isSafe: true };

        } catch (error) {
            logger.error('[CONTENT MODERATION] Unexpected error:', error);
            return { isSafe: true };
        }
    }
};
