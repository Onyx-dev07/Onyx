// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        version as djsVersion,
} from 'discord.js';
import { config } from '#config';

class BotInfoCommand extends Command {
        constructor() {
                super({
                        name: 'botinfo',
                        description: 'Displays the information about the bot',
                        usage: 'botinfo',
                        aliases: ['bi'],
                        cooldown: 10,
                        enabledSlash: true,
                        slashData: {
                                name: 'botinfo',
                                description: 'Displays the information about the bot',
                        },
                });
        }

        async execute({ ctx }) {
                const totalServers = ctx.client.guilds.cache.size.toLocaleString('en-US');
                const totalUsers = ctx.client.guilds.cache
                        .reduce((acc, g) => acc + g.memberCount, 0)
                        .toLocaleString('en-US');

                const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${config.clientId}&permissions=268823806&scope=bot%20applications.commands`;
                const supportUrl = config.links.supportServer;

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**Bot info**
**These are the stats of ${ctx.client.user.username}'s cluster and not of the whole bot**`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**Created by :** Onyx
` +
                                `**Version code :** V.1.0
` +
                                `**Discord.js version :** ${djsVersion}
` +
                                `**Total servers :** ${totalServers}
` +
                                `**Serving total :** ${totalUsers} members
` +
                                `**Bot created on :** ${ctx.client.user.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**Important links**
**[Invite me](${inviteUrl})** **|** **[Support Server](${supportUrl})**`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `-# Requested by - ${ctx.author.username}`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new BotInfoCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */