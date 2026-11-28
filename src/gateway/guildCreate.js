// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require('discord.js');
const config = require('../config');
const botLogger = require('../lib/botLogger');

module.exports = {
    name: 'guildCreate',

    async execute(guild, client) {
        botLogger.logGuildJoin(guild, client).catch(() => {});

        try {
            const owner = await guild.fetchOwner();
            if (!owner) return;

            const container = new ContainerBuilder()
                .setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Thanks** for adding **${client.user.username}** to **${guild.name}**`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `> You can report any issues at my **[Support Server](${config.SUPPORT_SERVER})**.\n> You can use \`/help\` or \`${config.PREFIX}help\` to explore everything I can do!!`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel('Support Server')
                            .setStyle(ButtonStyle.Link)
                            .setURL(config.SUPPORT_SERVER)
                    )
                );

            await owner.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error('guildCreate DM error:', error.message);
        }
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