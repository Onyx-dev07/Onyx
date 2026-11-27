// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        PermissionFlagsBits,
} from 'discord.js';
import { db } from '#dbManager';

class BlacklistedChannelsCommand extends Command {
        constructor() {
                super({
                        name: 'blacklistedchannels',
                        description: 'Lists all channels blacklisted from message counting',
                        aliases: ['blchannels'],
                        cooldown: 5,
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'blacklistedchannels',
                                description: 'Lists all channels blacklisted from message counting',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                        },
                });
        }

        async execute({ ctx }) {
                const list = await db.guild?.getMessageBlacklistedChannels(ctx.guild.id) ?? [];

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Blacklisted channels**`),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                list.length > 0
                                        ? list.map((id) => `<#${id}>`).join(' ')
                                        : 'No channels are blacklisted',
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new BlacklistedChannelsCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */