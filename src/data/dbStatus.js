// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const config = require('../config');

let disabled = false;
let warningLogged = false;
const fallbackHandlers = [];

function configuredUrl() {
    return process.env.DATABASE_URL || config.DATABASE_URL || '';
}

function hasConfiguredDatabase() {
    return /^postgres(?:ql)?:\/\//i.test(configuredUrl());
}

function isDatabaseAvailable() {
    return hasConfiguredDatabase() && !disabled;
}

function onUnavailable(handler) {
    if (typeof handler !== 'function') return;
    fallbackHandlers.push(handler);
    if (!isDatabaseAvailable()) {
        try { handler(); } catch (_) {}
    }
}

function disableDatabase(error, source = 'database') {
    if (disabled) return false;
    disabled = true;

    if (!warningLogged) {
        warningLogged = true;
        const detail = error?.message ? `: ${error.message}` : '';
        console.error(`[database] ${source} unavailable — database-backed features are disabled until restart${detail}`);
    }

    for (const handler of fallbackHandlers) {
        try { handler(); } catch (_) {}
    }

    return false;
}

module.exports = {
    configuredUrl,
    hasConfiguredDatabase,
    isDatabaseAvailable,
    onUnavailable,
    disableDatabase,
};
