/**
 * Converts a stored profile value (snake_case or lowercase) into a
 * display-friendly Title Case string.
 *
 * Examples:
 *   'prefer_not_to_say' → 'Prefer Not to Say'
 *   'want_children'     → 'Want Children'
 *   'no'                → 'No'
 *   'very_liberal'      → 'Very Liberal'
 *   'dont_want_children'→ "Don't Want Children"
 */
export const formatProfileValue = (value: string | undefined | null): string => {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bDont\b/gi, "Don't");
};

const GENDER_DISPLAY: Record<string, string> = {
  male: 'Man',
  female: 'Woman',
  'non-binary': 'Non-binary',
  both: 'Open to all',
};

/**
 * Converts a stored gender value to its display label.
 * 'male' → 'Man', 'female' → 'Woman', custom values pass through with title case.
 */
export const formatGenderDisplay = (value: string | undefined | null): string => {
  if (!value) return '';
  return GENDER_DISPLAY[value] || formatProfileValue(value);
};
