/**
 * Global Font Override — Plus Jakarta Sans
 *
 * Patches React Native's Text and TextInput to use Plus Jakarta Sans
 * as the default font. Maps fontWeight values to the correct font file.
 *
 * Import this file ONCE at the top of App.tsx (after font loading).
 */
import { Text, TextInput, StyleSheet } from 'react-native';

const WEIGHT_TO_FONT: Record<string, string> = {
  '100': 'PlusJakartaSans_400Regular',
  '200': 'PlusJakartaSans_400Regular',
  '300': 'PlusJakartaSans_400Regular',
  'normal': 'PlusJakartaSans_400Regular',
  '400': 'PlusJakartaSans_400Regular',
  '500': 'PlusJakartaSans_500Medium',
  '600': 'PlusJakartaSans_600SemiBold',
  'bold': 'PlusJakartaSans_700Bold',
  '700': 'PlusJakartaSans_700Bold',
  '800': 'PlusJakartaSans_800ExtraBold',
  '900': 'PlusJakartaSans_800ExtraBold',
};

const DEFAULT_FONT = 'PlusJakartaSans_400Regular';

function getFontForWeight(weight?: string | number): string {
  if (!weight) return DEFAULT_FONT;
  return WEIGHT_TO_FONT[String(weight)] || DEFAULT_FONT;
}

// Approach 1: Patch Text.render (class components, older RN)
function patchRender(Component: Record<string, unknown>) {
  const originalRender = Component.render;
  if (typeof originalRender === 'function') {
    Component.render = function (props: Record<string, unknown>, ref: unknown) {
      const flat = (StyleSheet.flatten(props.style) || {}) as { fontFamily?: string; fontWeight?: string | number };
      // If fontFamily is already PlusJakartaSans, ensure fontWeight matches
      // so React Native renders the correct variant (fontFamily alone is not enough on iOS)
      if (flat.fontFamily && flat.fontFamily.startsWith('PlusJakartaSans')) {
        const FONT_TO_WEIGHT: Record<string, string> = {
          'PlusJakartaSans_400Regular': 'normal',
          'PlusJakartaSans_500Medium': '500',
          'PlusJakartaSans_600SemiBold': '600',
          'PlusJakartaSans_700Bold': '700',
          'PlusJakartaSans_800ExtraBold': '800',
        };
        const derivedWeight = FONT_TO_WEIGHT[flat.fontFamily];
        if (derivedWeight && !flat.fontWeight) {
          return originalRender.call(this, {
            ...props,
            style: [props.style, { fontWeight: derivedWeight }],
          }, ref);
        }
        return originalRender.call(this, props, ref);
      }
      const fontFamily = getFontForWeight(flat.fontWeight as string | undefined);
      return originalRender.call(this, {
        ...props,
        style: [{ fontFamily }, props.style],
      }, ref);
    };
    return true;
  }
  return false;
}

// Approach 2: defaultProps fallback (works across all RN versions)
function patchDefaultProps(Component: Record<string, unknown>) {
  const comp = Component as Record<string, Record<string, unknown>>;
  if (!comp.defaultProps) comp.defaultProps = {};
  comp.defaultProps.style = [
    { fontFamily: DEFAULT_FONT },
    comp.defaultProps.style,
  ];
}

// Guard: only patch once (safe for HMR / fast-refresh)
const PATCHED_KEY = '__plusJakartaPatched';
if (!(Text as unknown as Record<string, unknown>)[PATCHED_KEY]) {
  if (!patchRender(Text as unknown as Record<string, unknown>)) {
    patchDefaultProps(Text as unknown as Record<string, unknown>);
  }
  (Text as unknown as Record<string, unknown>)[PATCHED_KEY] = true;
}
if (!(TextInput as unknown as Record<string, unknown>)[PATCHED_KEY]) {
  if (!patchRender(TextInput as unknown as Record<string, unknown>)) {
    patchDefaultProps(TextInput as unknown as Record<string, unknown>);
  }
  (TextInput as unknown as Record<string, unknown>)[PATCHED_KEY] = true;
}
