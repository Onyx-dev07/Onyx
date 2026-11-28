// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
        alreadyAfkResponse,
        findAfk,
        invalidReasonResponse,
        isInvalidReason,
        normalizeReason,
        promptResponse,
        storePendingAfk,
} = require('../../../lib/afkService');

module.exports = {
    name: 'afk',
    description: 'Set yourself as AFK (reason optional)',

    async execute(message, args = []) {
        const reason = normalizeReason(args.join(' '));

        if (isInvalidReason(reason)) {
            return message.reply(invalidReasonResponse());
        }

        const existingAFK = await findAfk(message.guildId, message.author.id);
        if (existingAFK) {
            return message.reply(alreadyAfkResponse(existingAFK));
        }

        const guildId = message.guildId;
        const userId = message.author.id;

        storePendingAfk(guildId, userId, reason);
        return message.reply(promptResponse({ guildId, userId, reason }));
    },
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */
