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

function shouldUseSsl(url = configuredUrl()) {
    try {
        const parsed = new URL(url);
        return parsed.searchParams.get('sslmode') === 'require'
            || /neon\.tech|supabase/i.test(parsed.hostname);
    } catch {
        return /sslmode=require|neon\.tech|supabase/i.test(url);
    }
}

function sslOptions(url = configuredUrl()) {
    return shouldUseSsl(url)
        ? { require: true, rejectUnauthorized: false }
        : false;
}

function isConnectionError(error) {
    const message = String(error?.message || error?.original?.message || error || '');
    return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EHOSTUNREACH|ECONNABORTED|Connection terminated|connection manager was closed|timeout exceeded/i.test(message);
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
    shouldUseSsl,
    sslOptions,
    isConnectionError,
    isDatabaseAvailable,
    onUnavailable,
    disableDatabase,
};
