// Onyx Discord Bot
// Author: Onyx

// The redesigned Onyx bot uses MongoDB and creates/indexes its collections at
// runtime. The old PostgreSQL migration scripts are intentionally no-ops so
// existing deployment workflows can keep calling them safely.

const mode = process.argv[2] || 'apply';
const allowedModes = new Set([
        'apply',
        'check',
        'status',
        'keys',
        'backup:db',
        'restore:db',
        'backup:drill',
]);

if (!allowedModes.has(mode)) {
        console.error(`[Onyx] Unknown migration mode: ${mode}`);
        process.exit(1);
}

console.log(`[Onyx] migrate:${mode} — no SQL migration required (MongoDB redesign).`);
