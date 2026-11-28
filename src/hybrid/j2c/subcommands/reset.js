// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const { J2CConfig } = require('../../../data/models');

module.exports = {
    name: 'reset',
    description: 'Reset the J2C configuration',

    async execute(interactionOrMessage, args = []) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;

        if (!member.permissions.has('Administrator')) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('You need Administrator permission to use this command.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        await J2CConfig.destroy({ where: { guildId: guild.id } });

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('**Success**')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('J2C configuration has been reset.')
            );

        await interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
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