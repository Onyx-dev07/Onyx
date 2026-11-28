// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require('discord.js');
const emojis = require('../../../emojis.json');
const autobumpDb = require('../../../data/autobump');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} You need **Manage Server** permission!`)
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        const config = await autobumpDb.getConfig(guild.id);

        if (!config) {
            const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} No autobump configuration to reset!`)
                );
            return interactionOrMessage.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true
            });
        }

        
        const client = interactionOrMessage.client;
        if (client.autobumpTimers?.has(guild.id)) {
            clearInterval(client.autobumpTimers.get(guild.id));
            client.autobumpTimers.delete(guild.id);
        }

        
        await autobumpDb.deleteConfig(guild.id);

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${emojis.success} Autobump configuration has been **reset**.`)
            );

        return interactionOrMessage.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
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