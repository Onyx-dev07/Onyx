// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        PermissionFlagsBits,
        ApplicationCommandOptionType,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
} from 'discord.js';
import { db } from '#dbManager';

class SetLeaveChannelCommand extends Command {
        constructor() {
                super({
                        name: 'setleavechannel',
                        description: 'Set the channel where member leave messages will be sent',
                        usage: 'setleavechannel [#channel]',
                        cooldown: 5,
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        permissions: [PermissionFlagsBits.SendMessages],
                        enabledSlash: true,
                        slashData: {
                                name: 'setleavechannel',
                                description: 'Set the channel where member leave messages will be sent',
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.Channel,
                                                name: 'channel',
                                                description: 'Channel to send leave messages to (defaults to current)',
                                                required: false,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                let channel;

                if (ctx.isSlash) {
                        channel = ctx.options.getChannel('channel') ?? ctx.channel;
                } else {
                        const arg = ctx.args[0];
                        if (arg) {
                                const idMatch = arg.match(/^<#(\d+)>$/) || arg.match(/^(\d{17,20})$/);
                                const channelId = idMatch ? idMatch[1] : null;
                                channel = channelId ? ctx.guild.channels.cache.get(channelId) : null;
                                if (!channel) return ctx.reply({ content: 'Could not find that channel.' });
                        } else {
                                channel = ctx.channel;
                        }
                }

                if (!channel?.isTextBased()) {
                        return ctx.reply({ content: 'Please provide a valid text channel.' });
                }

                await db.guild?.setLeaveChannel(ctx.guild.id, channel.id);

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
                                `Member leave channel has been set to <#${channel.id}>!
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

export default new SetLeaveChannelCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */