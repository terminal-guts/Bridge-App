const fs = require('fs');
let file = 'src/components/community/CelebrationBanner.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('EvaIcon')) {
  content = content.replace(
    "import { styled } from 'nativewind';",
    "import { styled } from 'nativewind';\nimport { EvaIcon } from '../icons';"
  );
}

// 🎉 and 🌟 text emojis: Replace with icon components
content = content.replace(/🎉/g, '');
content = content.replace(/🌟/g, '');

content = content.replace(
  /<H3 style={{ color: COLORS\.primary800, textAlign: 'center', marginBottom: 4 }}>\s*\{title\}\s*<\/H3>/,
  '<H3 style={{ color: COLORS.primary800, textAlign: \'center\', marginBottom: 4, flexDirection: \'row\', alignItems: \'center\', justifyContent: \'center\' }}><EvaIcon name="star" size={20} color={COLORS.primary500} style={{ marginRight: 8 }} /> {title} <EvaIcon name="star" size={20} color={COLORS.primary500} style={{ marginLeft: 8 }} /></H3>'
);

fs.writeFileSync(file, content);
