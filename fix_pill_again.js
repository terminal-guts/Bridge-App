const fs = require('fs');

let apv = fs.readFileSync('src/components/community/proposal/AbridgedProfileView.tsx', 'utf8');
apv = apv.replace(/const Pill = \(\{ label \}: \{ label: string \}\) => \(/g, "const Pill = ({ label, iconDef }: { label: string; iconDef?: any }) => (");
fs.writeFileSync('src/components/community/proposal/AbridgedProfileView.tsx', apv);

let mps = fs.readFileSync('src/screens/match/MatchProposalScreen.tsx', 'utf8');
mps = mps.replace(/const Tag: React\.FC<TagProps> = \(\{ label, isMutual, variant = 'primary' \}\)/g, "const Tag: React.FC<TagProps> = ({ label, iconDef, isMutual, variant = 'primary' })");
fs.writeFileSync('src/screens/match/MatchProposalScreen.tsx', mps);
