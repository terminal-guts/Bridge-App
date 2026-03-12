const fs = require('fs');
let friendCard = fs.readFileSync('src/components/ui/FriendCard.tsx', 'utf8');

if (!friendCard.includes('FireIcon')) {
  friendCard = friendCard.replace("import { EvaIcon } from '../icons';", "import { EvaIcon } from '../icons';\nimport { FireIcon } from '../icons/Icons';");
}

// 🔥 streak emojis (5 instances): Replace with FireIcon from Icons.tsx
friendCard = friendCard.replace(/🔥/g, ''); // Handled manually below

friendCard = friendCard.replace(
  /<StyledText style=\{styles\.streakEmoji\}>\{streakDisplay\.emoji\}<\/StyledText>/,
  '<FireIcon size={14} color="#F97316" />'
);

friendCard = friendCard.replace(/'👑'/g, "'award'");
friendCard = friendCard.replace(/'💎'/g, "'star'");
friendCard = friendCard.replace(/'💫'/g, "'star-outline'");
friendCard = friendCard.replace(/'✨'/g, "'star-outline'");

friendCard = friendCard.replace(
  /<StyledText style=\{styles\.streakSuffix\}>\{streakDisplay\.suffix\}<\/StyledText>/,
  '<EvaIcon name={streakDisplay.suffix as any} size={14} color="#F97316" style={{ marginLeft: 2 }} />'
);

fs.writeFileSync('src/components/ui/FriendCard.tsx', friendCard);
