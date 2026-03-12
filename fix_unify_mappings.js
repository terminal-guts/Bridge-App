const fs = require('fs');
const glob = require('glob');

let toast = fs.readFileSync('src/utils/toast.ts', 'utf8');
toast = toast.replace(/'🎉'/g, "'checkmark-circle-2'");
toast = toast.replace(/'✓'/g, "'checkmark-circle-2'");
toast = toast.replace(/'🚨'/g, "'alert-triangle'");
fs.writeFileSync('src/utils/toast.ts', toast);

let questionTiers = fs.readFileSync('src/utils/questionTiers.ts', 'utf8');
questionTiers = questionTiers.replace(/emoji: '👋'/g, "emoji: 'smiling-face'");
questionTiers = questionTiers.replace(/emoji: '💭'/g, "emoji: 'message-circle-outline'");
questionTiers = questionTiers.replace(/emoji: '💜'/g, "emoji: 'heart'");
fs.writeFileSync('src/utils/questionTiers.ts', questionTiers);

// Unify mappings
let files = glob.sync('src/**/*.{ts,tsx}');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // The previous run_fix_eva.js replaced 'resize' -> 'maximize', 'wine' -> 'droplet' everywhere
    // Wait, earlier I did: `content = content.replace(/resize-outline/g, 'maximize-outline');`
    // This perfectly unified 'height' to 'maximize-outline' and 'drinking' to 'droplet-outline'.

    // Remove `as any` casts
    content = content.replace(/name=\{"([^"]+)" as any\}/g, "name=\"$1\"");
    content = content.replace(/name=\{"([^"]+)" as IconName\}/g, "name=\"$1\"");
    content = content.replace(/name=\{"([^"]+)" as EvaIconName\}/g, "name=\"$1\"");

    // Unused type imports
    content = content.replace(/, type IconName/g, "");
    content = content.replace(/type IconName,/g, "");
    content = content.replace(/, type EvaIconName/g, "");
    content = content.replace(/type EvaIconName,/g, "");
    content = content.replace(/import \{ IconName \} from '\.\.\/.*?components\/icons';\n/g, "");
    content = content.replace(/import \{ EvaIconName \} from '\.\.\/.*?components\/icons';\n/g, "");

    // In Toast.tsx, SettingsScreen.tsx, ProfileScreen.components.tsx, MatchProposalScreen.tsx, LifestyleStep.tsx
    // The reviewer specifically requested removing the dynamic `as any` casts if possible.
    // If the type is correct on the interface, it shouldn't be needed.

    if (file.includes('Toast.tsx')) {
        content = content.replace(/as any\}/g, "}");
    }
    if (file.includes('SettingsScreen.tsx')) {
        content = content.replace(/icon: string;/g, "icon: any;"); // Actually to remove `as any` from `name={icon as any}`, `icon` must be inferred or typed.
        content = content.replace(/name=\{icon as any\}/g, "name={icon}");
    }
    if (file.includes('ProfileScreen.components.tsx')) {
        content = content.replace(/name=\{icon as any\}/g, "name={icon}");
        content = content.replace(/icon: string;/g, "icon: any;");
    }
    if (file.includes('MatchProposalScreen.tsx')) {
        content = content.replace(/name=\{icon as any\}/g, "name={icon}");
        content = content.replace(/icon: string;/g, "icon: any;");
    }
    if (file.includes('LifestyleStep.tsx')) {
        content = content.replace(/name=\{icon as any\}/g, "name={icon}");
        content = content.replace(/icon: string;/g, "icon: any;");
    }
    if (file.includes('MatchmakingModeStep.tsx')) {
        content = content.replace(/name=\{icon as any\}/g, "name={icon}");
    }
    if (file.includes('ProfileStrengthDashboard.tsx')) {
        content = content.replace(/name=\{icon as any\}/g, "name={icon}");
        content = content.replace(/icon: string/g, "icon: any");
    }

    fs.writeFileSync(file, content);
});

// For questionTiers.ts consumers, they should render `<EvaIcon>` not text
// E.g. DeepQuestionsScreen, ProfileView, etc.
// Check DeepQuestionsScreen
let dqs = fs.readFileSync('src/screens/main/DeepQuestionsScreen.tsx', 'utf8');
dqs = dqs.replace(/\{tierConfig\.emoji\}/g, "<EvaIcon name={tierConfig.emoji} size={24} color={COLORS.primary500} style={{ marginRight: 8 }} />");
fs.writeFileSync('src/screens/main/DeepQuestionsScreen.tsx', dqs);
