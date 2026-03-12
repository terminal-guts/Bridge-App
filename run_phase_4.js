const fs = require('fs');
const glob = require('glob');

// 1. Modify Chip to support `iconDef`
let chip = fs.readFileSync('src/components/ui/Chip.tsx', 'utf8');
chip = chip.replace(
  "interface ChipProps {",
  "import { RenderIcon } from '../../utils/emojiMaps';\n\ninterface ChipProps {\n  iconDef?: any;"
);
chip = chip.replace(
  "const ChipComponent: React.FC<ChipProps> = ({",
  "const ChipComponent: React.FC<ChipProps> = ({\n  iconDef,"
);
const renderLabel = `
    <StyledText className={\`\${TEXT_SIZE_STYLES[size]} \${textStyles} flex-row items-center\`}>
      {iconDef && <RenderIcon iconDef={iconDef} size={size === 'sm' ? 12 : 14} style={{ marginRight: 4 }} />}
      {label}
    </StyledText>
`;
chip = chip.replace(
  /<StyledText className={\`\${TEXT_SIZE_STYLES\[size\]} \${textStyles}\`}>\s*\{label\}\s*<\/StyledText>/g,
  renderLabel
);
fs.writeFileSync('src/components/ui/Chip.tsx', chip);

// Modify SimpleChip
let simpleChip = fs.readFileSync('src/components/ui/SimpleChip.tsx', 'utf8');
simpleChip = simpleChip.replace(
  "interface SimpleChipProps {",
  "import { RenderIcon } from '../../utils/emojiMaps';\n\ninterface SimpleChipProps {\n  iconDef?: any;"
);
simpleChip = simpleChip.replace(
  "const SimpleChipComponent: React.FC<SimpleChipProps> = ({ label, selected, onPress }) => {",
  "const SimpleChipComponent: React.FC<SimpleChipProps> = ({ label, selected, onPress, iconDef }) => {"
);
const renderSimpleLabel = `
    <StyledText className={\`font-medium flex-row items-center \${selected ? 'text-white' : 'text-neutral-700'}\`}>
      {iconDef && <RenderIcon iconDef={iconDef} size={14} style={{ marginRight: 4 }} />}
      {label}
    </StyledText>
`;
simpleChip = simpleChip.replace(
  /<StyledText className={\`font-medium \${selected \? 'text-white' : 'text-neutral-700'}\`}>\s*\{label\}\s*<\/StyledText>/g,
  renderSimpleLabel
);
fs.writeFileSync('src/components/ui/SimpleChip.tsx', simpleChip);

// Replace usages in consumers
function replaceEmojiCalls(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/label={`\$\{valueEmoji\(([^)]+)\)\} \$\{\1\}`}/g, "label={$1} iconDef={getValueIconDef($1)}");
  content = content.replace(/label={`\$\{interestEmoji\(([^)]+)\)\} \$\{\1\}`}/g, "label={$1} iconDef={getInterestIconDef($1)}");
  content = content.replace(/\{valueEmoji\(([^)]+)\)\} \{(.+?)\}/g, "<RenderIcon iconDef={getValueIconDef($1)} size={14} color=\"#059669\" /> {$2}");
  content = content.replace(/\{interestEmoji\(([^)]+)\)\} \{(.+?)\}/g, "<RenderIcon iconDef={getInterestIconDef($1)} size={14} color=\"#d97706\" /> {$2}");

  if (content.includes('getValueIconDef') || content.includes('getInterestIconDef')) {
    if (!content.includes('getValueIconDef')) {
      content = content.replace(/import \{.*?valueEmoji.*?\} from '.*';/g, (match) => match.replace('valueEmoji', 'valueEmoji, getValueIconDef, RenderIcon'));
    }
  }

  const importStatementRegex = /import \{([^}]*?)\}\s*from\s*['"](\.\.\/)*utils\/emojiMaps['"]/;
  let match = content.match(importStatementRegex);
  if (match) {
    let imports = match[1].split(',').map(s => s.trim());
    if (content.includes('getValueIconDef') && !imports.includes('getValueIconDef')) imports.push('getValueIconDef');
    if (content.includes('getInterestIconDef') && !imports.includes('getInterestIconDef')) imports.push('getInterestIconDef');
    if (content.includes('RenderIcon') && !imports.includes('RenderIcon')) imports.push('RenderIcon');
    content = content.replace(importStatementRegex, `import { ${Array.from(new Set(imports)).join(', ')} } from '${match[0].split('from ')[1].replace(/['"]/g, '')}'`);
  }

  fs.writeFileSync(filePath, content);
}

replaceEmojiCalls('src/components/community/anchor/AnchorInfoSection.tsx');
replaceEmojiCalls('src/components/community/proposal/ProposalProfileView.tsx');
replaceEmojiCalls('src/components/community/proposal/AbridgedProfileView.tsx');
replaceEmojiCalls('src/components/profile/ProfileView.tsx');
replaceEmojiCalls('src/screens/main/ProfileScreen.components.tsx');
replaceEmojiCalls('src/screens/match/MatchProposalScreen.tsx');
replaceEmojiCalls('src/screens/match/MatchRevealScreen.tsx');
replaceEmojiCalls('src/screens/match/MatchDetailScreen.tsx');
replaceEmojiCalls('src/screens/match/ProfileMatchScreen.tsx');

// Modify Pill/Tag directly inline
let matchProposal = fs.readFileSync('src/screens/match/MatchProposalScreen.tsx', 'utf8');
matchProposal = matchProposal.replace(
  "interface TagProps { label: string; isMutual?: boolean; variant?: 'success' | 'warning' | 'primary'; }",
  "interface TagProps { label: string; iconDef?: any; isMutual?: boolean; variant?: 'success' | 'warning' | 'primary'; }"
);
matchProposal = matchProposal.replace(
  /const Tag: React\.FC<TagProps> = \(\{ label, isMutual, variant = 'primary' \}\) => \{([\s\S]*?)<Body className="text-sm font-medium ml-1\.5" style={{ color: textColor }}>\{label\}<\/Body>/,
  "const Tag: React.FC<TagProps> = ({ label, iconDef, isMutual, variant = 'primary' }) => {$1<Body className=\"flex-row items-center text-sm font-medium ml-1.5\" style={{ color: textColor }}>{iconDef && <RenderIcon iconDef={iconDef} size={14} color={textColor} style={{ marginRight: 4 }} />}{label}</Body>"
);
fs.writeFileSync('src/screens/match/MatchProposalScreen.tsx', matchProposal);

let abridged = fs.readFileSync('src/components/community/proposal/AbridgedProfileView.tsx', 'utf8');
abridged = abridged.replace(
  "const Pill: React.FC<{ label: string }> = ({ label }) => (",
  "const Pill: React.FC<{ label: string; iconDef?: any }> = ({ label, iconDef }) => ("
);
abridged = abridged.replace(
  /<Body className="text-sm font-medium" style={{ color: COLORS.primary800 }}>\s*\{label\}\s*<\/Body>/,
  '<Body className="text-sm font-medium flex-row items-center" style={{ color: COLORS.primary800 }}>{iconDef && <RenderIcon iconDef={iconDef} size={14} color={COLORS.primary800} style={{ marginRight: 4 }} />}{label}</Body>'
);
fs.writeFileSync('src/components/community/proposal/AbridgedProfileView.tsx', abridged);
