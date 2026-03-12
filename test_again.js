const fs = require('fs');
let fc = fs.readFileSync('src/components/ui/FriendCard.tsx', 'utf8');
fc = fc.replace(/import \{ EvaIcon \} from '\.\.\/icons';/, "import { EvaIcon } from '../icons';\nimport { FireIcon } from '../icons/Icons';");
fs.writeFileSync('src/components/ui/FriendCard.tsx', fc);

let mps = fs.readFileSync('src/screens/match/MatchProposalScreen.tsx', 'utf8');
mps = mps.replace(/interface TagProps \{/g, "interface TagProps { iconDef?: any;");
fs.writeFileSync('src/screens/match/MatchProposalScreen.tsx', mps);
