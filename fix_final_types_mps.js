const fs = require('fs');

let mps = fs.readFileSync('src/screens/match/MatchProposalScreen.tsx', 'utf8');

// interface TagProps { label: string; iconDef?: any; isMutual?: boolean; variant?: 'success' | 'warning' | 'primary'; }
// The error says: Property 'iconDef' does not exist on type 'IntrinsicAttributes & { label: string; variant?: "success" | "primary" | "default" | undefined; isMutual?: boolean | undefined; }'.
// Let's replace the Tag component definition entirely to fix this type issue once and for all:

const tagRegex = /const Tag: React\.FC<TagProps> = \(\{ label, iconDef, isMutual, variant = 'primary' \}\) => \{([\s\S]*?)<Body className="flex-row items-center text-sm font-medium ml-1\.5" style=\{\{ color: textColor \}\}>\{iconDef && <RenderIcon iconDef=\{iconDef\} size=\{14\} color=\{textColor\} style=\{\{ marginRight: 4 \}\} \/>\}\{label\}<\/Body>([\s\S]*?)\};/;

// Let's check how it's defined:
// interface TagProps {
//   label: string;
//   iconDef?: any;
//   isMutual?: boolean;
//   variant?: 'success' | 'warning' | 'primary';
// }

// If TagProps is defined correctly, why is it failing?
// Ah! MatchProposalScreen imports `Tag` from `../../components/ui`! No, wait... it might define its own `Tag` or use a different `Tag` component.
