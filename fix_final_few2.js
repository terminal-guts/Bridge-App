const fs = require('fs');

let fc = fs.readFileSync('src/components/ui/FriendCard.tsx', 'utf8');
if (!fc.includes('import { FireIcon }')) {
  fc = fc.replace(/import \{ EvaIcon \} from '\.\.\/icons';/, "import { EvaIcon } from '../icons';\nimport { FireIcon } from '../icons/Icons';");
  fs.writeFileSync('src/components/ui/FriendCard.tsx', fc);
}

let apv = fs.readFileSync('src/components/community/proposal/AbridgedProfileView.tsx', 'utf8');
apv = apv.replace(/const Pill: React\.FC<\{ label: string \}> = \(\{ label \}\) => \(/g, "const Pill: React.FC<{ label: string; iconDef?: any }> = ({ label, iconDef }) => (");
fs.writeFileSync('src/components/community/proposal/AbridgedProfileView.tsx', apv);

let mps = fs.readFileSync('src/screens/match/MatchProposalScreen.tsx', 'utf8');
mps = mps.replace(/interface TagProps \{\s*label: string;\s*isMutual\?: boolean;/g, "interface TagProps { label: string; iconDef?: any; isMutual?: boolean;");
fs.writeFileSync('src/screens/match/MatchProposalScreen.tsx', mps);
