// update-version.js
const fs = require('fs');
const packageJsonPath = './package.json';

// Get the version from GitLab CI environment variable or use a default
const version = process.env.CI_COMMIT_TAG || '0.0.0-dev';

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Update the version field
packageJson.version = version;

// Write package.json back to disk
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
