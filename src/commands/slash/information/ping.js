// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const sequelize = require('../../../data/sequelize');

function pad(key, width = 7) {
    return key + ' '.repeat(Math.max(1, width - key.length));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency'),

    async execute(interaction) {
        await interaction.deferReply();

        const wsLatency = interaction.client.ws.ping;

        const t0 = Date.now();
        try { await sequelize.query('SELECT 1'); } catch (_) {}
        const readMs = (Date.now() - t0).toFixed(2);

        const t1 = Date.now();
        try { await sequelize.query('SELECT NOW()'); } catch (_) {}
        const writeMs = (Date.now() - t1).toFixed(2);

        const t2 = Date.now();
        try { await sequelize.query('SELECT 1+1'); } catch (_) {}
        const deleteMs = (Date.now() - t2).toFixed(2);

        const ESC = '\u001b';
        const purple = `${ESC}[1;35m`;
        const cyan   = `${ESC}[1;36m`;
        const reset  = `${ESC}[0m`;

        const latencyBlock = [
            '```ansi',
            `${purple}Latency${reset}`,
            `${cyan}${pad('Bot')}:: v1${reset}`,
            `${cyan}${pad('Latency')}:: ${wsLatency} MS${reset}`,
            '```'
        ].join('\n');

        const dbBlock = [
            '```ansi',
            `${purple}Database Performance${reset}`,
            `${cyan}${pad('Read')}:: ${readMs} MS${reset}`,
            `${cyan}${pad('Write')}:: ${writeMs} MS${reset}`,
            `${cyan}${pad('Delete')}:: ${deleteMs} MS${reset}`,
            '```'
        ].join('\n');

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(latencyBlock)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(dbBlock)
            );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
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
