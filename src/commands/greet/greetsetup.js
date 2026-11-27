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
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
} from 'discord.js';
import { db } from '#dbManager';

class GreetSetupCommand extends Command {
        constructor() {
                super({
                        name: 'greetsetup',
                        description: 'Set up greet messages for new members',
                        usage: 'greetsetup',
                        cooldown: 5,
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        shouldNotDefer: true,
                        slashData: {
                                name: 'greetsetup',
                                description: 'Set up greet messages for new members',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                        },
                });
        }

        async execute({ ctx }) {
                const userId = ctx.user.id;
                const guildId = ctx.guild.id;

                const configs = await db.guild?.getGreetConfigs(guildId);

                if (configs?.length >= 3) {
                        const container = new ContainerBuilder().setAccentColor(0xffffff)
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('### Maximum Greet Channels Reached'),
                                )
                                .addSeparatorComponents(
                                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                                )
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                                `You already have **3 greet channels** configured, which is the maximum.

` +
                                                'Use `disablegreet` to remove a channel, or `greetreset` to clear all settings.',
                                        ),
                                );
                        return ctx.reply({
                                components: [container],
                                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                        });
                }

                const buttonRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                                .setCustomId(`greet_setup_simple_${userId}`)
                                .setLabel('Simple')
                                .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                                .setCustomId(`greet_setup_container_${userId}`)
                                .setLabel('Container')
                                .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                                .setCustomId(`greet_cancel_${userId}`)
                                .setLabel('Cancel')
                                .setStyle(ButtonStyle.Danger),
                );

                const container = new ContainerBuilder().setAccentColor(0xffffff)
                        .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent('### Greet Setup'),
                        )
                        .addSeparatorComponents(
                                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                        )
                        .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                        `Choose the type of greet message you want to create:

` +
                                        `**Simple**
Send a plain text greet message. You can use variables to personalise it.

` +
                                        `**Container**
Send a greet message in a container format with a title, description, thumbnail, image, and colour.`,
                                ),
                        )
                        .addActionRowComponents(buttonRow);

                return ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new GreetSetupCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */