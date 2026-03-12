const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{ts,tsx}');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    content = content.replace(/resize-outline/g, 'maximize-outline');

    // wine / wine-outline
    content = content.replace(/wine-outline/g, 'droplet-outline');
    content = content.replace(/"wine"/g, '"droplet"');
    content = content.replace(/'wine'/g, "'droplet'");

    content = content.replace(/ban-outline/g, 'slash-outline');
    content = content.replace(/medical-outline/g, 'plus-square-outline');
    content = content.replace(/hourglass-outline/g, 'clock-outline');

    // diamond -> star
    content = content.replace(/diamond-outline/g, 'star-outline');
    content = content.replace(/"diamond"/g, '"star"');
    content = content.replace(/'diamond'/g, "'star'");

    content = content.replace(/fitness-outline/g, 'activity-outline');

    // leaf / leaf-outline
    content = content.replace(/leaf-outline/g, 'activity-outline');
    content = content.replace(/"leaf"/g, '"activity-outline"');
    content = content.replace(/'leaf'/g, "'activity-outline'");

    // fire -> flash (except when explicitly using FireIcon)
    content = content.replace(/'fire'/g, "'flash'");
    content = content.replace(/"fire"/g, '"flash"');

    fs.writeFileSync(file, content);
});
