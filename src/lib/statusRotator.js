// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { ActivityType } = require('discord.js');

const config = require('../config');

const DEFAULT_STATUSES = ['online', 'idle'];
const DEFAULT_INTERVAL_MS = 30_000;
const VALID_STATUSES = new Set(['online', 'idle', 'dnd', 'invisible']);

function normalizeStatuses(statuses) {
        const list = Array.isArray(statuses) && statuses.length ? statuses : DEFAULT_STATUSES;
        const valid = list.filter((status) => VALID_STATUSES.has(status));
        return valid.length ? valid : DEFAULT_STATUSES;
}

function normalizeInterval(intervalMs) {
        const value = Number(intervalMs);
        return Number.isFinite(value) && value > 0 ? value : DEFAULT_INTERVAL_MS;
}

function createStatusSequence(statuses = DEFAULT_STATUSES) {
        const list = normalizeStatuses(statuses);
        let index = 0;

        return function nextStatus() {
                const status = list[index % list.length];
                index += 1;
                return status;
        };
}

function startStatusRotation(client, options = {}) {
        const statuses = options.statuses ?? config.STATUS.statuses ?? DEFAULT_STATUSES;
        const activity = options.activity ?? config.STATUS.activity ?? '';
        const intervalMs = normalizeInterval(
                options.intervalMs ?? config.STATUS.rotateEveryMs ?? DEFAULT_INTERVAL_MS
        );
        const nextStatus = createStatusSequence(statuses);

        const apply = () => {
                client.user?.setPresence({
                        status: nextStatus(),
                        activities: activity
                                ? [{ name: activity, type: ActivityType.Listening }]
                                : [],
                });
        };

        apply();
        client.statusRotationTimer = setInterval(apply, intervalMs);
        return client.statusRotationTimer;
}

function stopStatusRotation(client) {
        if (!client) return;
        if (client.statusRotationTimer) {
                clearInterval(client.statusRotationTimer);
                client.statusRotationTimer = null;
        }
}

module.exports = {
        DEFAULT_STATUSES,
        DEFAULT_INTERVAL_MS,
        createStatusSequence,
        startStatusRotation,
        stopStatusRotation,
};
