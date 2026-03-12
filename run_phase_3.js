const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{ts,tsx}');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Skip if not containing Ionicons
  if (!content.includes('Ionicons')) return;

  // Manual import replacement
  const depth = file.split('/').length - 2;
  const relativePath = '../'.repeat(depth) + 'components/icons';

  content = content.replace(/import \{? ?Ionicons ?\}? from ['"]@expo\/vector-icons\/?.*['"];/g, `import { EvaIcon } from '${relativePath}';`);

  // Replace components
  content = content.replace(/<Ionicons\s+name=["']([^"']+)["']/g, (match, iconName) => {
    let evaName = iconName;
    evaName = evaName.replace('-outline', '');
    evaName = evaName.replace('-sharp', '');

    // Explicit requested fixes included
    const mapping = {
      'chevron-back': 'chevron-left',
      'chevron-forward': 'chevron-right',
      'chevron-down': 'chevron-down',
      'chevron-up': 'chevron-up',
      'close': 'close',
      'search': 'search',
      'settings': 'settings-2',
      'person': 'person',
      'people': 'people',
      'heart': 'heart',
      'chatbubble': 'message-circle',
      'chatbubbles': 'message-circle',
      'chatbubble-ellipses': 'message-circle',
      'checkmark': 'checkmark',
      'checkmark-circle': 'checkmark-circle-2',
      'close-circle': 'close-circle',
      'add': 'plus',
      'remove': 'minus',
      'time': 'clock',
      'alert-circle': 'alert-circle',
      'information-circle': 'info',
      'help-circle': 'question-mark-circle',
      'star': 'star',
      'camera': 'camera',
      'image': 'image',
      'play': 'play-circle',
      'pause': 'pause-circle',
      'mic': 'mic',
      'trash': 'trash-2',
      'arrow-back': 'arrow-back',
      'arrow-forward': 'arrow-forward',
      'arrow-up': 'arrow-upward',
      'arrow-down': 'arrow-downward',
      'location': 'pin',
      'home': 'home',
      'calendar': 'calendar',
      'ellipsis-horizontal': 'more-horizontal',
      'ellipsis-vertical': 'more-vertical',
      'paper-plane': 'paper-plane',
      'copy': 'copy',
      'link': 'link-2',
      'share': 'share',
      'lock-closed': 'lock',
      'lock-open': 'unlock',
      'eye': 'eye',
      'eye-off': 'eye-off',
      'warning': 'alert-triangle',
      'refresh': 'refresh',
      'sync': 'sync',
      'flash': 'flash',
      'gift': 'gift',
      'shield-checkmark': 'shield',
      'shield-half': 'shield',
      'flame': 'flash',
      'ribbon': 'award',
      'trophy': 'award',
      'medal': 'award',
      'pulse': 'activity',
      'document-text': 'file-text',
      'notifications': 'bell',
      'wifi': 'wifi',
      // Explicit review feedback mappings:
      'cloud-offline': 'wifi-off',
      'bug': 'alert-triangle',
      'sparkles': 'star',
      'medical': 'plus-square',
      'leaf': 'activity',
      'wine': 'droplet',
      'ban': 'slash',
      'hourglass': 'clock',
      'diamond': 'star',
      'fitness': 'activity',
      'resize': 'maximize',
    };

    if (mapping[evaName]) {
      evaName = mapping[evaName];
    }

    // Check if it originally had -outline
    if (iconName.includes('-outline') && !evaName.includes('outline')) {
      evaName = evaName + '-outline';
    }

    const exactMappings = {
      'information-circle': 'info',
      'checkmark-circle': 'checkmark-circle-2',
      'close-circle': 'close-circle',
      'close': 'close',
      'arrow-back': 'arrow-back',
      'chevron-back': 'chevron-left',
      'chevron-forward': 'chevron-right',
      'chevron-down': 'chevron-down',
      'chevron-up': 'chevron-up',
    };

    if (exactMappings[iconName]) {
      evaName = exactMappings[iconName];
    }

    return `<EvaIcon name="${evaName}"`;
  });

  content = content.replace(/<\/Ionicons>/g, '</EvaIcon>');
  content = content.replace(/<Ionicons\s+name=\{([^}]+)\}/g, '<EvaIcon name={$1}');

  // Dynamic Ionicons glyphMap types
  content = content.replace(/keyof typeof Ionicons\.glyphMap/g, "string");

  fs.writeFileSync(file, content);
});
