// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        ApplicationCommandOptionType,
        PermissionFlagsBits,
} from 'discord.js';
import { db } from '#dbManager';

const resolveChannel = (ctx) => {
        if (ctx.isSlash) {
                return ctx.options.getChannel('channel') ?? ctx.channel;
        }

        const arg = ctx.args[0];
        if (arg) {
                const idMatch = arg.match(/^<#(\d+)>$/) || arg.match(/^(\d{17,20})$/);
                const channelId = idMatch ? idMatch[1] : null;
                if (channelId) {
                        return ctx.guild.channels.cache.get(channelId) ?? null;
                }
        }

        return ctx.channel;
};

class BlacklistChannelCommand extends Command {
        constructor() {
                super({
                        name: 'blacklistchannel',
                        description: 'Blacklist a channel from message counting',
                        usage: 'blacklistchannel [#channel | channelID]',
                        aliases: ['blchannel'],
                        cooldown: 5,
                        userPermissions: [PermissionFlagsBits.Administrator],
                        permissions: [PermissionFlagsBits.Administrator],
                        enabledSlash: true,
                        slashData: {
                                name: 'blacklistchannel',
                                description: 'Blacklist a channel from message counting',
                                defaultMemberPermissions: PermissionFlagsBits.Administrator,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.Channel,
                                                name: 'channel',
                                                description: 'Channel to blacklist (defaults to current channel)',
                                                required: false,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const channel = resolveChannel(ctx);

                if (!channel) {
                        return ctx.reply({ content: 'Could not find that channel.' });
                }

                const added = await db.guild?.addMessageBlacklistedChannel(ctx.guild.id, channel.id);

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Message blacklisted channels**`),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                added
                                        ? `Blacklisted <#${channel.id}> , I will not count messages posted in that channel`
                                        : `The channel is already blacklisted`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new BlacklistChannelCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */