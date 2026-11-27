// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        PermissionFlagsBits,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        ApplicationCommandOptionType,
        ChannelType,
} from 'discord.js';
import { db } from '#dbManager';

const resolveChannel = async (ctx) => {
        if (ctx.isSlash) {
                return ctx.options.getChannel('channel') ?? ctx.channel;
        }

        const arg = ctx.args[0];
        if (arg) {
                const idMatch = arg.match(/^<#(\d+)>$/) || arg.match(/^(\d{17,20})$/);
                if (idMatch) {
                        return ctx.guild.channels.fetch(idMatch[1]).catch(() => null);
                }
        }

        return ctx.channel;
};

class SetJoinChannelCommand extends Command {
        constructor() {
                super({
                        name: 'setjoinchannel',
                        description: 'Set the channel where invite welcome messages are sent',
                        usage: 'setjoinchannel [#channel]',
                        cooldown: 5,
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        permissions: [PermissionFlagsBits.SendMessages],
                        enabledSlash: true,
                        slashData: {
                                name: 'setjoinchannel',
                                description: 'Set the channel where invite welcome messages are sent',
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.Channel,
                                                name: 'channel',
                                                description: 'Channel to use (defaults to current channel)',
                                                required: false,
                                                channel_types: [ChannelType.GuildText],
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const channel = await resolveChannel(ctx);

                if (!channel) {
                        return ctx.reply({ content: 'Could not find that channel.' });
                }

                await db.guild?.setJoinChannel(ctx.guild.id, channel.id);

                const now = new Date().toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                });

                const container = new ContainerBuilder().setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Onyx invite logger'),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `The Invites Channel Has Been Set To <#${channel.id}>!
All Invites Will Now Go There!`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# Today at ${now}`),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new SetJoinChannelCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */