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
} from 'discord.js';
import { db } from '#dbManager';

class GreetResetCommand extends Command {
        constructor() {
                super({
                        name: 'greetreset',
                        description: 'Reset all greet settings for this server',
                        usage: 'greetreset',
                        cooldown: 5,
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'greetreset',
                                description: 'Reset all greet settings for this server',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                        },
                });
        }

        async execute({ ctx }) {
                const configs = await db.guild?.getGreetConfigs(ctx.guild.id);

                if (!configs?.length) {
                        const container = new ContainerBuilder().setAccentColor(0xffffff)
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('### Greet Reset'),
                                )
                                .addSeparatorComponents(
                                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                                )
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('There is no greet configuration set up for this server.'),
                                );
                        return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                }

                await db.guild?.clearGreetConfig(ctx.guild.id);

                const container = new ContainerBuilder().setAccentColor(0xffffff)
                        .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent('### Greet Reset'),
                        )
                        .addSeparatorComponents(
                                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                        )
                        .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent('All greet settings have been reset successfully.'),
                        );

                return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
}

export default new GreetResetCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */