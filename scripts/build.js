// Onyx Discord Bot
// Author: Onyx

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const packageJson = require('../package.json');
const roots = [path.join(root, 'src'), path.join(root, 'scripts')];
const ignoredDirectories = new Set(['node_modules', 'logs', 'coverage']);

function collectJsFiles(directory, output) {
    if (!fs.existsSync(directory)) return;

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            if (!ignoredDirectories.has(entry.name)) collectJsFiles(fullPath, output);
            continue;
        }

        if (entry.isFile() && entry.name.endsWith('.js')) output.push(fullPath);
    }
}

const files = [];
for (const directory of roots) collectJsFiles(directory, files);

const mainFile = path.join(root, packageJson.main || 'src/client.js');
if (!fs.existsSync(mainFile)) {
    throw new Error(`Entry point not found: ${packageJson.main}`);
}

for (const file of files) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
}

console.log(`[Onyx] Build passed: ${files.length} JavaScript files syntax-checked; entry ${packageJson.main} found.`);
