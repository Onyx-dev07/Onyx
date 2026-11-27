// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ButtonStyle,
        ButtonBuilder,
        ActionRowBuilder,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        PermissionFlagsBits,
} from 'discord.js';

class NukeCommand extends Command {
        constructor() {
                super({
                        name: 'nuke',
                        description: 'Nukes a TextChannel',
                        usage: 'nuke',
                        cooldown: 10,
                        shouldNotDefer: true,
                        permissions: [PermissionFlagsBits.ManageChannels],
                        userPermissions: [PermissionFlagsBits.ManageChannels],
                        enabledSlash: true,
                        slashData: {
                                name: 'nuke',
                                description: 'Nukes a TextChannel',
                                defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
                        },
                });
        }

        async execute({ ctx }) {
                const channel = ctx.channel;

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**Channel Nuke Warning**'),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `Do you really want to nuke this channel? Click on **Yes** button to proceed or click on **No** button to abort
` +
                                '-# This action cannot be reversed',
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                        .setCustomId('nuke_yes')
                                        .setLabel('Yes')
                                        .setStyle(ButtonStyle.Success),
                                new ButtonBuilder()
                                        .setCustomId('nuke_no')
                                        .setLabel('No')
                                        .setStyle(ButtonStyle.Danger),
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });

                const message = await ctx.fetchReply();

                const collector = message.createMessageComponentCollector({
                        time: 30_000,
                        max: 1,
                        filter: (i) => i.user.id === ctx.author.id,
                });

                collector.on('collect', async (interaction) => {
                        await interaction.deferUpdate().catch(() => {});

                        if (interaction.customId === 'nuke_yes') {
                                try {
                                        const position = channel.rawPosition;
                                        const newChannel = await channel.clone({ reason: `Channel nuked by ${ctx.author.username}` });
                                        await message.delete().catch(() => {});
                                        await channel.delete(`Channel nuked by ${ctx.author.username}`);
                                        await newChannel.setPosition(position).catch(() => {});
                                        await newChannel.send(`This channel was nuked by ${ctx.author.username}`);
                                } catch {
                                        await message.delete().catch(() => {});
                                }
                        } else {
                                await message.delete().catch(() => {});
                                await channel.send('Aborted the task').catch(() => {});
                        }
                });

                collector.on('end', (collected) => {
                        if (collected.size === 0) {
                                message.delete().catch(() => {});
                        }
                });
        }
}

export default new NukeCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */