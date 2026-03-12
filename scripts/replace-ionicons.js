/**
 * Bulk replace Ionicons → EvaIcon across the codebase.
 * Run: node scripts/replace-ionicons.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ionicon name → Eva icon name mapping
const ICON_MAP = {
  // Navigation
  'arrow-back': 'arrow-back',
  'arrow-back-outline': 'arrow-back',
  'arrow-forward': 'arrow-forward',
  'arrow-forward-outline': 'arrow-forward',
  'chevron-back': 'arrow-ios-back',
  'chevron-back-outline': 'arrow-ios-back',
  'chevron-forward': 'arrow-ios-forward',
  'chevron-forward-outline': 'arrow-ios-forward',
  'chevron-down': 'arrow-ios-downward',
  'chevron-down-outline': 'arrow-ios-downward',
  'chevron-up': 'arrow-ios-upward',
  'chevron-up-outline': 'arrow-ios-upward',
  'caret-down': 'arrowhead-down',
  'caret-down-outline': 'arrowhead-down',
  'caret-up': 'arrowhead-up',
  'caret-up-outline': 'arrowhead-up',

  // Common UI
  'close': 'close',
  'close-outline': 'close',
  'close-circle': 'close-circle',
  'close-circle-outline': 'close-circle',
  'checkmark': 'checkmark',
  'checkmark-outline': 'checkmark',
  'checkmark-circle': 'checkmark-circle-2',
  'checkmark-circle-outline': 'checkmark-circle-2',
  'add': 'plus',
  'add-outline': 'plus',
  'add-circle': 'plus-circle',
  'add-circle-outline': 'plus-circle',
  'remove': 'minus',
  'remove-outline': 'minus',
  'remove-circle': 'minus-circle',
  'remove-circle-outline': 'minus-circle',
  'search': 'search',
  'search-outline': 'search',
  'settings': 'settings-2',
  'settings-outline': 'settings-2',
  'options': 'options-2',
  'options-outline': 'options-2',
  'ellipsis-horizontal': 'more-horizontal',
  'ellipsis-horizontal-outline': 'more-horizontal',
  'ellipsis-vertical': 'more-vertical',
  'ellipsis-vertical-outline': 'more-vertical',
  'menu': 'menu',
  'menu-outline': 'menu',
  'refresh': 'refresh',
  'refresh-outline': 'refresh',
  'reload': 'refresh',
  'reload-outline': 'refresh',

  // People
  'person': 'person',
  'person-outline': 'person',
  'person-add': 'person-add',
  'person-add-outline': 'person-add',
  'person-remove': 'person-remove',
  'person-remove-outline': 'person-remove',
  'people': 'people',
  'people-outline': 'people',

  // Communication
  'chatbubble': 'message-circle',
  'chatbubble-outline': 'message-circle',
  'chatbubble-ellipses': 'message-circle',
  'chatbubble-ellipses-outline': 'message-circle',
  'chatbubbles': 'message-circle',
  'chatbubbles-outline': 'message-circle',
  'mail': 'email',
  'mail-outline': 'email',
  'send': 'paper-plane',
  'send-outline': 'paper-plane',
  'call': 'phone-call',
  'call-outline': 'phone-call',

  // Media
  'camera': 'camera',
  'camera-outline': 'camera',
  'image': 'image',
  'image-outline': 'image',
  'images': 'image',
  'images-outline': 'image',
  'mic': 'mic',
  'mic-outline': 'mic',
  'mic-off': 'mic-off',
  'mic-off-outline': 'mic-off',
  'play': 'play-circle',
  'play-outline': 'play-circle',
  'pause': 'pause-circle',
  'pause-outline': 'pause-circle',
  'stop': 'stop-circle',
  'stop-outline': 'stop-circle',
  'musical-notes': 'music',
  'musical-notes-outline': 'music',
  'volume-high': 'volume-up',
  'volume-high-outline': 'volume-up',
  'volume-mute': 'volume-mute',
  'volume-mute-outline': 'volume-mute',

  // Status & Info
  'alert': 'alert-triangle',
  'alert-outline': 'alert-triangle',
  'alert-circle': 'alert-circle',
  'alert-circle-outline': 'alert-circle',
  'information': 'info',
  'information-outline': 'info',
  'information-circle': 'info',
  'information-circle-outline': 'info',
  'help': 'question-mark-circle',
  'help-outline': 'question-mark-circle',
  'help-circle': 'question-mark-circle',
  'help-circle-outline': 'question-mark-circle',
  'warning': 'alert-triangle',
  'warning-outline': 'alert-triangle',

  // Actions
  'trash': 'trash-2',
  'trash-outline': 'trash-2',
  'trash-bin': 'trash-2',
  'trash-bin-outline': 'trash-2',
  'create': 'edit-2',
  'create-outline': 'edit-2',
  'pencil': 'edit-2',
  'pencil-outline': 'edit-2',
  'copy': 'copy',
  'copy-outline': 'copy',
  'share': 'share',
  'share-outline': 'share',
  'share-social': 'share',
  'share-social-outline': 'share',
  'download': 'download',
  'download-outline': 'download',
  'cloud-upload': 'cloud-upload',
  'cloud-upload-outline': 'cloud-upload',
  'save': 'save',
  'save-outline': 'save',

  // Objects
  'heart': 'heart',
  'heart-outline': 'heart',
  'heart-dislike': 'close-square',
  'heart-dislike-outline': 'close-square',
  'star': 'star',
  'star-outline': 'star',
  'flag': 'flag',
  'flag-outline': 'flag',
  'bookmark': 'bookmark',
  'bookmark-outline': 'bookmark',
  'gift': 'gift',
  'gift-outline': 'gift',
  'trophy': 'award',
  'trophy-outline': 'award',
  'shield': 'shield',
  'shield-outline': 'shield',
  'shield-checkmark': 'shield',
  'shield-checkmark-outline': 'shield',
  'lock-closed': 'lock',
  'lock-closed-outline': 'lock',
  'lock-open': 'unlock',
  'lock-open-outline': 'unlock',
  'key': 'lock',
  'key-outline': 'lock',

  // Time
  'time': 'clock',
  'time-outline': 'clock',
  'timer': 'clock',
  'timer-outline': 'clock',
  'hourglass': 'clock',
  'hourglass-outline': 'clock',
  'calendar': 'calendar',
  'calendar-outline': 'calendar',

  // Location
  'location': 'pin',
  'location-outline': 'pin',
  'navigate': 'navigation-2',
  'navigate-outline': 'navigation-2',
  'compass': 'compass',
  'compass-outline': 'compass',
  'map': 'map',
  'map-outline': 'map',
  'globe': 'globe',
  'globe-outline': 'globe',

  // Devices
  'phone-portrait': 'smartphone',
  'phone-portrait-outline': 'smartphone',
  'laptop': 'monitor',
  'laptop-outline': 'monitor',

  // Files & Documents
  'document': 'file-text',
  'document-outline': 'file-text',
  'document-text': 'file-text',
  'document-text-outline': 'file-text',
  'folder': 'folder',
  'folder-outline': 'folder',
  'clipboard': 'clipboard',
  'clipboard-outline': 'clipboard',

  // Notifications
  'notifications': 'bell',
  'notifications-outline': 'bell',
  'notifications-off': 'bell-off',
  'notifications-off-outline': 'bell-off',

  // Layout
  'grid': 'grid',
  'grid-outline': 'grid',
  'list': 'list',
  'list-outline': 'list',
  'apps': 'grid',
  'apps-outline': 'grid',

  // Weather & Nature
  'sunny': 'sun',
  'sunny-outline': 'sun',
  'moon': 'moon',
  'moon-outline': 'moon',
  'cloud': 'cloud-upload',
  'cloud-outline': 'cloud-upload',

  // Social
  'logo-github': 'github',
  'logo-twitter': 'twitter',
  'logo-facebook': 'facebook',
  'logo-google': 'google',
  'logo-linkedin': 'linkedin',

  // Misc
  'eye': 'eye',
  'eye-outline': 'eye',
  'eye-off': 'eye-off',
  'eye-off-outline': 'eye-off',
  'link': 'link',
  'link-outline': 'link',
  'attach': 'attach',
  'attach-outline': 'attach',
  'wifi': 'wifi',
  'wifi-outline': 'wifi',
  'cloud-offline': 'wifi-off',
  'cloud-offline-outline': 'wifi-off',
  'power': 'power',
  'power-outline': 'power',
  'log-out': 'log-out',
  'log-out-outline': 'log-out',
  'log-in': 'log-in',
  'log-in-outline': 'log-in',
  'swap-horizontal': 'swap',
  'swap-horizontal-outline': 'swap',
  'swap-vertical': 'swap',
  'swap-vertical-outline': 'swap',
  'sync': 'sync',
  'sync-outline': 'sync',
  'flash': 'flash',
  'flash-outline': 'flash',
  'flashlight': 'flash',
  'flashlight-outline': 'flash',
  'color-palette': 'color-palette',
  'color-palette-outline': 'color-palette',
  'brush': 'brush',
  'brush-outline': 'brush',
  'cut': 'scissors',
  'cut-outline': 'scissors',
  'code': 'code',
  'code-outline': 'code',
  'receipt': 'file-text',
  'receipt-outline': 'file-text',
  'bar-chart': 'bar-chart',
  'bar-chart-outline': 'bar-chart',
  'stats-chart': 'bar-chart',
  'stats-chart-outline': 'bar-chart',
  'trending-up': 'trending-up',
  'trending-up-outline': 'trending-up',
  'trending-down': 'trending-down',
  'trending-down-outline': 'trending-down',
  'funnel': 'funnel',
  'funnel-outline': 'funnel',
  'home': 'home',
  'home-outline': 'home',
  'school': 'book',
  'school-outline': 'book',
  'book': 'book',
  'book-outline': 'book',
  'newspaper': 'file-text',
  'newspaper-outline': 'file-text',
  'pricetag': 'pricetags',
  'pricetag-outline': 'pricetags',
  'cart': 'shopping-cart',
  'cart-outline': 'shopping-cart',
  'bag': 'shopping-bag',
  'bag-outline': 'shopping-bag',
  'ban': 'slash',
  'ban-outline': 'slash',
  'hand-left': 'person-done',
  'hand-left-outline': 'person-done',
  'hand-right': 'person-done',
  'hand-right-outline': 'person-done',
  'thumbs-up': 'checkmark-circle-2',
  'thumbs-up-outline': 'checkmark-circle-2',
  'thumbs-down': 'close-circle',
  'thumbs-down-outline': 'close-circle',
  'happy': 'smiling-face',
  'happy-outline': 'smiling-face',
  'sad': 'smiling-face',
  'sad-outline': 'smiling-face',
  'sparkles': 'star',
  'sparkles-outline': 'star',

  // Lifestyle-specific (used in LifestyleStep, MatchProposalScreen, etc.)
  'wine': 'droplet',
  'wine-outline': 'droplet',
  'leaf': 'activity',
  'leaf-outline': 'activity',
  'flame': 'flash',
  'flame-outline': 'flash',
  'fitness': 'activity',
  'fitness-outline': 'activity',
  'medical': 'plus-square',
  'medical-outline': 'plus-square',
  'resize': 'maximize',
  'resize-outline': 'maximize',
  'diamond': 'award',
  'diamond-outline': 'award',
  'pulse': 'activity',
  'pulse-outline': 'activity',
  'bed': 'moon',
  'bed-outline': 'moon',
  'cafe': 'coffee',
  'cafe-outline': 'coffee',
  'restaurant': 'shopping-bag',
  'restaurant-outline': 'shopping-bag',
  'bicycle': 'activity',
  'bicycle-outline': 'activity',
  'car': 'car',
  'car-outline': 'car',
  'airplane': 'navigation-2',
  'airplane-outline': 'navigation-2',
  'earth': 'globe',
  'earth-outline': 'globe',
  'construct': 'settings-2',
  'construct-outline': 'settings-2',
  'bulb': 'bulb',
  'bulb-outline': 'bulb',
  'extension-puzzle': 'cube',
  'extension-puzzle-outline': 'cube',
  'color-wand': 'color-picker',
  'color-wand-outline': 'color-picker',
  'at': 'at',
  'at-outline': 'at',
  'text': 'text',
  'text-outline': 'text',
  'chatbox': 'message-square',
  'chatbox-outline': 'message-square',

  // Explicit fill variants
  'enter': 'log-in',
  'enter-outline': 'log-in',
  'exit': 'log-out',
  'exit-outline': 'log-out',
};

// Find all files with Ionicons
const result = execSync(
  `grep -rl "Ionicons" src/ --include="*.tsx" --include="*.ts"`,
  { cwd: path.join(__dirname, '..'), encoding: 'utf-8' }
).trim().split('\n').filter(Boolean);

console.log(`Found ${result.length} files with Ionicons\n`);

let totalReplacements = 0;
const unmappedIcons = new Set();

result.forEach(relPath => {
  const filePath = path.join(__dirname, '..', relPath);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  let fileReplacements = 0;

  // Skip types/guides.ts — it's just a type definition referencing Ionicons glyph map
  if (relPath.includes('types/guides.ts')) {
    // Replace type reference
    content = content.replace(
      /keyof typeof Ionicons\.glyphMap/g,
      'string'
    );
    content = content.replace(
      /import\s*\{[^}]*Ionicons[^}]*\}\s*from\s*['"]@expo\/vector-icons['"];?\n?/g,
      ''
    );
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`  ${relPath}: fixed type reference`);
    }
    return;
  }

  // Replace import statement
  // Handle various import patterns
  content = content.replace(
    /import\s*\{[^}]*Ionicons[^}]*\}\s*from\s*['"]@expo\/vector-icons['"];?\n?/g,
    (match) => {
      // Check if EvaIcon is already imported
      if (content.includes("from '../components/icons'") ||
          content.includes("from '../../components/icons'") ||
          content.includes("from '../../../components/icons'")) {
        return ''; // Just remove the Ionicons import
      }
      return ''; // Remove, we'll add EvaIcon import separately
    }
  );

  // Determine the correct relative path for the icons import
  const depth = relPath.split('/').length - 2; // relative to src/
  let iconImportPath;
  if (relPath.startsWith('src/components/')) {
    const subDepth = relPath.replace('src/components/', '').split('/').length - 1;
    iconImportPath = '../'.repeat(subDepth) + 'icons';
  } else if (relPath.startsWith('src/screens/')) {
    const subDepth = relPath.replace('src/screens/', '').split('/').length - 1;
    iconImportPath = '../'.repeat(subDepth + 1) + 'components/icons';
  } else if (relPath.startsWith('src/')) {
    iconImportPath = '../components/icons';
  } else {
    iconImportPath = './components/icons';
  }

  // Add EvaIcon import if not already present and file uses icons
  if (!content.includes("import { EvaIcon") && !content.includes("import { EvaIcon,") &&
      !content.includes("from './EvaIcon'") && content.includes('Ionicons')) {
    // Find the last import statement to add after it
    const importMatch = content.match(/^import\s+.+$/gm);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      const importLine = `import { EvaIcon } from '${iconImportPath}';`;
      content = content.replace(lastImport, lastImport + '\n' + importLine);
    }
  }

  // Replace <Ionicons name="X" size={Y} color="Z" /> patterns
  // Handle various attribute orders and formats
  content = content.replace(
    /<Ionicons\s+([^/>]*?)\/>/gs,
    (match, attrs) => {
      let name = (attrs.match(/name=["']([^"']+)["']/)?.[1] || '').trim();
      const size = attrs.match(/size=\{?([^}\s"'/>]+)\}?/)?.[1] || '24';
      const color = attrs.match(/color=\{?["']?([^}"'\s/>]+)["']?\}?/)?.[1];
      const style = attrs.match(/style=(\{[^}]+\}|\{?\{[^}]+\}\}?)/)?.[0] || '';

      // Map Ionicon name to Eva name
      const evaName = ICON_MAP[name];
      if (!evaName) {
        unmappedIcons.add(name);
        // Keep original but with a comment
        return match;
      }

      fileReplacements++;

      // Determine variant
      const variant = name.endsWith('-outline') ? 'outline' : 'fill';

      let replacement = `<EvaIcon name="${evaName}" variant="${variant}" size={${size}}`;
      if (color) {
        replacement += ` color="${color}"`;
      }
      if (style) {
        replacement += ` ${style}`;
      }
      replacement += ' />';

      return replacement;
    }
  );

  // Also handle {Ionicons && ...} or Ionicons references in types
  content = content.replace(/Ionicons\.glyphMap/g, 'Record<string, number>');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    totalReplacements += fileReplacements;
    console.log(`  ${relPath}: ${fileReplacements} icon(s) replaced`);
  }
});

console.log(`\nTotal: ${totalReplacements} icons replaced across ${result.length} files`);

if (unmappedIcons.size > 0) {
  console.log(`\nUnmapped Ionicon names (kept as-is):`);
  unmappedIcons.forEach(n => console.log(`  - ${n}`));
}
