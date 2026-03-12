const fs = require('fs');

let mps = fs.readFileSync('src/screens/match/MatchProposalScreen.tsx', 'utf8');
mps = mps.replace(/interface TagProps \{([\s\S]*?)label: string;\n([\s\S]*?)\}/, "interface TagProps { label: string; iconDef?: any; \n $2}");
// let's just make it simple if it didn't match:
if (!mps.includes("iconDef?: any;")) {
  mps = mps.replace("interface TagProps {", "interface TagProps {\n  iconDef?: any;");
}
fs.writeFileSync('src/screens/match/MatchProposalScreen.tsx', mps);

let fc = fs.readFileSync('src/components/ui/FriendCard.tsx', 'utf8');
if (!fc.includes("import { FireIcon }")) {
  fc = fc.replace("import { EvaIcon } from '../icons';", "import { EvaIcon } from '../icons';\nimport { FireIcon } from '../icons/Icons';");
}
fs.writeFileSync('src/components/ui/FriendCard.tsx', fc);
