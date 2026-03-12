const fs = require('fs');

// 1. ProposalCard karmaPoints
let pc = fs.readFileSync('src/components/community/proposal/ProposalCard.tsx', 'utf8');
pc = pc.replace(/karmaPoints/g, 'karma_points');
fs.writeFileSync('src/components/community/proposal/ProposalCard.tsx', pc);

// 2. ProfileScreen karmaPoints
let ps = fs.readFileSync('src/screens/main/ProfileScreen.tsx', 'utf8');
ps = ps.replace(/karmaPoints/g, 'karma_points');
fs.writeFileSync('src/screens/main/ProfileScreen.tsx', ps);

// 3. FriendCard FireIcon
let fc = fs.readFileSync('src/components/ui/FriendCard.tsx', 'utf8');
if (!fc.includes('import { FireIcon }')) {
    fc = fc.replace(/import \{ EvaIcon \} from '\.\.\/icons';/, "import { EvaIcon } from '../icons';\nimport { FireIcon } from '../icons/Icons';");
    fs.writeFileSync('src/components/ui/FriendCard.tsx', fc);
}

// 4. ContactInviteScreen Duplicate EvaIcon
let cis = fs.readFileSync('src/screens/friends/ContactInviteScreen.tsx', 'utf8');
cis = cis.replace(/import \{ EvaIcon \} from '\.\.\/\.\.\/components\/icons';\nimport \{ EvaIcon \} from '\.\.\/\.\.\/components\/icons';/, "import { EvaIcon } from '../../components/icons';");
fs.writeFileSync('src/screens/friends/ContactInviteScreen.tsx', cis);

// 5. AddFriendsStep Duplicate EvaIcon
let afs = fs.readFileSync('src/screens/onboarding/steps/AddFriendsStep.tsx', 'utf8');
afs = afs.replace(/import \{ EvaIcon \} from '\.\.\/\.\.\/\.\.\/components\/icons';\nimport \{ EvaIcon \} from '\.\.\/\.\.\/\.\.\/components\/icons';/, "import { EvaIcon } from '../../../components/icons';");
fs.writeFileSync('src/screens/onboarding/steps/AddFriendsStep.tsx', afs);

// 6. emojiMaps style prop to FireIcon
let em = fs.readFileSync('src/utils/emojiMaps.tsx', 'utf8');
em = em.replace(/<FireIcon size=\{size\} color=\{iconDef\.color \|\| color\} style=\{style\} \/>/g, "<FireIcon size={size} color={iconDef.color || color} />");
fs.writeFileSync('src/utils/emojiMaps.tsx', em);

// 7. AbridgedProfileView Pill Props missing iconDef?: any
let apv = fs.readFileSync('src/components/community/proposal/AbridgedProfileView.tsx', 'utf8');
apv = apv.replace(/const Pill: React\.FC<\{ label: string; iconDef\?: any \}> = \(\{ label \}\) => \(/g, "const Pill: React.FC<{ label: string, iconDef?: any }> = ({ label, iconDef }) => (");
// Also just search and replace the interface if it still fails
apv = apv.replace(/const Pill: React\.FC<\{ label: string \}>/g, "const Pill: React.FC<{ label: string, iconDef?: any }>");
fs.writeFileSync('src/components/community/proposal/AbridgedProfileView.tsx', apv);

// 8. MatchProposalScreen TagProps missing iconDef?: any
let mps = fs.readFileSync('src/screens/match/MatchProposalScreen.tsx', 'utf8');
mps = mps.replace(/interface TagProps \{ label: string;/g, "interface TagProps { label: string; iconDef?: any;");
fs.writeFileSync('src/screens/match/MatchProposalScreen.tsx', mps);
