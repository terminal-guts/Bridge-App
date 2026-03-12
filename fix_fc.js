const fs = require('fs');

let fc = fs.readFileSync('src/components/ui/FriendCard.tsx', 'utf8');
fc = fc.replace(/import \{ EvaIcon \} from '\.\.\/\.\.\/components\/icons';/, "import { EvaIcon } from '../../components/icons';\nimport { FireIcon } from '../../components/icons/Icons';");
fs.writeFileSync('src/components/ui/FriendCard.tsx', fc);
