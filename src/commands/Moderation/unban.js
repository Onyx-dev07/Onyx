// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        PermissionFlagsBits,
        ApplicationCommandOptionType,
} from 'discord.js';
import { cross } from '../../utils/moderation.js';

class UnbanCommand extends Command {
        constructor() {
                super({
                        name: 'unban',
                        description: 'Unbans a banned user from a Discord server',
                        usage: 'unban <userID>',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['unban 123456789012345678'],
                        userPermissions: [PermissionFlagsBits.BanMembers],
                        permissions: [PermissionFlagsBits.BanMembers],
                        enabledSlash: true,
                        slashData: {
                                name: 'unban',
                                description: 'Unbans a banned user from a Discord server',
                                defaultMemberPermissions: PermissionFlagsBits.BanMembers,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'userid',
                                                description: 'The user ID to unban',
                                                required: true,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                if (!ctx.guild) {
                        return ctx.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
                }

                const userId = ctx.isSlash
                        ? ctx.options.getString('userid')
                        : ctx.args[0]?.replace(/[<@!>]/g, '');

                if (!userId || !/^\d{17,20}$/.test(userId)) {
                        return ctx.reply({ content: `${cross()} Please provide a valid user ID.`, flags: MessageFlags.Ephemeral });
                }

                const ban = await ctx.guild.bans.fetch(userId).catch(() => null);

                if (!ban) {
                        return ctx.reply({ content: `${cross()} That user is not banned.`, flags: MessageFlags.Ephemeral });
                }

                await ctx.guild.members.unban(userId).catch(() => null);

                await ctx.reply({ content: `**${ban.user.displayName ?? ban.user.username}** has been unbanned` });
        }
}

export default new UnbanCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */