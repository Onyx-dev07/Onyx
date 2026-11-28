// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const { AntinukeConfig } = require('../../../data/models');

module.exports = {
    name: 'disable',
    description: 'Disable the antinuke system',

    async execute(interactionOrMessage) {
        const member = interactionOrMessage.member;
        const guild = interactionOrMessage.guild;
        
        if (guild.ownerId !== member.id) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Only the **Server Owner** can disable antinuke.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        const config = await AntinukeConfig.findOne({ where: { guildId: guild.id } });
        
        if (!config || !config.enabled) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('### Not Enabled')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('Antinuke is not currently enabled on this server.')
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        await config.update({ enabled: false });

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('### Antinuke Disabled')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('Antinuke has been disabled. Your server is no longer protected from nuking attacks.')
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
        });
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