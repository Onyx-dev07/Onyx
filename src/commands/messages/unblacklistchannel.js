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

class UnblacklistChannelCommand extends Command {
        constructor() {
                super({
                        name: 'unblacklistchannel',
                        description: 'Remove a channel from the message counting blacklist',
                        usage: 'unblacklistchannel [#channel | channelID]',
                        aliases: ['unblchannel'],
                        cooldown: 5,
                        userPermissions: [PermissionFlagsBits.Administrator],
                        permissions: [PermissionFlagsBits.Administrator],
                        enabledSlash: true,
                        slashData: {
                                name: 'unblacklistchannel',
                                description: 'Remove a channel from the message counting blacklist',
                                defaultMemberPermissions: PermissionFlagsBits.Administrator,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.Channel,
                                                name: 'channel',
                                                description: 'Channel to unblacklist (defaults to current channel)',
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

                const removed = await db.guild?.removeMessageBlacklistedChannel(ctx.guild.id, channel.id);

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
                                removed
                                        ? `Unblacklisted <#${channel.id}> , I will count messages posted in that channel`
                                        : `<#${channel.id}> is not blacklisted`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new UnblacklistChannelCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */