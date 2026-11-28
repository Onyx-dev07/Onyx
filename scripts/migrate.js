// Onyx Discord Bot
// Author: Onyx

// Onyx keeps these commands as no-ops so existing deployment workflows can keep
// calling them safely. Database setup is handled during bot startup.

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

console.log(`[Onyx] migrate:${mode} — no manual migration required (handled at startup).`);
