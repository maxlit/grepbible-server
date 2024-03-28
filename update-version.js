// update-version.js
const fs = require('fs');
const packageJsonPath = './package.json';

// Get the version from GitLab CI environment variable or use a default
console.log('CI_COMMIT_TAG:', process.env.CI_COMMIT_TAG);
const version = process.env.CI_COMMIT_TAG || '0.0.0-dev';

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Update the version field
packageJson.version = version;

// Write package.json back to disk
const pkgContent = JSON.stringify(packageJson, null, 2) + '\n';
// output content to console
console.log("content of package.json:", pkgContent);
// same for the path:
console.log("path to package.json", packageJsonPath);

fs.writeFileSync(packageJsonPath, pkgContent);
