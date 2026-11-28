// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const { AutoReact } = require('../../../data/models');
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');

module.exports = {
    name: 'reset',
    async execute(interactionOrMessage) {
        await AutoReact.destroy({ where: { guildId: interactionOrMessage.guildId } });

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### AutoReact · Reset'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('Successfully reset all autoreacts for this server.'));
        return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
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