// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const DEFAULT_COOLDOWN_MS = 3000;

const cooldowns = new Map();
const pendingReplies = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [key, expiresAt] of cooldowns) {
        if (now >= expiresAt) cooldowns.delete(key);
    }
}, 60000);

function checkCooldown(userId, commandName, cooldownMs = DEFAULT_COOLDOWN_MS) {
    const key = `${userId}:${commandName}`;
    const now = Date.now();
    const expiresAt = cooldowns.get(key);

    if (expiresAt && now < expiresAt) {
        const remaining = ((expiresAt - now) / 1000).toFixed(1);
        return { onCooldown: true, remaining };
    }

    cooldowns.set(key, now + cooldownMs);
    return { onCooldown: false };
}

function storePendingReply(userId, timeoutId, deleteFn) {
    const prev = pendingReplies.get(userId);
    if (prev) {
        clearTimeout(prev.timeoutId);
        prev.deleteFn().catch(() => {});
    }
    pendingReplies.set(userId, { timeoutId, deleteFn });
}

function clearPendingReply(userId) {
    pendingReplies.delete(userId);
}

module.exports = { checkCooldown, storePendingReply, clearPendingReply };

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */