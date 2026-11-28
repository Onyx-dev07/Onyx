// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { MessageFlags, SlashCommandBuilder } = require('discord.js');

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

function ephemeral(response) {
        return { ...response, flags: response.flags | MessageFlags.Ephemeral };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set yourself as AFK (reason optional)')
        .addStringOption(option =>
                option.setName('reason')
                        .setDescription('Why you are AFK')
                        .setRequired(false)),

    async execute(interaction) {
        const reason = normalizeReason(interaction.options.getString('reason'));

        if (isInvalidReason(reason)) {
                return interaction.reply(ephemeral(invalidReasonResponse()));
        }

        const existingAFK = await findAfk(interaction.guildId, interaction.user.id);
        if (existingAFK) {
                return interaction.reply(ephemeral(alreadyAfkResponse(existingAFK)));
        }

        const savedReason = await setAfk(interaction.guildId, interaction.user.id, reason);
        return interaction.reply(successResponse(savedReason || DEFAULT_REASON));
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
