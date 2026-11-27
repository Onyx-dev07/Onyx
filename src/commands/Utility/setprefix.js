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

class SetPrefixCommand extends Command {
        constructor() {
                super({
                        name: 'setprefix',
                        description: "Changes a guild's prefix",
                        usage: 'setprefix <prefix>',
                        cooldown: 10,
                        minArgs: 1,
                        examples: ['setprefix !'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'setprefix',
                                description: "Changes a guild's prefix",
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                name: 'prefix',
                                                description: 'The new prefix to set',
                                                type: 3,
                                                required: true,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                if (!ctx.guild) {
                        return ctx.reply('This command is only available in servers.');
                }

                const newPrefix = ctx.args?.[0] ?? ctx.options?.getString('prefix');

                if (!newPrefix || typeof newPrefix !== 'string' || !newPrefix.trim()) {
                        return ctx.reply('Please provide a valid prefix.');
                }

                if (newPrefix.length > 10) {
                        return ctx.reply('Prefix cannot be longer than 10 characters.');
                }

                await db.guild.setPrefixes(ctx.guild.id, [newPrefix]);

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
                                `I Have Successfully Updated The Guild's Prefix!
Prefix Is Now \`${newPrefix}\``,
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

export default new SetPrefixCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */