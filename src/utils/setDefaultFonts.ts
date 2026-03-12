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
function patchRender(Component: any) {
  const originalRender = Component.render;
  if (typeof originalRender === 'function') {
    Component.render = function (props: any, ref: any) {
      const flat = StyleSheet.flatten(props.style) || {};
      // Skip if fontFamily already explicitly set to PlusJakartaSans
      if (flat.fontFamily && flat.fontFamily.startsWith('PlusJakartaSans')) {
        return originalRender.call(this, props, ref);
      }
      const fontFamily = getFontForWeight(flat.fontWeight);
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
function patchDefaultProps(Component: any) {
  if (!Component.defaultProps) Component.defaultProps = {};
  Component.defaultProps.style = [
    { fontFamily: DEFAULT_FONT },
    Component.defaultProps.style,
  ];
}

// Guard: only patch once (safe for HMR / fast-refresh)
const PATCHED_KEY = '__plusJakartaPatched';
if (!(Text as any)[PATCHED_KEY]) {
  if (!patchRender(Text)) {
    patchDefaultProps(Text);
  }
  (Text as any)[PATCHED_KEY] = true;
}
if (!(TextInput as any)[PATCHED_KEY]) {
  if (!patchRender(TextInput)) {
    patchDefaultProps(TextInput);
  }
  (TextInput as any)[PATCHED_KEY] = true;
}
