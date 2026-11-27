// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        PermissionFlagsBits,
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
} from 'discord.js';
import { db } from '#dbManager';
import { config } from '#config';

class DeletePrefixCommand extends Command {
        constructor() {
                super({
                        name: 'deleteprefix',
                        description: "Resets a guild's prefix to bot's default prefix",
                        usage: 'deleteprefix',
                        aliases: ['resetprefix'],
                        cooldown: 10,
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'deleteprefix',
                                description: "Resets a guild's prefix to bot's default prefix",
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                        },
                });
        }

        async execute({ ctx }) {
                if (!ctx.guild) {
                        return ctx.reply('This command is only available in servers.');
                }

                await db.guild.setPrefixes(ctx.guild.id, [config.prefix]);

                const now = new Date().toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                });

                const mention = new TextDisplayBuilder().setContent(`<@${ctx.author.id}>`);

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**${ctx.client.user.username}'s Prefix Manager**`,
                        ),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `I Have Successfully Reset The Guild's Prefix!
Prefix Is Now \`${config.prefix}\``,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `-# Requested By ${ctx.author.username} | Today at ${now}`,
                        ),
                );

                await ctx.reply({
                        components: [mention, container],
                        flags: MessageFlags.IsComponentsV2,
                        allowedMentions: { users: [ctx.author.id] },
                });
        }
}

export default new DeletePrefixCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */