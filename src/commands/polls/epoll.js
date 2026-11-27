// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ButtonStyle,
        ActionRowBuilder,
        ButtonBuilder,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        ApplicationCommandOptionType,
        PermissionFlagsBits,
} from 'discord.js';
import { disableComponents, logger } from '#utils';

const ACCENT = 0xffffff;

class EndPollCommand extends Command {
        constructor() {
                super({
                        name: 'epoll',
                        description: 'Ends an active poll',
                        usage: 'epoll <messageID>',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['epoll 1150000000000000000'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        permissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'epoll',
                                description: 'Ends an active poll',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                name: 'message_id',
                                                description: 'The ID of the message containing the poll',
                                                type: ApplicationCommandOptionType.String,
                                                required: true,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const messageId = ctx.isSlash ? ctx.options.getString('message_id') : ctx.args[0];

                let pollMessage;
                try {
                        pollMessage = await ctx.channel.messages.fetch(messageId);
                } catch {
                        return ctx.reply({
                                components: [
                                        this._buildInfo(
                                                'Message Not Found',
                                                'Could not find a message with that ID in this channel.',
                                        ),
                                ],
                                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                        });
                }

                if (!pollMessage.poll) {
                        return ctx.reply({
                                components: [
                                        this._buildInfo(
                                                'No Poll Found',
                                                'That message does not contain a poll.',
                                        ),
                                ],
                                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                        });
                }

                if (pollMessage.poll.resultsFinalized) {
                        return ctx.reply({
                                components: [
                                        this._buildInfo(
                                                'Poll Already Ended',
                                                'This poll has already been finalized.',
                                        ),
                                ],
                                flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                        });
                }

                const confirmContainer = new ContainerBuilder().setAccentColor(ACCENT);

                confirmContainer.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `### End Poll
Are you sure you want to end this poll?

> **${pollMessage.poll.question.text}**

-# This action cannot be undone.`,
                        ),
                );

                confirmContainer.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                confirmContainer.addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                        .setCustomId('epoll_confirm')
                                        .setLabel('End Poll')
                                        .setStyle(ButtonStyle.Danger),
                                new ButtonBuilder()
                                        .setCustomId('epoll_cancel')
                                        .setLabel('Cancel')
                                        .setStyle(ButtonStyle.Secondary),
                        ),
                );

                const message = await ctx.reply({
                        components: [confirmContainer],
                        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                        fetchReply: true,
                });

                const collector = message.createMessageComponentCollector({
                        time: 30_000,
                        filter: (i) => i.user.id === ctx.user.id,
                        max: 1,
                });

                collector.on('collect', async (interaction) => {
                        try {
                                await interaction.deferUpdate();

                                if (interaction.customId === 'epoll_confirm') {
                                        await pollMessage.poll.end();

                                        const done = new ContainerBuilder().setAccentColor(ACCENT);
                                        done.addTextDisplayComponents(
                                                new TextDisplayBuilder().setContent(
                                                        `### Poll Ended
The poll **"${pollMessage.poll.question.text}"** has been successfully ended.`,
                                                ),
                                        );
                                        await message.edit({ components: [done] });
                                } else {
                                        const done = new ContainerBuilder().setAccentColor(ACCENT);
                                        done.addTextDisplayComponents(
                                                new TextDisplayBuilder().setContent(
                                                        `### Cancelled
The poll was not ended.`,
                                                ),
                                        );
                                        await message.edit({ components: [done] });
                                }
                        } catch (err) {
                                logger.error('EndPoll', 'Interaction error', err);
                        }
                });

                collector.on('end', async (_, reason) => {
                        if (reason === 'limit') return;
                        try {
                                await disableComponents(message);
                        } catch {}
                });
        }

        _buildInfo(title, description) {
                const container = new ContainerBuilder().setAccentColor(ACCENT);
                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${title}
${description}`),
                );
                return container;
        }
}

export default new EndPollCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */