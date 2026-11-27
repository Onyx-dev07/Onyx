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

class GreetCommand extends Command {
        constructor() {
                super({
                        name: 'greet',
                        description: 'Set the channel where greet messages will be sent',
                        usage: 'greet [#channel]',
                        cooldown: 5,
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'greet',
                                description: 'Set the channel where greet messages will be sent',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.Channel,
                                                name: 'channel',
                                                description: 'Channel to send greet messages to (defaults to current)',
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

                const configs = await db.guild?.getGreetConfigs(ctx.guild.id);
                const existing = configs?.find((c) => c.channelId === channel.id);

                if (!existing && configs?.length >= 3) {
                        const container = new ContainerBuilder().setAccentColor(0xffffff)
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('**Greet message**'),
                                )
                                .addSeparatorComponents(
                                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                                )
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                                'You already have 3 greet channels configured, which is the maximum.\nUse `disablegreet` to remove one first.',
                                        ),
                                );
                        return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                }

                const defaultMessage = 'Welcome $member_mention to $guild_name! You are our $ordinal_member_count member.';
                const newConfig = {
                        channelId: channel.id,
                        type: 'simple',
                        message: existing?.message ?? defaultMessage,
                        title: existing?.title ?? null,
                        description: existing?.description ?? null,
                        color: existing?.color ?? null,
                        thumbnailUrl: existing?.thumbnailUrl ?? null,
                        imageUrl: existing?.imageUrl ?? null,
                        deleteAfter: existing?.deleteAfter ?? null,
                };

                if (existing) {
                        await db.guild?.removeGreetConfigByChannel(ctx.guild.id, channel.id);
                }
                await db.guild?.addGreetConfig(ctx.guild.id, newConfig);

                const container = new ContainerBuilder().setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**Greet message**'),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `Greet channel has been set to <#${channel.id}>.\nUse \`greetsetup\` to fully customise the message and style.`,
                        ),
                );

                await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
}

export default new GreetCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */
