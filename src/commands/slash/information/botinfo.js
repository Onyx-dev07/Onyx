// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { SlashCommandBuilder } = require('discord.js');

const { botInfoCard } = require('../../../lib/infoCards');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription("Shows the bot's info"),

    async execute(interaction) {
        const { client } = interaction;

        return interaction.reply(botInfoCard({
            client,
            avatarURL: client.user.displayAvatarURL({ size: 256 }),
        }));
    }
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */
