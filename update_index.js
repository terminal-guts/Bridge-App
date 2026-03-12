const fs = require('fs');
let indexTs = fs.readFileSync('src/components/icons/index.ts', 'utf8');

if (!indexTs.includes('IconScoutIcon')) {
  indexTs += "\nexport * from './IconScoutIcon';\nexport * from './iconScoutRegistry';\n";
  fs.writeFileSync('src/components/icons/index.ts', indexTs);
}
