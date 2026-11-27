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

class DisableGreetCommand extends Command {
        constructor() {
                super({
                        name: 'disablegreet',
                        description: 'Remove a greet channel configuration',
                        usage: 'disablegreet [#channel]',
                        cooldown: 5,
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'disablegreet',
                                description: 'Remove a greet channel configuration',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.Channel,
                                                name: 'channel',
                                                description: 'Channel to remove from greet configs (defaults to current channel)',
                                                required: false,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                let channelId;

                if (ctx.isSlash) {
                        const ch = ctx.options.getChannel('channel') ?? ctx.channel;
                        channelId = ch.id;
                } else {
                        const arg = ctx.args[0];
                        if (arg) {
                                const idMatch = arg.match(/^<#(\d+)>$/) || arg.match(/^(\d{17,20})$/);
                                channelId = idMatch ? idMatch[1] : null;
                                if (!channelId) return ctx.reply({ content: 'Could not find that channel.' });
                        } else {
                                channelId = ctx.channel.id;
                        }
                }

                const configs = await db.guild?.getGreetConfigs(ctx.guild.id);

                if (!configs?.length) {
                        const container = new ContainerBuilder().setAccentColor(0xffffff)
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('**Greet message**'),
                                )
                                .addSeparatorComponents(
                                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                                )
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('There are no greet channels configured for this server.'),
                                );
                        return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                }

                const removed = await db.guild?.removeGreetConfigByChannel(ctx.guild.id, channelId);

                const now = new Date().toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                });

                const container = new ContainerBuilder().setAccentColor(0xffffff)
                        .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent('**Greet message**'),
                        )
                        .addSeparatorComponents(
                                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                        );

                if (removed) {
                        container.addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`Successfully removed <#${channelId}> from the greet channels.`),
                        );
                } else {
                        container.addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`<#${channelId}> is not configured as a greet channel.`),
                        );
                }

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# Today at ${now}`),
                );

                return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
}

export default new DisableGreetCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */