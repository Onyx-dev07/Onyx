// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const emojis = require('../../../emojis.json');
const autopostDb = require('../../../data/autopost');
const { stopAllAutopostTimers } = require('../autopostTimer');

module.exports = {
    async execute(interactionOrMessage, args = []) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;

        if (!member.permissions.has('ManageGuild')) {
            const container = new ContainerBuilder().setAccentColor(0x00BFFF)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} You need **Manage Server** permission!`)
                );
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        const existing = await autopostDb.getAllForGuild(guild.id);

        if (!existing || existing.length === 0) {
            const container = new ContainerBuilder().setAccentColor(0x00BFFF)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${emojis.error} No autopost channels are set up in this server.`)
                );
            return interactionOrMessage.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral: true });
        }

        await autopostDb.deleteAllForGuild(guild.id);

        const client = interactionOrMessage.client;
        stopAllAutopostTimers(client, guild.id);

        const container = new ContainerBuilder().setAccentColor(0x00BFFF)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${emojis.success} Autopost Reset`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`All **${existing.length}** autopost channel(s) have been removed.`)
            );

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