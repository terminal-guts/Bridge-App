const fs = require('fs');

let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (pkg.dependencies && pkg.dependencies.glob) {
    if (!pkg.devDependencies) pkg.devDependencies = {};
    pkg.devDependencies.glob = pkg.dependencies.glob;
    delete pkg.dependencies.glob;
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
