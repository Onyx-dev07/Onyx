// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { SlashCommandBuilder } = require('discord.js');
const { buildPingCard } = require('../../../lib/pingCard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency and service health'),

    async execute(interaction) {
        await interaction.deferReply();

        const roundtripMs = Date.now() - interaction.createdTimestamp;
        const reply = await buildPingCard(interaction.client, roundtripMs);

        await interaction.editReply(reply);
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
