const fs = require('fs');

let mps = fs.readFileSync('src/screens/match/MatchProposalScreen.tsx', 'utf8');

mps = mps.replace(
  /const Tag: React\.FC<\{ label: string; variant\?: 'default' \| 'primary' \| 'success'; isMutual\?: boolean \}> = \(\{ label, variant = 'default', isMutual = false \}\) => \{/g,
  "const Tag: React.FC<{ label: string; iconDef?: any; variant?: 'default' | 'primary' | 'success'; isMutual?: boolean }> = ({ label, iconDef, variant = 'default', isMutual = false }) => {"
);

mps = mps.replace(
  /<Body className="text-sm font-medium ml-1\.5" style={{ color: textColor }}>\s*\{label\}\s*<\/Body>/,
  '<Body className="text-sm font-medium ml-1.5 flex-row items-center" style={{ color: textColor }}>{iconDef && <RenderIcon iconDef={iconDef} size={14} color={textColor} style={{ marginRight: 4 }} />}{label}</Body>'
);

fs.writeFileSync('src/screens/match/MatchProposalScreen.tsx', mps);
