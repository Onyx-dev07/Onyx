// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
        SlashCommandBuilder,
        PermissionFlagsBits,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        MessageFlags,
} = require('discord.js');
const GuildPrefix = require('../../data/models/GuildPrefix');
const config = require('../../config');

module.exports = {
        data: new SlashCommandBuilder()
                .setName('deleteprefix')
                .setDescription('Reset this server prefix back to the default')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        name: 'deleteprefix',
        aliases: ['delprefix', 'resetprefix'],
        description: 'Reset this server prefix back to the default',

        async execute(interactionOrMessage) {
                const isSlash = interactionOrMessage.isCommand?.();
                const guildId = interactionOrMessage.guildId;

                if (!guildId) {
                        const container = new ContainerBuilder()
                                .setAccentColor(0x2b2d31)
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('This command can only be used in a server.'),
                                );

                        return interactionOrMessage.reply({
                                components: [container],
                                flags: MessageFlags.IsComponentsV2,
                                ephemeral: true,
                        });
                }

                try {
                        await GuildPrefix.deletePrefix(guildId);

                        const container = new ContainerBuilder()
                                .setAccentColor(0x2b2d31)
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('### Prefix Reset'),
                                )
                                .addSeparatorComponents(
                                        new SeparatorBuilder()
                                                .setSpacing(SeparatorSpacingSize.Small)
                                                .setDivider(true),
                                )
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                                `Server prefix is now: \`${config.PREFIX}\``,
                                        ),
                                );

                        return interactionOrMessage.reply({
                                components: [container],
                                flags: MessageFlags.IsComponentsV2,
                                ephemeral: isSlash,
                        });
                } catch (error) {
                        console.error('DeletePrefix Error:', error);

                        const container = new ContainerBuilder()
                                .setAccentColor(0x2b2d31)
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('Error resetting prefix. Please try again.'),
                                );

                        return interactionOrMessage.reply({
                                components: [container],
                                flags: MessageFlags.IsComponentsV2,
                                ephemeral: true,
                        });
                }
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
