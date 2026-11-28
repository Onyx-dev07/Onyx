// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
        DEFAULT_REASON,
        alreadyAfkResponse,
        findAfk,
        invalidReasonResponse,
        isInvalidReason,
        normalizeReason,
        setAfk,
        successResponse,
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

        const savedReason = await setAfk(message.guildId, message.author.id, reason);
        return message.reply(successResponse(savedReason || DEFAULT_REASON));
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
